import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import { getBookingsForUserByAdmin } from '../controllers/adminBookingsController.js';

const router = express.Router();

router.get(
  '/users/:id/bookings',
  authenticate,
  authorize('admin'),
  getBookingsForUserByAdmin
);

export default router;

