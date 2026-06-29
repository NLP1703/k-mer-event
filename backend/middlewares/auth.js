import { User } from '../models/User.js';
import { verifyAccessToken } from '../services/tokenService.js';

export const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const token = header.split(' ')[1];
    const payload = verifyAccessToken(token);

    const user = await User.findByPk(payload.id);
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    // Soft-deleted accounts can never act, even with a still-valid access token.
    if (user.is_deleted) {
      return res.status(403).json({ message: 'This account has been deactivated.' });
    }

    req.user = user;
    next();
  } catch (error) {
    // Provide stable diagnostics for the frontend.
    let reason = 'Unauthorized';
    if (error?.name === 'TokenExpiredError') reason = 'Token expired';
    else if (error?.name === 'JsonWebTokenError') reason = 'Invalid token';
    else if (error?.name === 'NotBeforeError') reason = 'Token not active yet';

    return res.status(401).json({ message: 'Unauthorized', reason, error: error?.message });
  }
};


// Like authenticate, but never rejects: it populates req.user when a valid
// access token is present and silently continues otherwise. Used on public
// endpoints that expose extra data to privileged callers (e.g. admin event
// stats) without leaking that data to anonymous/under-privileged clients.
export const optionalAuthenticate = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      const payload = verifyAccessToken(header.split(' ')[1]);
      const user = await User.findByPk(payload.id);
      if (user && !user.is_deleted) req.user = user;
    }
  } catch {
    // ignore invalid/expired token — treat as anonymous
  }
  next();
};

export const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
};

// Vérifie que l'utilisateur est admin OU est l'organizer propriétaire de l'event.
// Attache `req.event` pour éviter un second findByPk dans le controller.
export const authorizeEventOwner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { Event } = await import('../models/Event.js');
    const event = await Event.findByPk(id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    req.event = event;

    // Admin => tout
    if (req.user?.role === 'admin') return next();

    // Organizer ownership: prefer organizer_id when reliably populated, otherwise
    // fall back to organizer (string) matching req.user.name (current DB schema).
    if (event.organizer_id && req.user?.id && event.organizer_id === req.user.id) {
      return next();
    }

    const ownerIdentity = (req.user?.name ?? '').toString().trim();
    const organizerField = (event.organizer ?? '').toString().trim();

    if (!ownerIdentity || !organizerField || organizerField !== ownerIdentity) {
      return res.status(403).json({ message: 'Forbidden: not your event' });
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

// Refuse aux organizers la modification/suppression d'un event déjà publié ou annulé.
// (Empêche un organizer de supprimer un event publié avec des billets vendus.)
export const restrictOrganizerToPending = (req, res, next) => {
  if (req.user?.role !== 'organizer') return next();
  const event = req.event;
  if (!event) return res.status(404).json({ message: 'Event not found' });
  if (event.status !== 'pending' && event.status !== 'draft') {
    return res
      .status(403)
      .json({ message: 'Forbidden: organizers can only modify pending/draft events' });
  }
  return next();
};





