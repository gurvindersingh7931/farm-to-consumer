import { Router } from 'express';
import authRoutes from './auth';
import adminRoutes from './admin';
import farmerRoutes from './farmer';
import cropRoutes from './crop';
import paymentRoutes from './payment';
import orderRoutes from './order';
import feedbackRoutes from './feedback';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Farm-to-Consumer API is running',
    timestamp: new Date().toISOString()
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/farmer', farmerRoutes);
router.use('/crop', cropRoutes);
router.use('/payment', paymentRoutes);
router.use('/order', orderRoutes);
router.use('/feedback', feedbackRoutes);

export default router;
