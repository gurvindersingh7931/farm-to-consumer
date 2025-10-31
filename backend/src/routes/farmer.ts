import { Router } from 'express';
import { 
  createFarmerProfile, 
  getFarmerProfile, 
  updateFarmerProfile, 
  deleteFarmerProfile,
  getAllFarmers,
  getFarmerById,
  updatePremiumStatus,
  searchFarmers,
  uploadProfilePhoto,
  browseFarmers
} from '../controllers/farmerController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Public routes (no authentication required)
router.get('/farmers', getAllFarmers);
router.get('/farmers/search', searchFarmers);
router.get('/farmers/browse', browseFarmers);
router.get('/farmers/:id', getFarmerById);

// Protected routes (authentication required)
router.use(authenticateToken);

// Farmer profile management routes
router.post('/profile', uploadProfilePhoto, createFarmerProfile);
router.get('/profile', getFarmerProfile);
router.put('/profile', uploadProfilePhoto, updateFarmerProfile);
router.delete('/profile', deleteFarmerProfile);

// Premium features routes (farmer role required)
router.put('/premium-status', requireRole('farmer'), updatePremiumStatus);

export default router;
