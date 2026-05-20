import express from 'express';
import { body } from 'express-validator';
import { authenticate, authorize } from '../middlewares/auth.js';
import { processPayment, getPaymentByBookingId } from '../controllers/paymentsController.js';

const router = express.Router();

// User can trigger payment for their own pending booking
router.post(
  '/',
  authenticate,
  [
    body('bookingId').notEmpty().withMessage('bookingId is required'),
    body('provider').optional().isString().trim(),
    body('amount').optional().isFloat({ gt: 0 }).withMessage('amount must be > 0'),
  ],
  processPayment
);

router.get(
  '/:bookingId',
  authenticate,
  getPaymentByBookingId
);

export default router;

