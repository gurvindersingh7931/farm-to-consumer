import { Router } from 'express';
import { authenticateJWT, authorizeRoles } from '../middleware/authMiddleware';
import {
  getPaymentConfig,
  createOrder,
  verifyPayment,
  getSubscriptionStatus,
  getPlans,
  cancelSubscription,
} from '../controllers/paymentController';

const router = Router();

// Public: get plans for a context (e.g. ?context=subscription_farmer)
router.get('/plans', getPlans);

// Protected: get Razorpay public key only (never secret)
router.get('/config', authenticateJWT, getPaymentConfig);

// Protected: create order and verify – allowed for farmer and consumer (generic for future use)
router.post('/create-order', authenticateJWT, authorizeRoles(['farmer', 'consumer']), createOrder);
router.post('/verify-payment', authenticateJWT, authorizeRoles(['farmer', 'consumer']), verifyPayment);

// Subscription status and cancel – both roles can have subscription
router.get('/subscription-status', authenticateJWT, authorizeRoles(['farmer', 'consumer']), getSubscriptionStatus);
router.post('/cancel-subscription', authenticateJWT, authorizeRoles(['farmer', 'consumer']), cancelSubscription);

export default router;
