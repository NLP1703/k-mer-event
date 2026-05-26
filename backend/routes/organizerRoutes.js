import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import {
  listOrganizerEventBookings,
  deleteOrganizerEventBooking,
} from '../controllers/organizerEventsController.js';

const router = express.Router();

router.get('/events/:eventId/bookings', authenticate, listOrganizerEventBookings);
router.delete('/events/:eventId/bookings/:bookingId', authenticate, deleteOrganizerEventBooking);

export default router;

