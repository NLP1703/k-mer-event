import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import {
  getDashboardStats,
  getPresenceSnapshot,
  getWeeklyUsage,
} from '../controllers/dashboardController.js';

const router = express.Router();

router.get('/', authenticate, authorize('admin'), getDashboardStats);
router.get('/presence', authenticate, authorize('admin'), getPresenceSnapshot);
router.get('/usage', authenticate, authorize('admin'), getWeeklyUsage);

export default router;
