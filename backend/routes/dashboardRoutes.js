import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import { getDashboardStats } from '../controllers/dashboardController.js';

const router = express.Router();

router.get('/', authenticate, authorize('admin'), getDashboardStats);

export default router;
