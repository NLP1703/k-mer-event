import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import {
  getFavorites,
  addFavorite,
  removeFavorite,
  syncFavorites,
} from '../controllers/favoritesController.js';

const router = express.Router();

router.use(authenticate);
router.get('/', getFavorites);
router.post('/', addFavorite);
router.post('/sync', syncFavorites);
router.delete('/:eventId', removeFavorite);

export default router;
