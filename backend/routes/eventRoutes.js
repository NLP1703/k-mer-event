import express from 'express';
import { body } from 'express-validator';
import {
  authenticate,
  authorize,
  authorizeEventOwner,
  restrictOrganizerToPending,
} from '../middlewares/auth.js';
import {
  createEvent,
  listEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  approveEventByAdmin,
  cancelEventByAdmin,
} from '../controllers/eventController.js';


const router = express.Router();


router.get('/', listEvents);
router.get('/:id', getEventById);

router.post(
  '/',
  authenticate,
  authorize('admin', 'organizer'),
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('category').notEmpty().withMessage('Category is required'),
    body('city').notEmpty().withMessage('City is required'),
    body('venue').notEmpty().withMessage('Venue is required'),
    body('organizer').notEmpty().withMessage('Organizer is required'),
    body('start_date').notEmpty().withMessage('Start date is required'),
    body('ticket_quantity').isInt({ min: 1 }).withMessage('Ticket quantity must be at least 1'),
    body('ticket_price').isFloat({ min: 0 }).withMessage('Ticket price is required'),
    body('video_url')
      .optional({ checkFalsy: true })
      .isLength({ max: 1000 })
      .withMessage('Video URL must be at most 1000 characters'),
  ],
  createEvent,
);

// Organizers may edit their OWN events at any status (ownership enforced by
// authorizeEventOwner). The field whitelist in the controller still prevents
// them from changing status/owner, so they cannot self-publish.
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'organizer'),
  authorizeEventOwner,
  updateEvent,
);

router.delete(
  '/:id',
  authenticate,
  authorize('admin', 'organizer'),
  authorizeEventOwner,
  restrictOrganizerToPending,
  deleteEvent,
);

// Admin workflow: proposée par organizer => pending, puis admin publie/annule
router.post('/:id/approve', authenticate, authorize('admin'), approveEventByAdmin);
router.post('/:id/cancel', authenticate, authorize('admin'), cancelEventByAdmin);

export default router;
