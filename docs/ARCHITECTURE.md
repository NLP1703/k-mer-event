# Architecture — K-MER Event

## Vue d'ensemble

```
┌────────────────────┐        HTTPS         ┌─────────────────────────────┐
│  Frontend (React)  │  ───── REST/WS ────► │  Nginx (reverse proxy)      │
│  Vite SPA          │                       │   /        → SPA statique    │
│  - access token    │  ◄── cookie HttpOnly ─│   /api     → API :4000       │
│    (mémoire)       │                       │   /socket.io → API :4000     │
└────────────────────┘                       │   /uploads → API :4000       │
                                             └──────────────┬──────────────┘
                                                            │
                                              ┌─────────────▼─────────────┐
                                              │  API Node/Express          │
                                              │  ├─ routes/  (REST)         │
                                              │  ├─ middlewares/ (authz)    │
                                              │  ├─ controllers/ (HTTP)     │
                                              │  ├─ services/ (métier)      │
                                              │  ├─ models/ (Sequelize)     │
                                              │  └─ config/ (env, db, ws)   │
                                              └─────────────┬──────────────┘
                                                            │
                                                   ┌────────▼────────┐
                                                   │  MySQL 8         │
                                                   └─────────────────┘
```

## Découpage en couches (backend)

L'API suit une séparation claire des responsabilités (proche de SOLID) :

- **routes/** — déclaration des endpoints, validation d'entrée (`express-validator`), composition des middlewares.
- **middlewares/** — transverse : `authenticate` / `optionalAuthenticate`, `authorize(roles)`, `authorizeEventOwner`, gestion d'erreurs, suivi d'activité.
- **controllers/** — orchestration HTTP (req/res), pas de logique métier dupliquée.
- **services/** — logique métier réutilisable et testable indépendamment d'Express :
  - `tokenService` — émission/vérification access token, rotation/révocation des refresh tokens.
  - `loginGuard` — verrouillage progressif anti brute-force + journalisation.
  - `authCookies` — attributs cohérents du cookie de refresh (set/clear/read).
  - `bookingService` — numérotation, QR, **déduction/restitution de stock atomiques** (source unique).
  - `paymentProvider` — abstraction passerelle (`charge`/`refund`), prête pour Stripe/PayPal/Orange Money.
- **models/** — entités Sequelize + associations + contraintes.
- **config/** — `env` (configuration validée, fail-fast), `db` (Sequelize, MySQL ou SQLite en test), `realtime` (Socket.IO).

## Authentification

```
login/register ──► access token (JWT 15 min, en mémoire côté client)
               └─► refresh token (opaque, haché en base) ──► cookie HttpOnly/Secure/SameSite

requête API ──► Authorization: Bearer <access>
401 ──► POST /auth/refresh (cookie) ──► rotation (révoque l'ancien, émet le nouveau) ──► retry
logout ──► révocation serveur + cookie effacé
```

- Le refresh token n'est **jamais** stocké en clair : seule son empreinte SHA-256 est persistée (`refresh_tokens`).
- La **rotation** lie chaque token à son successeur (`replaced_by`) ; présenter un token déjà tourné déclenche la **révocation de toute la famille** (vol présumé).

## Modèle de données (extrait)

| Table | Points clés |
|---|---|
| `users` | rôle ENUM(user/admin/organizer), `is_deleted` (soft-delete) |
| `events` | `organizer_id` **FK → users.id** (ON DELETE SET NULL), `ticket_price` DECIMAL(10,2), index status/city/category/date + FULLTEXT |
| `bookings` | `total_price` DECIMAL(10,2), `status` ENUM, `checked_in_at` |
| `payments` | `amount` DECIMAL(10,2), `status` ENUM(pending/confirmed/cancelled/refunded), `provider`, `provider_ref`, `meta` |
| `favorites` | (user_id, event_id) unique — sync multi-appareils |
| `refresh_tokens` | empreinte hachée, `expires_at`, `revoked_at`, `replaced_by` |
| `login_attempts` | audit IP/email/succès pour le verrouillage progressif |

## Cohérence & concurrence

- **Stock** : déduit lors du checkout / de la confirmation de paiement via un `UPDATE … WHERE remaining_tickets >= n` conditionnel (atomique). Restitué symétriquement au remboursement/annulation.
- **Check-in** : `SELECT … FOR UPDATE` dans une transaction → deux scans simultanés ne peuvent pas tous deux réussir.

## Temps réel

Diffusion d'événements **publics** à tous ; les **drafts/pending** ne partent qu'aux admins (`admins`) et à l'organisateur propriétaire (`org:<id>`).

## Tests

SQLite en mémoire (`NODE_ENV=test`) → la suite tourne sans MySQL, en CI incluse. Unitaires (services) + intégration/API (Supertest sur l'app Express réelle).
