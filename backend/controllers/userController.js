import bcrypt from 'bcryptjs';
import { validationResult } from 'express-validator';
import { User } from '../models/User.js';

// Accept http(s):// or relative `/uploads/...` paths. Reject javascript:/data:
// and cap at 1000 chars to match the DB column.
const sanitizeUrl = (raw) => {
  if (raw == null) return null;
  const value = String(raw).trim();
  if (!value) return null;
  if (value.length > 1000) return null;
  const lower = value.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:')) return null;
  if (
    value.startsWith('/') ||
    lower.startsWith('http://') ||
    lower.startsWith('https://')
  ) {
    return value;
  }
  return null;
};

const MIN_PASSWORD_LENGTH = 8;

export const changePassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        message: 'Les trois champs sont requis (currentPassword, newPassword, confirmPassword)',
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: 'Le nouveau mot de passe et la confirmation ne correspondent pas',
      });
    }

    if (typeof newPassword !== 'string' || newPassword.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        message: `Le nouveau mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères`,
      });
    }

    if (newPassword === currentPassword) {
      return res.status(400).json({
        message: 'Le nouveau mot de passe doit être différent de l’ancien',
      });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(401).json({ message: 'Mot de passe actuel incorrect' });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await user.update({ password: hashed });

    return res.json({ message: 'Mot de passe modifié avec succès' });
  } catch (error) {
    next(error);
  }
};

export const updateProfilePicture = async (req, res, next) => {
  try {
    const { profile_picture } = req.body;

    if (profile_picture !== null && profile_picture !== undefined && profile_picture !== '') {
      const sanitized = sanitizeUrl(profile_picture);
      if (!sanitized) {
        return res.status(400).json({
          message:
            'URL de la photo invalide. Utilisez une URL http(s) ou un chemin /uploads/... (max 1000 caractères)',
        });
      }

      const user = await User.findByPk(req.user.id);
      if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });

      await user.update({ profile_picture: sanitized });
      return res.json({
        message: 'Photo de profil mise à jour',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          profile_picture: user.profile_picture,
        },
      });
    }

    // Empty / null => reset
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });

    await user.update({ profile_picture: null });
    return res.json({
      message: 'Photo de profil supprimée',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile_picture: null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMyProfile = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        telephone: user.telephone || null,
        profile_picture: user.profile_picture || null,
        avatar_url: user.avatar_url || null,
      },
    });
  } catch (error) {
    next(error);
  }
};
