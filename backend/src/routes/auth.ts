import { Router } from 'express';
import { register, login, logout, refreshToken, getProfile, updateProfile } from '../controllers/authController';
import { authenticateToken, authRateLimit, validateTokenFormat } from '../middleware/auth';
import { commonValidations, validateRequest } from '../middleware/validation';

const router = Router();

// Public routes with validation and rate limiting
router.post('/register', 
  authRateLimit,
  commonValidations.email,
  commonValidations.password,
  commonValidations.firstName,
  commonValidations.lastName,
  validateRequest,
  register
);

router.post('/login', 
  authRateLimit,
  commonValidations.email,
  validateRequest,
  login
);

router.post('/logout',
  validateTokenFormat,
  authenticateToken,
  logout
);

router.post('/refresh-token',
  validateTokenFormat,
  refreshToken
);

// Protected routes
router.get('/profile', 
  validateTokenFormat,
  authenticateToken, 
  getProfile
);

router.put('/profile',
  validateTokenFormat,
  authenticateToken,
  updateProfile
);

export default router;
