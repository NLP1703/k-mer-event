# Déploiement

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

Initialiser le schéma + appliquer toutes les migrations :
```bash
npm run migrate              # crée les tables + seed admin/démo
npm run migrate:checkin
npm run migrate:photo-urls
npm run migrate:waitlist
npm run migrate:geo
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
        proxy_set_header Host $host;
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
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Images uploadées
    location /uploads/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
    }

    client_max_body_size 12M;   # tolérer l'upload d'images (8 Mo max applicatif)
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

# backend
cd backend && npm install --omit=dev && pm2 restart kmer-api

# si nouvelles migrations :
# npm run migrate:<nom>

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
