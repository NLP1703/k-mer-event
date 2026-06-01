import express from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middlewares/auth.js';
import {
  changePassword,
  updateProfilePicture,
  getMyProfile,
} from '../controllers/userController.js';

const router = express.Router();

// Returns the current user with persistent fields (profile_picture, etc.).
router.get('/me', authenticate, getMyProfile);

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
