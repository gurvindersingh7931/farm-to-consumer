import { Router } from 'express';
import { 
  getAllUsers, 
  getUserById, 
  updateUser, 
  deleteUser, 
  getDashboardStats,
  getChartData,
  getRecentActivities,
  blockUser,
  unblockUser,
  verifyFarmer,
  getFarmersForVerification,
  getUsersByRole,
  getUserStats,
  searchUsers,
  approveFarmer,
  rejectFarmer,
  suspendUser,
  restoreUser,
  deleteUserAccount,
  getUserManagementStats
} from '../controllers/adminController';
import { approveListing, flagListing, sponsorListing, unsponsorListing, getListings } from '../controllers/adminController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireRole(['admin']));

// Dashboard stats
router.get('/dashboard/stats', getDashboardStats);
router.get('/dashboard/charts', getChartData);
router.get('/dashboard/activities', getRecentActivities);

// User management routes
router.get('/users', getAllUsers);
router.get('/users/search', searchUsers);
router.get('/users/role/:role', getUsersByRole);
router.get('/users/role/:role/stats', getUserStats);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// User blocking/unblocking
router.put('/users/:id/block', blockUser);
router.put('/users/:id/unblock', unblockUser);

// Farmer verification
router.get('/farmers/verification', getFarmersForVerification);
router.put('/farmers/:id/verify', verifyFarmer);

// Enhanced User Management
router.put('/farmers/:userId/approve', approveFarmer);
router.put('/farmers/:userId/reject', rejectFarmer);
router.put('/users/:userId/suspend', suspendUser);
router.put('/users/:userId/restore', restoreUser);
router.delete('/users/:userId', deleteUserAccount);
router.get('/users/manage/stats', getUserManagementStats);

// Listing moderation routes
router.get('/listings', getListings);
router.put('/listings/:cropId/approve', approveListing);
router.put('/listings/:cropId/flag', flagListing);
router.put('/listings/:cropId/sponsor', sponsorListing);
router.put('/listings/:cropId/unsponsor', unsponsorListing);

export default router;
