import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import {
  listMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../controllers/notificationController.js';

const router = express.Router();

router.get('/', authenticate, listMyNotifications);
router.post('/read-all', authenticate, markAllNotificationsRead);
router.patch('/:id/read', authenticate, markNotificationRead);

export default router;
