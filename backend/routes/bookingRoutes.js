import express from 'express';
import { body } from 'express-validator';
import { authenticate, authorize } from '../middlewares/auth.js';
import {
  createBooking,
  getBookingsForUser,
  getBookingById,
  checkoutCart,
  downloadTicketPdf,
  checkInBooking,
} from '../controllers/bookingController.js';

const router = express.Router();

// Ticket validation at the entrance (admin or organizer). Defined before
// the '/:id' routes so "checkin" is not captured as an id.
router.post('/checkin', authenticate, authorize('admin', 'organizer'), checkInBooking);

router.post(
  '/',
  authenticate,
  [
    body('eventId').notEmpty().withMessage('Event ID is required'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  ],
  createBooking,
);
router.post('/checkout', authenticate, checkoutCart);
router.get('/', authenticate, getBookingsForUser);
router.get('/:id/ticket', authenticate, downloadTicketPdf);
router.get('/:id', authenticate, getBookingById);

export default router;
