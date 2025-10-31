import { Router } from 'express';
import { submitFeedback, getMyFeedback, listFeedback, updateFeedback } from '../controllers/feedbackController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Auth required for all feedback endpoints
router.use(authenticateToken);

// User feedback endpoints
router.post('/', submitFeedback);
router.get('/mine', getMyFeedback);

// Admin endpoints
router.get('/admin', requireRole(['admin']), listFeedback);
router.put('/admin/:id', requireRole(['admin']), updateFeedback);

export default router;


