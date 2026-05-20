import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import { listUsersForAdmin } from '../controllers/adminUsersController.js';

const router = express.Router();

router.get(
  '/',
  authenticate,
  authorize('admin'),
  listUsersForAdmin
);

export default router;

