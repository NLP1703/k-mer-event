import express from 'express';
import fs from 'fs';
import path from 'path';
import { authenticate, authorize } from '../middlewares/auth.js';
import { uploadImages } from '../middlewares/upload.js';

const router = express.Router();

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

// Build an absolute URL so the frontend (different origin/port in dev) can
// display images served from this backend at /uploads/<file>.
const fileUrl = (req, filename) => `${req.protocol}://${req.get('host')}/uploads/${filename}`;

// POST /api/uploads — accepts one or many image files under the field "files".
// Returns { urls: [...], url: <first> }.
router.post(
  '/',
  authenticate,
  authorize('admin', 'organizer'),
  (req, res) => {
    uploadImages.array('files', 10)(req, res, (err) => {
      if (err) {
        const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
        return res.status(status).json({ message: err.message || 'Échec de l’upload' });
      }
      const files = req.files || [];
      if (!files.length) {
        return res.status(400).json({ message: 'Aucun fichier reçu' });
      }
      const urls = files.map((f) => fileUrl(req, f.filename));
      return res.status(201).json({ urls, url: urls[0] });
    });
  },
);

// DELETE /api/uploads — remove a previously uploaded file from disk.
// Body: { url } (absolute URL or "/uploads/<file>"). Only files inside the
// uploads directory can be deleted (path traversal is stripped via basename).
router.delete('/', authenticate, authorize('admin', 'organizer'), async (req, res) => {
  const raw = req.body?.url ? String(req.body.url) : '';
  const afterMarker = raw.includes('/uploads/') ? raw.split('/uploads/')[1] : raw;
  let filename = '';
  try {
    filename = path.basename(decodeURIComponent(afterMarker || ''));
  } catch {
    filename = path.basename(afterMarker || '');
  }
  if (!filename || filename === '.' || filename === '..') {
    return res.status(400).json({ message: 'Nom de fichier invalide' });
  }

  const filePath = path.join(UPLOAD_DIR, filename);
  if (!filePath.startsWith(UPLOAD_DIR + path.sep)) {
    return res.status(400).json({ message: 'Chemin non autorisé' });
  }

  try {
    await fs.promises.unlink(filePath);
    return res.json({ ok: true });
  } catch (err) {
    if (err.code === 'ENOENT') return res.json({ ok: true, message: 'Fichier déjà supprimé' });
    return res.status(500).json({ message: 'Suppression impossible' });
  }
});

export default router;
