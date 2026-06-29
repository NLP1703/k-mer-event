import express from 'express';
import { body } from 'express-validator';
import rateLimit from 'express-rate-limit';
import {
  registerUser,
  loginUser,
  refreshSession,
  logoutUser,
  currentUser,
} from '../controllers/authController.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

// Coarse per-IP throttle on credential endpoints (defence in depth on top of the
// progressive, per-account lockout in loginGuard). Skips the in-memory store's
// own successful requests so legitimate users aren't penalised.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: 'Too many attempts from this IP, please try again later.' },
});

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('telephone').trim().notEmpty().withMessage('Telephone is required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('role')
      .optional()
      .isIn(['user', 'organizer'])
      .withMessage("role must be 'user' or 'organizer'"),
    body('organization_name')
      .optional({ nullable: true })
      .custom((value, { req }) => {
        if (req.body.role === 'organizer') {
          if (typeof value !== 'string' || !value.trim()) {
            throw new Error('organization_name is required for organizer');
          }
        }
        return true;
      }),
  ],
  registerUser,
);

router.post(
  '/login',
  loginLimiter,
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  loginUser,
);

router.post('/refresh', refreshSession);
router.post('/logout', logoutUser);
router.get('/me', authenticate, currentUser);

export default router;
