import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Ensure the uploads directory exists (served statically at /uploads in app.js).
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Phones (iPhone especially) save gallery photos as HEIC/HEIF, so accept them
// alongside the common web formats.
const ALLOWED = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
]);

// Some mobile browsers/galleries send a generic or empty mimetype for HEIC and
// other photos. Fall back to the file extension so a real image isn't rejected.
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.heic', '.heif']);
const GENERIC_MIMES = new Set(['application/octet-stream', 'binary/octet-stream', '']);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const safeExt = /^\.[a-z0-9]{2,5}$/.test(ext) ? ext : '.jpg';
    const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${safeExt}`;
    cb(null, name);
  },
});

const fileFilter = (req, file, cb) => {
  const mime = (file.mimetype || '').toLowerCase();
  if (ALLOWED.has(mime)) return cb(null, true);

  // Generic/unknown mimetype: trust a recognised image extension instead.
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (GENERIC_MIMES.has(mime) && ALLOWED_EXT.has(ext)) return cb(null, true);

  cb(new Error('Type de fichier non supporté. Images uniquement (jpeg, png, webp, gif, avif, heic).'));
};

export const uploadImages = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB per file (phone photos can be large)
    files: 10,
  },
});

// ---- Video uploads (gallery file picker, not URL) ----
const ALLOWED_VIDEO = new Set([
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime', // .mov (iPhone)
  'video/x-matroska', // .mkv
  'video/3gpp', // .3gp (older Android)
  'video/x-msvideo', // .avi
]);
const ALLOWED_VIDEO_EXT = new Set(['.mp4', '.webm', '.ogv', '.ogg', '.mov', '.mkv', '.3gp', '.avi', '.m4v']);

const videoFileFilter = (req, file, cb) => {
  const mime = (file.mimetype || '').toLowerCase();
  if (ALLOWED_VIDEO.has(mime)) return cb(null, true);

  // Phones often send a generic/empty mimetype: trust the extension instead.
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (GENERIC_MIMES.has(mime) && ALLOWED_VIDEO_EXT.has(ext)) return cb(null, true);

  cb(new Error('Type de fichier non supporté. Vidéos uniquement (mp4, webm, mov, ogg, 3gp, avi).'));
};

export const uploadVideos = multer({
  storage,
  fileFilter: videoFileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB per video
    files: 1,
  },
});
