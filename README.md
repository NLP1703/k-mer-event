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
cp .env.example .env        # configurer DB, JWT_SECRET, FRONTEND_URL
npm run migrate             # initialise la base
npm run migrate:checkin     # colonne de check-in des billets (ou: node scripts/migrate-checkin.js up)
npm run migrate:waitlist    # table de la liste d'attente
npm run migrate:geo         # colonnes latitude/longitude (carte interactive)
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

> Note CORS : `FRONTEND_URL` accepte une liste séparée par des virgules ; toute origine `localhost`/`127.0.0.1` est autorisée en développement (le serveur Vite peut changer de port).

---

## Fonctionnalités

### Authentification & comptes
- Inscription / connexion par **JWT**, sécurité **basée sur les rôles** (user / organizer / admin).
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
- **Socket.IO** : toute création / modification / validation / annulation / suppression d'événement est **diffusée en direct** à tous les clients connectés (`events:changed`).
- La page d'accueil et le détail d'un événement se mettent à jour **instantanément**, sans rechargement — un repli (rafraîchissement au focus + sondage 30 s) prend le relais si le WebSocket est indisponible.

### Expérience & design
- **Thème clair / sombre** entièrement basé sur des tokens (lisible dans les deux modes), bascule instantanée.
- Touche de couleur **africaine (terracotta / ocre)** appliquée avec sobriété.
- Interface responsive (mobile → desktop), micro-interactions et états de chargement soignés.

---

## API (aperçu)

| Domaine | Endpoints clés |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Événements | `GET /api/events`, `GET /api/events/:id`, `POST/PUT/DELETE /api/events`, `POST /api/events/:id/approve`, `POST /api/events/:id/cancel` |
| Panier | `GET/POST /api/cart`, `DELETE /api/cart/:eventId`, `DELETE /api/cart` |
| Réservations | `POST /api/bookings`, `POST /api/bookings/checkout`, `GET /api/bookings`, `GET /api/bookings/:id/ticket`, `POST /api/bookings/checkin` |
| Uploads | `POST /api/uploads` (images, multipart), `DELETE /api/uploads` |
| Liste d'attente | `POST /api/waitlist`, `GET /api/waitlist/me`, `DELETE /api/waitlist/:id` |
| Dashboard | `GET /api/dashboard` |
| Organisateur | `GET /api/organizer/statistics`, `GET /api/organizer/statistics/events` |
| Admin | `GET/POST/PUT/DELETE /api/admin/users`, `GET /api/admin/users/:id/bookings` |
| Profil | `GET /api/users/me`, `PUT /api/users/change-password`, `PUT /api/users/profile-picture` |

Détails complets dans `API-CONTRACTS.md`.

## Stack technique

**Frontend** : React 18, Vite, React Router, Tailwind CSS, Zustand, Axios, Recharts, Framer Motion, lucide-react, html5-qrcode, Leaflet / react-leaflet, socket.io-client.
**Backend** : Node.js, Express, Sequelize (MySQL), Socket.IO, JWT, Multer, PDFKit, qrcode, helmet, express-rate-limit.
