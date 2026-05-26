# TODO - Fix video link not rendering

## Informations constatées
- Le frontend affiche la vidéo si `event.video_url` existe (dans `frontend/src/pages/EventDetails.jsx`).
- Le backend accepte `video_url` via `req.body` et le modèle Sequelize déclare `video_url` comme `VIRTUAL` (donc pas stocké en DB).
- Le résultat: lors de la création/mise à jour, le champ ne persiste pas => `video_url` revient vide/null => seule l’image (`banner_url`) s’affiche.

## Plan de correction (2 options)
- **Option A (recommandée)**: ajouter une colonne persistante dans la DB pour stocker l’URL de vidéo.
  1) Mettre à jour `backend/models/Event.js` pour ajouter `video_url` comme champ réel (pas VIRTUAL) + synchronisation/migration.
  2) Mettre à jour le schéma MySQL et synchroniser Sequelize.
  3) Vérifier `createEvent`/`updateEvent` en s’assurant que `video_url` est bien passé et persisté.
- **Option B (quick fix front)**: si la DB n’a pas de colonne, alors stocker la vidéo dans `social_links` (ou un champ existant) et extraire côté front.
  1) Passer `video_url` dans `social_links` (JSON TEXT) au lieu de `video_url`.
  2) Modifier `EventDetails.jsx` pour lire depuis `social_links.video_url`.

## Étapes
1. Valider Option A vs Option B selon la capacité à modifier la DB.
2. Mettre à jour le modèle/DB pour persister `video_url`.
3. Tester: créer un event avec video_url + bannière.
4. Tester: accéder à `EventDetails` et vérifier le tag `<video>`.

