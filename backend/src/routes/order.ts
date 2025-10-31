import { Router } from 'express';
import {
  createOrder,
  getConsumerOrders,
  getFarmerOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
} from '../controllers/orderController';
import { authenticateJWT, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

// All routes require authentication
router.use(authenticateJWT);

// Consumer routes
router.post('/', authorizeRoles('consumer'), createOrder);
router.get('/consumer', authorizeRoles('consumer'), getConsumerOrders);
router.put('/:id/cancel', authorizeRoles('consumer'), cancelOrder);

// Farmer routes
router.get('/farmer', authorizeRoles('farmer'), getFarmerOrders);
router.put('/:id/status', authorizeRoles('farmer'), updateOrderStatus);

// Shared routes (both consumer and farmer can access)
router.get('/:id', getOrderById);

export default router;