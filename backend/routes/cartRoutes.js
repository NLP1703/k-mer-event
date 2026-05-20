import express from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middlewares/auth.js';
import { getCart, addToCart, removeFromCart, clearCart } from '../controllers/cartController.js';

const router = express.Router();

router.get('/', authenticate, getCart);
router.post(
  '/',
  authenticate,
  [
    body('eventId').notEmpty().withMessage('Event ID is required'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  ],
  addToCart,
);
router.delete('/:eventId', authenticate, removeFromCart);
router.delete('/', authenticate, clearCart);

export default router;
