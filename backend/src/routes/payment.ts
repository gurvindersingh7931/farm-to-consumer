import { Router } from 'express';
import { authenticateJWT, authorizeRoles } from '../middleware/authMiddleware';
import {
  createOrder,
  verifyPayment,
  getSubscriptionStatus,
  getSubscriptionPlans,
  cancelSubscription
} from '../controllers/paymentController';

const router = Router();

// Public routes
router.get('/plans', getSubscriptionPlans);

// Protected routes (requires authentication)
router.post('/create-order', authenticateJWT, authorizeRoles('farmer'), createOrder);
router.post('/verify-payment', authenticateJWT, authorizeRoles('farmer'), verifyPayment);
router.get('/subscription-status', authenticateJWT, authorizeRoles('farmer'), getSubscriptionStatus);
router.post('/cancel-subscription', authenticateJWT, authorizeRoles('farmer'), cancelSubscription);

export default router;
