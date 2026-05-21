import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import {
  listUsersForAdmin,
  getUserForAdmin,
  createUserForAdmin,
  updateUserForAdmin,
  deleteUserForAdmin,
} from '../controllers/adminUsersController.js';

const router = express.Router();

router.get(
  '/',
  authenticate,
  authorize('admin'),
  listUsersForAdmin
);

router.get(
  '/:id',
  authenticate,
  authorize('admin'),
  getUserForAdmin
);

router.post(
  '/',
  authenticate,
  authorize('admin'),
  createUserForAdmin
);

router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  updateUserForAdmin
);

router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  deleteUserForAdmin
);

export default router;


