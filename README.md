# K-MER EVENT — Plateforme de réservation d'événements

Plateforme événementielle premium pour le Cameroun : découverte d'événements, billetterie QR, gestion organisateur et administration — avec une architecture full-stack moderne, une API REST sécurisée et une UI à thème clair/sombre.

## Architecture

- `backend/` — API REST Node.js + Express + Sequelize (MySQL)
- `frontend/` — SPA React + Vite + Tailwind CSS
- `DATABASE-SCHEMA.md` — schéma relationnel
- `API-CONTRACTS.md` — contrats des endpoints REST
- `DEPLOYMENT.md` — guide de déploiement

**Rôles** : `user` (client), `organizer` (organisateur), `admin`.

## Démarrage rapide

### Backend
```bash
cd backend
npm install
cp .env.example .env        # configurer DB, FRONTEND_URL
npm run generate:secret -- --write   # génère et écrit JWT_SECRET / JWT_REFRESH_SECRET dans .env
npm run migrate             # initialise la base (tables + seed admin/démo)
npm run migrate:checkin     # colonne de check-in des billets
npm run migrate:waitlist    # table de la liste d'attente
npm run migrate:geo         # colonnes latitude/longitude (carte interactive)
npm run migrate:auth        # tables refresh_tokens + login_attempts
npm run migrate:favorites   # table favorites (sync multi-appareils)
npm run migrate:organizer-id  # events.organizer_id (FK) + backfill
npm run migrate:money-decimal # montants -> DECIMAL(10,2)
npm run migrate:search-index  # index de recherche
npm run dev
```

> ⚠️ **JWT_SECRET est obligatoire** : sans secret fort, le serveur **refuse de démarrer** (aucune valeur par défaut codée en dur). Génère-le avec `npm run generate:secret`.

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Docker (stack complète en une commande)
```bash
docker compose up --build      # MySQL + API + frontend (Nginx)
# puis ouvrir http://localhost:8080  (même origine, /api et /socket.io proxifiés)
```

> Note CORS : `FRONTEND_URL` accepte une liste séparée par des virgules ; toute origine `localhost`/`127.0.0.1` est autorisée en développement (le serveur Vite peut changer de port). Les requêtes envoient le cookie de refresh (`credentials: true`).

---

## Fonctionnalités

### Authentification & comptes
- **Access token court (15 min) en mémoire + refresh token rotatif** stocké dans un **cookie HttpOnly / Secure / SameSite** — plus de JWT 30 jours dans le `localStorage`.
- **Rotation + révocation** des refresh tokens (détection de réutilisation = révocation de toute la famille), **déconnexion réelle** côté serveur.
- **Protection brute-force** : blocage progressif par IP **et** par compte + journalisation des tentatives.
- **Comptes désactivés** (`is_deleted`) : connexion refusée **avant** toute émission de token.
- Sécurité **basée sur les rôles** (user / organizer / admin).
- Inscription en tant que client **ou** organisateur (avec nom d'organisation).
- Profil utilisateur : informations, **photo de profil**, changement de mot de passe.

### Découverte d'événements (page Discover)
- Liste des événements publiés avec **bannière, catégorie, lieu, date, prix, places restantes**.
- **Recherche** par mot-clé et **filtres avancés** : ville, catégorie, prix maximum, « à venir », « favoris ».
- Sections **Catégories** et **fonctionnalités** en **carrousel à défilement horizontal**.
- **Favoris** (cœur) persistés localement et synchronisés entre onglets.
- **Partage WhatsApp** d'un événement (lien direct).
- Page **détail événement** : galerie photo, lecteur vidéo, sélection de quantité, ajout au panier, favori et partage.

### Localisation & vue satellite

- **Géocodage automatique** : dans le formulaire d'événement, dès que le **lieu/la ville** sont saisis, les coordonnées sont récupérées automatiquement (OpenStreetMap / Nominatim). Boutons d'appoint : **« Localiser depuis le lieu »** et **« Ma position »** (géolocalisation navigateur) ; coordonnées toujours ajustables manuellement.
- **Carte satellite dans le détail de l'événement** (Leaflet + imagerie **Esri World Imagery**, sans clé API) avec marqueur sur le lieu exact.
- Bouton **« Itinéraire GPS »** (Google Maps) depuis la page détail.

### Réservation & billetterie
- **Panier** multi-événements et **checkout** (coordonnées du participant).
- Décompte de stock atomique (transaction) à la validation.
- Génération de **billets PDF avec QR code** téléchargeables.
- Page **« Mes billets »** : onglets **Actifs / Expirés**, statut, téléchargement.
- Expiration du billet calculée à la lecture depuis la date de l'événement.

### Liste d'attente automatique

- Sur un événement **complet**, l'utilisateur peut **rejoindre la liste d'attente** depuis la page détail.
- **Notification e-mail automatique** envoyée aux inscrits (du plus ancien au plus récent) **dès que la capacité augmente** et que des places se libèrent.
- Anti-doublon : une seule inscription active par utilisateur et par événement.
- Section **« Mes listes d'attente »** dans la page *Mes billets* : statut (en attente / place disponible), accès direct à la réservation, retrait possible.

### Médias
- **Upload d'images depuis l'appareil** (gestionnaire de fichiers natif), **sélection multiple** pour la galerie — plus de saisie d'URL.
- Bannière + galerie photo + URL vidéo optionnelle par événement.
- Optimisation/repli automatique des images (placeholder intégré).

### Espace organisateur
- **Création / modification / suppression** de ses propres événements (soumis en `pending` pour validation admin).
- L'organisateur peut **modifier ses événements à tout statut** (la propriété est vérifiée côté serveur).
- **Statistiques** : événements créés, billets vendus, revenus, taux de remplissage par événement.

### Espace administrateur
- **Tableau de bord** analytique : utilisateurs, événements, réservations, revenus, graphiques (revenus & réservations sur 30 jours), top événements, réservations récentes.
- **Gestion des événements** : créer, éditer, **valider/refuser** (workflow pending → published), supprimer.
- **Gestion des utilisateurs** : CRUD complet + consultation des réservations d'un utilisateur.

### Contrôle d'accès — Scan & check-in QR
- Page **`/checkin`** (admin & organisateur) : validation des billets à l'entrée par **scan caméra** (`html5-qrcode`) ou **saisie manuelle** du numéro.
- Détection : billet **validé** / **déjà validé** / **annulé** / **introuvable** ; un organisateur ne valide que les billets de **ses** événements.
- Historique de validation de la session.

### Temps réel (WebSocket)
- **Socket.IO** : les changements d'événements **publics** sont diffusés en direct (`events:changed`).
- **Autorisation** : les événements **draft/pending ne sont jamais diffusés publiquement** — réservés aux **admins** (canal dédié) et à l'**organisateur propriétaire** (room `org:<id>`). Une suppression n'émet qu'un id minimal.
- La page d'accueil et le détail d'un événement se mettent à jour **instantanément**, sans rechargement — un repli (rafraîchissement au focus + sondage 30 s) prend le relais si le WebSocket est indisponible.

### Expérience & design
- **Thème clair / sombre** entièrement basé sur des tokens (lisible dans les deux modes), bascule instantanée.
- Touche de couleur **africaine (terracotta / ocre)** appliquée avec sobriété.
- Interface responsive (mobile → desktop), micro-interactions et états de chargement soignés.

---

## API (aperçu)

| Domaine | Endpoints clés |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/me` |
| Événements | `GET /api/events` (pagination `?page&limit&search&city&category&sort&order`), `GET /api/events/:id`, `POST/PUT/DELETE /api/events`, `POST /api/events/:id/approve`, `POST /api/events/:id/cancel` |
| Panier | `GET/POST /api/cart`, `DELETE /api/cart/:eventId`, `DELETE /api/cart` |
| Réservations | `POST /api/bookings`, `POST /api/bookings/checkout`, `GET /api/bookings`, `GET /api/bookings/:id/ticket`, `POST /api/bookings/checkin` |
| Paiements | `POST /api/payments`, `POST /api/payments/:bookingId/refund`, `GET /api/payments/:bookingId` |
| Favoris | `GET /api/favorites`, `POST /api/favorites`, `POST /api/favorites/sync`, `DELETE /api/favorites/:eventId` |
| Uploads | `POST /api/uploads` (images, multipart), `DELETE /api/uploads` |
| Liste d'attente | `POST /api/waitlist`, `GET /api/waitlist/me`, `DELETE /api/waitlist/:id` |
| Dashboard | `GET /api/dashboard` |
| Organisateur | `GET /api/organizer/statistics`, `GET /api/organizer/statistics/events` |
| Admin | `GET/POST/PUT/DELETE /api/admin/users`, `GET /api/admin/users/:id/bookings` |
| Profil | `GET /api/users/me`, `PUT /api/users/change-password`, `PUT /api/users/profile-picture` |

Réponse paginée de `GET /api/events` :
```json
{ "events": [ /* ... */ ],
  "pagination": { "page": 1, "limit": 12, "total": 57, "totalPages": 5, "next": 2, "previous": null } }
```

Détails complets dans [`docs/API.md`](docs/API.md) et `API-CONTRACTS.md`. Architecture détaillée : [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Sécurité (OWASP)

| Mesure | Détail |
|---|---|
| Secret JWT obligatoire | Validation au démarrage (`config/env.js`), aucun fallback, `npm run generate:secret` |
| Access/refresh tokens | Access 15 min en mémoire ; refresh rotatif révocable en cookie **HttpOnly+Secure+SameSite** ; détection de réutilisation |
| Brute-force | Limiteur par IP + verrouillage progressif par compte/IP + journal `login_attempts` |
| Comptes désactivés | Connexion bloquée avant émission de token (login **et** middleware) |
| Autorisation WebSocket | Drafts/pending non diffusés publiquement (admins + organisateur propriétaire) |
| Intégrité référentielle | `events.organizer_id` FK → `users(id)` (ON DELETE SET NULL) |
| Cohérence stock | Déduction/restitution atomiques, check-in transactionnel verrouillé (anti double-scan) |
| Montants | `DECIMAL(10,2)` (plus de FLOAT) |
| En-têtes | Helmet (CSP), CORS strict avec allowlist, `Cache-Control: no-store` sur l'API |

## Tests & CI

```bash
cd backend && npm test        # Jest + Supertest (SQLite en mémoire) — unit + intégration + API
cd backend && npm run lint    # ESLint
```

- **CI GitHub Actions** ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) : lint + tests backend, build frontend, à chaque push/PR.
- Suites : rotation/réutilisation des refresh tokens, flux register/login/refresh/logout, blocage compte supprimé, brute-force, pagination/recherche, workflow booking→paiement→remboursement, check-in à usage unique, favoris CRUD/sync.

## Stack technique

**Frontend** : React 18, Vite, React Router, Tailwind CSS, Axios, Recharts, Framer Motion, lucide-react, html5-qrcode, Leaflet / react-leaflet, socket.io-client.
**Backend** : Node.js, Express, Sequelize (MySQL), Socket.IO, JWT, cookie-parser, bcryptjs, Multer, PDFKit, qrcode, helmet, express-rate-limit.
**Qualité / DevOps** : Jest + Supertest (SQLite en mémoire), ESLint, Docker + docker-compose, GitHub Actions CI.
