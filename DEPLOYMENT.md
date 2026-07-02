# Déploiement

> **Deux méthodes existent :**
> 1. **Docker + CI/CD automatique (recommandé)** — voir la section [« Déploiement Docker + CI/CD »](#déploiement-docker--cicd-automatique) plus bas. Chaque `git push` sur `main` reconstruit et redéploie tout seul.
> 2. **Manuel PM2 + Nginx** — la procédure historique, décrite juste en dessous. Toujours valable si tu ne veux pas de Docker.

---

## Architecture cible (Hostinger VPS)

Un seul domaine, tout passe par **Nginx** (reverse proxy) — pas de souci CORS :

```
  Internet ──HTTPS──> Nginx (80/443)
                         ├── /            → fichiers statiques du frontend (frontend/dist)
                         ├── /api         → http://127.0.0.1:4000  (backend Node/Express)
                         ├── /socket.io   → http://127.0.0.1:4000  (WebSocket Socket.IO)
                         └── /uploads     → http://127.0.0.1:4000  (images uploadées)
```

Le backend Node tourne en permanence via **PM2** sur `127.0.0.1:4000` (jamais exposé directement).
MySQL est installé localement sur le VPS. SSL gratuit via **Let's Encrypt (Certbot)**.

---

## 0. Prérequis

- Un **VPS Hostinger** (Ubuntu 22.04 conseillé) avec accès **SSH root**.
- Un **nom de domaine** dont le DNS pointe vers l'IP du VPS :
  - Dans hPanel → *Domaines / DNS*, crée un enregistrement **A** `@` → IP du VPS, et **A** `www` → IP du VPS.

Connexion : `ssh root@IP_DU_VPS`

---

## 1. Installer la pile logicielle

```bash
apt update && apt upgrade -y

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Nginx, Git, MySQL, outils
apt install -y nginx git mysql-server

# PM2 (gestionnaire de process Node) + Certbot (SSL)
npm install -g pm2
apt install -y certbot python3-certbot-nginx

# Pare-feu
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
```

---

## 2. Créer la base de données

```bash
mysql_secure_installation     # définir un mot de passe root, répondre Y aux questions

mysql -u root -p
```
Dans le prompt MySQL :
```sql
CREATE DATABASE kmer_event CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'kmer'@'localhost' IDENTIFIED BY 'UN_MOT_DE_PASSE_FORT';
GRANT ALL PRIVILEGES ON kmer_event.* TO 'kmer'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## 3. Récupérer le code

```bash
mkdir -p /var/www && cd /var/www
git clone https://github.com/NLP1703/k-mer-event.git kmer-event
cd kmer-event
```

---

## 4. Configurer et lancer le backend

```bash
cd /var/www/kmer-event/backend
npm install --omit=dev
mkdir -p uploads          # dossier des images uploadées (doit être accessible en écriture)
nano .env
```

Contenu de `backend/.env` (adapter les valeurs) :
```env
NODE_ENV=production
PORT=4000

DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=kmer_event
DB_USER=kmer
DB_PASSWORD=UN_MOT_DE_PASSE_FORT

JWT_SECRET=UNE_LONGUE_CHAINE_ALEATOIRE_SECRETE

# Domaine public du frontend (sert au CORS et aux liens e-mail)
FRONTEND_URL=https://TON_DOMAINE.com

# SMTP pour les e-mails (confirmation de billet, liste d'attente)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_USER=contact@TON_DOMAINE.com
SMTP_PASS=MOT_DE_PASSE_EMAIL
```

> 🔐 **JWT_SECRET obligatoire.** Le serveur **refuse de démarrer** sans secret fort
> (aucun fallback codé en dur). Génère-le :
> ```bash
> npm run generate:secret -- --write   # écrit JWT_SECRET + JWT_REFRESH_SECRET dans .env
> ```

Initialiser le schéma + appliquer toutes les migrations :
```bash
npm run migrate              # crée les tables + seed admin/démo (inclut refresh_tokens,
                             # login_attempts, favorites, events.organizer_id)
npm run migrate:checkin
npm run migrate:photo-urls
npm run migrate:waitlist
npm run migrate:geo
npm run migrate:auth          # tables refresh_tokens + login_attempts
npm run migrate:favorites     # table favorites
npm run migrate:organizer-id  # FK events.organizer_id + backfill
npm run migrate:money-decimal # montants -> DECIMAL(10,2)
npm run migrate:search-index  # index de recherche
```

Démarrer le backend avec PM2 (depuis le dossier `backend/` pour que `uploads/` soit résolu correctement) :
```bash
pm2 start server.js --name kmer-api
pm2 save
pm2 startup systemd        # exécuter la commande affichée pour démarrer au boot
```
Vérifier : `pm2 logs kmer-api` doit afficher « Backend running … (HTTP + WebSocket) ».

---

## 5. Construire le frontend

Le frontend a besoin de l'URL de l'API **au moment du build** :
```bash
cd /var/www/kmer-event/frontend
npm install
echo "VITE_API_URL=https://TON_DOMAINE.com/api" > .env.production
npm run build      # génère frontend/dist/
```

---

## 6. Configurer Nginx

```bash
nano /etc/nginx/sites-available/kmer
```
Coller (remplacer `TON_DOMAINE.com`) :
```nginx
server {
    listen 80;
    server_name TON_DOMAINE.com www.TON_DOMAINE.com;

    # Frontend statique
    root /var/www/kmer-event/frontend/dist;
    index index.html;

    # SPA : toutes les routes inconnues -> index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API REST
    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $http_host;   # garder le port (ex. :8080) — sinon les URLs d'images générées le perdent
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket (Socket.IO) — en-têtes d'upgrade indispensables
    location /socket.io/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Images uploadées
    location /uploads/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $http_host;
    }

    client_max_body_size 120M;  # images 25 Mo + vidéos 100 Mo (upload depuis la galerie)
}
```
Activer le site et recharger :
```bash
ln -s /etc/nginx/sites-available/kmer /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

---

## 7. Activer le HTTPS (SSL gratuit)

```bash
certbot --nginx -d TON_DOMAINE.com -d www.TON_DOMAINE.com
```
Certbot configure le HTTPS et le renouvellement automatique. Le site est en ligne sur `https://TON_DOMAINE.com`.

---

## Mises à jour ultérieures

```bash
cd /var/www/kmer-event
git pull

# backend — IMPORTANT : appliquer les migrations AVANT de redémarrer
cd backend && npm install --omit=dev
npm run migrate:auth
npm run migrate:favorites
npm run migrate:organizer-id
npm run migrate:money-decimal
npm run migrate:search-index
pm2 restart kmer-api

# frontend
cd ../frontend && npm install && npm run build
# (pas besoin de recharger Nginx : les fichiers dist sont servis directement)
```

---

## Notes & sécurité

- **Identifiants admin par défaut** : créés par `seed-admin.js`. Connecte-toi puis **change le mot de passe** immédiatement.
- **JWT_SECRET** : doit être long et aléatoire (ex. `openssl rand -hex 32`). Ne jamais committer le `.env`.
- Le port **4000 reste interne** (non ouvert dans le pare-feu) : tout passe par Nginx.
- **Sauvegardes** : pense à sauvegarder la base (`mysqldump`) et le dossier `backend/uploads/` régulièrement.
- **E-mails** : crée une boîte e-mail dans hPanel (ex. `contact@ton_domaine.com`) et utilise `smtp.hostinger.com` (port 587, STARTTLS).

---

## Déploiement Docker + CI/CD (automatique)

Méthode recommandée. Un `git push` sur `main` déclenche GitHub Actions qui, **après** avoir passé les tests, se connecte en SSH au VPS, met le code à jour et reconstruit la stack Docker. Plus aucune commande manuelle au quotidien.

## Architecture

```
  Internet ──HTTPS──> Nginx du VPS (443)         ← termine le TLS (Certbot)
                         └── reverse proxy ──> 127.0.0.1:8081
                                                   │
                                        conteneur "web" (Nginx interne)
                                                   ├── /            → SPA (build Vite)
                                                   ├── /api         → conteneur "api" (:4000)
                                                   ├── /socket.io   → conteneur "api" (WebSocket)
                                                   └── /uploads      → conteneur "api"
                                                          │
                                              conteneur "api" (Node/Express)
                                                          │
                                              conteneur "db" (MySQL 8, volume persistant)
```

Le conteneur `web` n'écoute **que sur 127.0.0.1:8081** : il n'est pas exposé au public, c'est le Nginx du VPS qui gère le domaine et le HTTPS. MySQL n'est **jamais** exposé.

## Fichiers concernés (dans le repo)

| Fichier | Rôle |
|---------|------|
| `docker-compose.yml` | Stack de base (db + api + web) |
| `docker-compose.prod.yml` | Surcharge prod : secrets via `.env`, cookies sécurisés, MySQL fermé, `web` sur 127.0.0.1 |
| `backend/Dockerfile`, `frontend/Dockerfile` | Images de build |
| `deploy/nginx-kmer.conf` | Config Nginx frontale du VPS (à installer sur le VPS) |
| `.github/workflows/ci.yml` | Job `deploy` : lance le déploiement sur push `main` |

## 1. Préparer le VPS (une seule fois)

```bash
ssh tontineadmin@2.25.178.95

# Docker + plugin compose
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER      # se reconnecter ensuite

# Cloner le repo à l'emplacement qui servira de VPS_APP_DIR
mkdir -p ~/K-MER-EVENT && cd ~/K-MER-EVENT
git clone https://github.com/NLP1703/k-mer-event.git .
```

### Migration depuis l'ancienne stack PM2/Nginx

Si l'ancienne version tourne déjà (PM2 + Nginx statique), libérer les ressources **avant** le premier déploiement Docker :

```bash
pm2 delete kmer-api && pm2 save     # arrêter l'ancienne API Node
# Le conteneur web est sur 127.0.0.1:8081, donc AUCUN conflit de port avec Nginx.
# On garde le Nginx du VPS : on remplace juste son site par le reverse proxy.
```

> ⚠️ **Données MySQL** : la stack Docker crée sa **propre** base dans un volume Docker (`db_data`). Si tu as déjà des données dans le MySQL installé sur le VPS, exporte-les puis réimporte-les dans le conteneur :
> ```bash
> mysqldump -u kmer -p kmer_event > dump.sql           # ancienne base
> docker compose exec -T db mysql -u kmer -pMDP kmer_event < dump.sql   # après le 1er up
> ```

### Installer la config Nginx frontale

```bash
cd ~/K-MER-EVENT
sudo cp deploy/nginx-kmer.conf /etc/nginx/sites-available/kmer
# éditer le fichier pour remplacer your-domain.com par le vrai domaine
sudo ln -sf /etc/nginx/sites-available/kmer /etc/nginx/sites-enabled/kmer
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d TON_DOMAINE.com     # HTTPS gratuit + renouvellement auto
```

## 2. Configurer les secrets GitHub (une seule fois)

`Settings → Secrets and variables → Actions → New repository secret` :

| Secret | Valeur |
|--------|--------|
| `VPS_HOST` | `2.25.178.95` |
| `VPS_USER` | `tontineadmin` |
| `VPS_SSH_KEY` | contenu **complet** de la clé privée `tontine_vps` |
| `VPS_APP_DIR` | `/home/tontineadmin/K-MER-EVENT` (là où le repo est cloné) |
| `JWT_SECRET` | secret fort (`openssl rand -hex 32`) |
| `DB_PASSWORD` | mot de passe MySQL applicatif |
| `DB_ROOT_PASSWORD` | mot de passe root MySQL |
| `FRONTEND_URL` | URL publique réelle, ex. `https://TON_DOMAINE.com` |
| `COOKIE_SAMESITE` | *(optionnel)* `lax` par défaut |
| `WEB_PORT` | *(optionnel)* `8081` par défaut |

## 3. Déployer

Il suffit de pousser sur `main` :

```bash
git push origin main
```

GitHub Actions : `backend` (lint + tests) + `frontend` (build) → puis `deploy` qui, en SSH, fait `git reset --hard` sur le commit, régénère le `.env`, puis :

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build --remove-orphans
```

Suivre le déroulé dans l'onglet **Actions** de GitHub. Sur le VPS, vérifier :

```bash
docker compose ps          # les 3 services "healthy"
docker compose logs -f api
```

## Déclenchement manuel / rollback

- **Rejouer un déploiement** : relancer le workflow depuis l'onglet Actions, ou repousser un commit.
- **Rollback** : `git revert` du commit fautif puis `git push` (le déploiement rejoue automatiquement l'état précédent), ou sur le VPS `git reset --hard <ancien_sha> && docker compose ... up -d --build`.
