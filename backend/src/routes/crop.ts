import { Router } from 'express';
import { authenticateJWT, authorizeRoles } from '../middleware/authMiddleware';
import {
  createCrop,
  getFarmerCrops,
  getCropById,
  updateCrop,
  deleteCrop,
  getAllCrops,
  getCropCategories,
  toggleCropAvailability,
  browseCrops,
  getFarmerCropsPublic,
  getPremiumFeaturedCrops,
} from '../controllers/cropController';

const router = Router();

// Public routes (no authentication required)
router.get('/categories', getCropCategories);
router.get('/browse', browseCrops);
router.get('/premium-featured', getPremiumFeaturedCrops);
router.get('/public', getAllCrops);
router.get('/public/:id', getCropById);
router.get('/farmer/:farmerId', getFarmerCropsPublic);

// Farmer routes (requires authentication and farmer role)
router.post('/', authenticateJWT, authorizeRoles('farmer'), createCrop);
router.get('/', authenticateJWT, authorizeRoles('farmer'), getFarmerCrops);
router.get('/:id', getCropById);
router.put('/:id', authenticateJWT, authorizeRoles('farmer'), updateCrop);
router.patch('/:id/toggle-availability', authenticateJWT, authorizeRoles('farmer'), toggleCropAvailability);
router.delete('/:id', authenticateJWT, authorizeRoles('farmer'), deleteCrop);

export default router;
