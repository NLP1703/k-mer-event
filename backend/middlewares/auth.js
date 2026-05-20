import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

export const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const token = header.split(' ')[1];
    // Use only one source of truth for the secret to prevent token verification mismatch.
    const secret = process.env.JWT_SECRET || 'kmersecret';
    const payload = jwt.verify(token, secret);

    const user = await User.findByPk(payload.id);
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
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


export const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
};
