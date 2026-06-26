import jwt from 'jsonwebtoken';
import { ActivityLog } from '../models/ActivityLog.js';

// How often (per user) we persist an activity row. Browsing fires many API
// calls; we only need coarse "the user was active" signal to compute weekly
// active users, so one row per user every few minutes is plenty and keeps the
// table tiny.
const THROTTLE_MS = 5 * 60 * 1000;

// In-memory throttle map: userId -> last persisted timestamp (ms).
// Resets on restart, which is fine — worst case we write one extra row.
const lastSeen = new Map();

// Best-effort, non-blocking activity recorder. Mounted globally on /api/ so it
// runs before the per-route `authenticate`. It never rejects a request: if the
// token is missing/invalid it simply records nothing (guest traffic).
export const trackActivity = (req, res, next) => {
  // Hand control back immediately; persistence happens in the background.
  next();

  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) return;

    const token = header.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'kmersecret';
    let payload;
    try {
      payload = jwt.verify(token, secret);
    } catch {
      return; // expired/invalid token — ignore silently
    }

    const userId = payload?.id;
    if (!userId) return;

    const now = Date.now();
    const last = lastSeen.get(userId) || 0;
    if (now - last < THROTTLE_MS) return;
    lastSeen.set(userId, now);

    // Fire-and-forget insert; an analytics write must never break the request.
    ActivityLog.create({ user_id: userId, role: payload?.role || null }).catch(() => {});
  } catch {
    // swallow — analytics is never allowed to surface an error
  }
};
