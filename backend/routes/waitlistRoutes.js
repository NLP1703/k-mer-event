import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import {
  joinWaitlist,
  getMyWaitlist,
  leaveWaitlist,
} from '../controllers/waitlistController.js';

const router = express.Router();

router.post('/', authenticate, joinWaitlist);
router.get('/me', authenticate, getMyWaitlist);
router.delete('/:id', authenticate, leaveWaitlist);

export default router;
