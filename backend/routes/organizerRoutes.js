import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import {
  listOrganizerEventBookings,
  deleteOrganizerEventBooking,
  updateOrganizerEventBookingStatus,
} from '../controllers/organizerEventsController.js';
import {
  getOrganizerStatistics,
  getOrganizerEventStatistics,
} from '../controllers/organizerStatisticsController.js';

const router = express.Router();

router.get('/events/:eventId/bookings', authenticate, listOrganizerEventBookings);
router.patch('/events/:eventId/bookings/:bookingId/status', authenticate, updateOrganizerEventBookingStatus);
router.delete('/events/:eventId/bookings/:bookingId', authenticate, deleteOrganizerEventBooking);

// Statistics — restricted to organizer role; controller filters by ownership.
router.get('/statistics', authenticate, authorize('organizer'), getOrganizerStatistics);
router.get('/statistics/events', authenticate, authorize('organizer'), getOrganizerEventStatistics);

export default router;
