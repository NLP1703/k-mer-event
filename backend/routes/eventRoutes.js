import express from 'express';
import { body } from 'express-validator';
import { authenticate, authorize } from '../middlewares/auth.js';
import { createEvent, listEvents, getEventById, updateEvent, deleteEvent } from '../controllers/eventController.js';

const router = express.Router();

router.get('/', listEvents);
router.get('/:id', getEventById);
router.post(
  '/',
  authenticate,
  authorize('admin'),
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
  ],
  createEvent,
);
router.put('/:id', authenticate, authorize('admin'), updateEvent);
router.delete('/:id', authenticate, authorize('admin'), deleteEvent);

export default router;
