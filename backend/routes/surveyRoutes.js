import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, authorize } from '../middlewares/auth.js';
import { submitSurvey, getSurveyResults } from '../controllers/surveyController.js';

const router = express.Router();

// Deter bulk spam on the public submit endpoint while staying generous enough
// for many genuine respondents behind one shared/NAT IP (e.g. a class on the
// same campus WiFi). Keyed by real client IP thanks to `trust proxy`.
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Trop de soumissions. Réessayez plus tard.' },
});

router.post('/', submitLimiter, submitSurvey);
router.get('/results', authenticate, authorize('admin'), getSurveyResults);

export default router;
