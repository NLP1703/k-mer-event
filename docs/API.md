# API REST — K-MER Event

Base URL : `/api`. Authentification par **access token** (`Authorization: Bearer <token>`).
Le **refresh token** circule via un cookie HttpOnly (`kmer_rt`) — envoyer les requêtes avec
les cookies (`credentials: 'include'` / `withCredentials: true`).

## Authentification

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Crée un compte, renvoie `{ user, accessToken }` + cookie refresh |
| POST | `/auth/login` | — | Connexion. 401 invalides, 403 compte désactivé, 429 trop de tentatives |
| POST | `/auth/refresh` | cookie | Rotation du refresh token, renvoie un nouvel `accessToken` |
| POST | `/auth/logout` | cookie | Révoque le refresh token et efface le cookie |
| GET | `/auth/me` | bearer | Utilisateur courant |

Exemple — login :
```json
// 200
{ "user": { "id": "…", "name": "…", "email": "…", "role": "user" },
  "accessToken": "eyJ…" }
// Set-Cookie: kmer_rt=…; HttpOnly; Secure; SameSite=None; Path=/api/auth
```

## Événements

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/events` | optionnelle | Liste paginée (publiés ; admin voit tout) |
| GET | `/events/:id` | — | Détail |
| POST | `/events` | admin/organizer | Création (organizer ⇒ `pending`) |
| PUT | `/events/:id` | propriétaire/admin | Mise à jour |
| DELETE | `/events/:id` | propriétaire/admin | Suppression |
| POST | `/events/:id/approve` | admin | `pending → published` |
| POST | `/events/:id/cancel` | admin | `pending → cancelled` |

**Query de `/events`** : `page` (≥1), `limit` (1–100, défaut 12), `search` (titre/description/lieu/ville),
`city`, `category`, `status` (admin), `organizer_id`, `sort` (`date|price|created|title`), `order` (`asc|desc`).

```json
{ "events": [ { "id": "…", "title": "…", "ticket_price": 5000.00, "status": "published" } ],
  "pagination": { "page": 1, "limit": 12, "total": 57, "totalPages": 5, "next": 2, "previous": null } }
```

## Réservations & billetterie

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/bookings` | bearer | Réservation directe (`pending`, sans déduction de stock) |
| POST | `/bookings/checkout` | bearer | Checkout panier (`confirmed`, stock déduit atomiquement) |
| GET | `/bookings` | bearer | Mes réservations (`?status=active|expired|cancelled`) |
| GET | `/bookings/:id/ticket` | bearer | Billet PDF (QR) |
| POST | `/bookings/checkin` | admin/organizer | Validation à l'entrée (transactionnelle, usage unique) |

## Paiements

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/payments` | bearer | Crée + encaisse un paiement ; `confirmed` (stock déduit) ou `cancelled`. Corps : `{ bookingId, provider?, amount?, simulate? }` |
| POST | `/payments/:bookingId/refund` | propriétaire/admin | Remboursement → `refunded`, stock restitué, booking annulé |
| GET | `/payments/:bookingId` | bearer | Paiement d'une réservation |

Statuts paiement : `pending → confirmed → refunded` (ou `cancelled`). L'abstraction `paymentProvider`
permet de brancher Stripe / PayPal / Orange Money sans toucher au workflow.

## Favoris (sync multi-appareils)

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/favorites` | bearer | `{ favorites, eventIds }` |
| POST | `/favorites` | bearer | Ajoute `{ eventId }` (idempotent) |
| POST | `/favorites/sync` | bearer | Fusionne `{ eventIds: [...] }` (migration localStorage) |
| DELETE | `/favorites/:eventId` | bearer | Retire un favori |

## Autres

| Domaine | Endpoints |
|---|---|
| Panier | `GET/POST /cart`, `DELETE /cart/:eventId`, `DELETE /cart` |
| Uploads | `POST /uploads` (multipart), `POST /uploads/video`, `DELETE /uploads` |
| Liste d'attente | `POST /waitlist`, `GET /waitlist/me`, `DELETE /waitlist/:id` |
| Dashboard | `GET /dashboard`, `GET /dashboard/presence`, `GET /dashboard/usage` |
| Organisateur | `GET /organizer/statistics`, `GET /organizer/statistics/events` |
| Admin | `GET/POST/PUT/DELETE /admin/users`, `GET /admin/users/:id/bookings` |
| Profil | `GET /users/me`, `PUT /users/change-password`, `PUT /users/profile-picture` |
| Santé | `GET /health` |

## Codes d'erreur usuels

| Code | Sens |
|---|---|
| 401 | Non authentifié / token invalide ou expiré |
| 403 | Interdit (rôle insuffisant, propriété, compte désactivé) |
| 409 | Conflit (stock insuffisant, billet déjà validé, état invalide) |
| 422 | Validation d'entrée échouée |
| 429 | Trop de tentatives (brute-force / rate limit) — voir `Retry-After` |
