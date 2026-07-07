import express from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middlewares/auth.js';
import {
  changePassword,
  updateProfilePicture,
  getMyProfile,
  updateMyProfile,
  deleteMyAccount,
} from '../controllers/userController.js';

const router = express.Router();

// Returns the current user with persistent fields (profile_picture, etc.).
router.get('/me', authenticate, getMyProfile);

// Update own profile fields (name, telephone, email).
router.put(
  '/me',
  authenticate,
  [
    body('name')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Nom invalide (1 à 255 caractères)'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Email invalide')
      .normalizeEmail(),
    body('telephone')
      .optional({ nullable: true })
      .isString()
      .isLength({ max: 30 })
      .withMessage('Téléphone invalide (max 30 caractères)'),
    body('momo_mtn')
      .optional({ nullable: true })
      .isString()
      .isLength({ max: 30 })
      .withMessage('Numéro MTN invalide (max 30 caractères)'),
    body('momo_orange')
      .optional({ nullable: true })
      .isString()
      .isLength({ max: 30 })
      .withMessage('Numéro Orange invalide (max 30 caractères)'),
  ],
  updateMyProfile,
);

// Permanently delete (soft-delete) own account.
router.delete('/me', authenticate, deleteMyAccount);

router.put(
  '/change-password',
  authenticate,
  [
    body('currentPassword')
      .isString()
      .withMessage('Mot de passe actuel requis')
      .notEmpty()
      .withMessage('Mot de passe actuel requis'),
    body('newPassword')
      .isString()
      .withMessage('Nouveau mot de passe requis')
      .isLength({ min: 8 })
      .withMessage('Le nouveau mot de passe doit contenir au moins 8 caractères'),
    body('confirmPassword')
      .isString()
      .withMessage('Confirmation requise')
      .notEmpty()
      .withMessage('Confirmation requise'),
  ],
  changePassword,
);

router.put(
  '/profile-picture',
  authenticate,
  [
    body('profile_picture')
      .optional({ nullable: true })
      .isString()
      .withMessage('profile_picture doit être une URL string')
      .isLength({ max: 1000 })
      .withMessage('URL trop longue (max 1000 caractères)'),
  ],
  updateProfilePicture,
);

export default router;
