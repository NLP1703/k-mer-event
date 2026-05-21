import express from 'express';
import { body } from 'express-validator';
import { registerUser, loginUser, currentUser } from '../controllers/authController.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),

    body('telephone').trim().notEmpty().withMessage('Telephone is required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  registerUser,
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  loginUser,
);

router.get('/me', authenticate, currentUser);

export default router;
