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
  browseFarmers,
  rateFarmer,
  getUserRating
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

// Get user's rating for a farmer
router.get('/farmers/:id/my-rating', getUserRating);
// Allow anyone logged in to rate a farmer by user id
router.post('/farmers/:id/rate', rateFarmer);

// Farmer profile management routes
router.post('/profile', uploadProfilePhoto, createFarmerProfile);
router.get('/profile', getFarmerProfile);
router.put('/profile', uploadProfilePhoto, updateFarmerProfile);
router.delete('/profile', deleteFarmerProfile);

// Premium features routes (farmer role required)
router.put('/premium-status', requireRole('farmer'), updatePremiumStatus);

export default router;
