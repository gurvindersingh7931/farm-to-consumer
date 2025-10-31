import { Request, Response, RequestHandler } from 'express';
import { Op } from 'sequelize';
import { User, Farmer, Crop, Subscription, Order } from '../models';

interface AuthRequest extends Request {
  user?: any;
}

// Admin request with authenticated user guaranteed
interface AdminRequest extends Request {
  user: any;
}

export const getAllUsers: RequestHandler = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });

    res.json({
      message: 'Users retrieved successfully',
      users,
      total: users.length
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getUserById: RequestHandler = async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({
      message: 'User retrieved successfully',
      user
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateUser: RequestHandler = async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, role, isActive } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Prevent admin from deactivating themselves
    if ((req as any).user?.id === parseInt(id) && isActive === false) {
      res.status(400).json({ message: 'Cannot deactivate your own account' });
      return;
    }

    await user.update({
      firstName: firstName || user.firstName,
      lastName: lastName || user.lastName,
      email: email || user.email,
      role: role || user.role,
      isActive: isActive !== undefined ? isActive : user.isActive
    });

    const updatedUser = await User.findByPk(id, {
      attributes: { exclude: ['password'] }
    });

    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteUser: RequestHandler = async (req, res): Promise<void> => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if ((req as any).user?.id === parseInt(id)) {
      res.status(400).json({ message: 'Cannot delete your own account' });
      return;
    }

    const user = await User.findByPk(id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    await user.destroy();

    res.json({
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getDashboardStats: RequestHandler = async (req, res) => {
  try {
    // User Statistics
    const totalUsers = await User.count();
    const totalFarmers = await User.count({ where: { role: 'farmer' } });
    const totalConsumers = await User.count({ where: { role: 'consumer' } });
    const totalAdmins = await User.count({ where: { role: 'admin' } });
    const activeUsers = await User.count({ where: { isActive: true } });
    const inactiveUsers = await User.count({ where: { isActive: false } });
    const premiumUsers = await User.count({ where: { isPremium: true } });

    // Time-based user statistics
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const recentUsers = await User.count({
      where: {
        createdAt: {
          [Op.gte]: sevenDaysAgo
        }
      }
    });

    const monthlyUsers = await User.count({
      where: {
        createdAt: {
          [Op.gte]: thirtyDaysAgo
        }
      }
    });

    // Farmer Profile Statistics
    const totalFarmerProfiles = await Farmer.count();
    const verifiedFarmers = await Farmer.count({ where: { isVerified: true } });
    const boostedFarmers = await Farmer.count({ where: { isBoosted: true } });
    const badgedFarmers = await Farmer.count({ where: { hasVerifiedBadge: true } });

    // Crop Statistics
    const totalCrops = await Crop.count();
    const activeCrops = await Crop.count({ where: { isActive: true } });
    const availableCrops = await Crop.count({ where: { isAvailable: true } });
    const premiumCrops = await Crop.count({ where: { isPremium: true } });
    const organicCrops = await Crop.count({ where: { isOrganic: true } });

    // Recent crops (last 7 days)
    const recentCrops = await Crop.count({
      where: {
        createdAt: {
          [Op.gte]: sevenDaysAgo
        }
      }
    });

    // Subscription Statistics
    const totalSubscriptions = await Subscription.count();
    const activeSubscriptions = await Subscription.count({ 
      where: { 
        isActive: true,
        expiresAt: {
          [Op.gt]: now
        }
      } 
    });
    const expiredSubscriptions = await Subscription.count({ 
      where: { 
        expiresAt: {
          [Op.lt]: now
        }
      } 
    });

    // Recent subscriptions (last 7 days)
    const recentSubscriptions = await Subscription.count({
      where: {
        createdAt: {
          [Op.gte]: sevenDaysAgo
        }
      }
    });

    // Order Statistics (Transactions)
    const totalOrders = await Order.count();
    const pendingOrders = await Order.count({ where: { status: 'pending' } });
    const acceptedOrders = await Order.count({ where: { status: 'accepted' } });
    const completedOrders = await Order.count({ where: { status: 'completed' } });
    const rejectedOrders = await Order.count({ where: { status: 'rejected' } });
    const cancelledOrders = await Order.count({ where: { status: 'cancelled' } });

    // Recent orders (last 7 days)
    const recentOrders = await Order.count({
      where: {
        createdAt: {
          [Op.gte]: sevenDaysAgo
        }
      }
    });

    // Revenue calculations (sum of completed orders)
    const totalRevenue = await Order.sum('totalAmount', {
      where: { status: 'completed' }
    }) || 0;

    const monthlyRevenue = await Order.sum('totalAmount', {
      where: { 
        status: 'completed',
        createdAt: {
          [Op.gte]: thirtyDaysAgo
        }
      }
    }) || 0;

    const weeklyRevenue = await Order.sum('totalAmount', {
      where: { 
        status: 'completed',
        createdAt: {
          [Op.gte]: sevenDaysAgo
        }
      }
    }) || 0;

    res.json({
      message: 'Dashboard stats retrieved successfully',
      stats: {
        users: {
          total: totalUsers,
          farmers: totalFarmers,
          consumers: totalConsumers,
          admins: totalAdmins,
          active: activeUsers,
          inactive: inactiveUsers,
          premium: premiumUsers,
          recent: recentUsers,
          monthly: monthlyUsers
        },
        farmers: {
          totalProfiles: totalFarmerProfiles,
          verified: verifiedFarmers,
          boosted: boostedFarmers,
          badged: badgedFarmers
        },
        crops: {
          total: totalCrops,
          active: activeCrops,
          available: availableCrops,
          premium: premiumCrops,
          organic: organicCrops,
          recent: recentCrops
        },
        subscriptions: {
          total: totalSubscriptions,
          active: activeSubscriptions,
          expired: expiredSubscriptions,
          recent: recentSubscriptions
        },
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          accepted: acceptedOrders,
          completed: completedOrders,
          rejected: rejectedOrders,
          cancelled: cancelledOrders,
          recent: recentOrders
        },
        revenue: {
          total: totalRevenue,
          monthly: monthlyRevenue,
          weekly: weeklyRevenue
        }
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getChartData: RequestHandler = async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    let days = 7;
    if (period === '30d') days = 30;
    if (period === '90d') days = 90;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Generate date labels
    const labels = [];
    const userRegistrations = [];
    const orderCounts = [];
    const revenues = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      labels.push(dateStr);
      
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      
      // Count user registrations for this day
      const dailyUsers = await User.count({
        where: {
          createdAt: {
            [Op.between]: [dayStart, dayEnd]
          }
        }
      });
      userRegistrations.push(dailyUsers);
      
      // Count orders for this day
      const dailyOrders = await Order.count({
        where: {
          createdAt: {
            [Op.between]: [dayStart, dayEnd]
          }
        }
      });
      orderCounts.push(dailyOrders);
      
      // Sum revenue for this day
      const dailyRevenue = await Order.sum('totalAmount', {
        where: {
          status: 'completed',
          createdAt: {
            [Op.between]: [dayStart, dayEnd]
          }
        }
      }) || 0;
      revenues.push(dailyRevenue);
    }
    
    // User role distribution
    const roleDistribution = {
      farmers: await User.count({ where: { role: 'farmer' } }),
      consumers: await User.count({ where: { role: 'consumer' } }),
      admins: await User.count({ where: { role: 'admin' } })
    };
    
    // Order status distribution
    const orderStatusDistribution = {
      pending: await Order.count({ where: { status: 'pending' } }),
      accepted: await Order.count({ where: { status: 'accepted' } }),
      completed: await Order.count({ where: { status: 'completed' } }),
      rejected: await Order.count({ where: { status: 'rejected' } }),
      cancelled: await Order.count({ where: { status: 'cancelled' } })
    };
    
    res.json({
      message: 'Chart data retrieved successfully',
      data: {
        timeline: {
          labels,
          userRegistrations,
          orderCounts,
          revenues
        },
        roleDistribution,
        orderStatusDistribution
      }
    });
  } catch (error) {
    console.error('Get chart data error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getRecentActivities: RequestHandler = async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    // Recent user registrations
    const recentUsers = await User.findAll({
      attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit as string) / 4
    });
    
    // Recent orders
    const recentOrders = await Order.findAll({
      attributes: ['id', 'totalAmount', 'status', 'createdAt'],
      include: [
        {
          model: User,
          as: 'consumer',
          attributes: ['firstName', 'lastName']
        },
        {
          model: Crop,
          as: 'crop',
          attributes: ['name']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit as string) / 4
    });
    
    // Recent subscriptions
    const recentSubscriptions = await Subscription.findAll({
      attributes: ['id', 'amount', 'plan', 'createdAt'],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['firstName', 'lastName']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit as string) / 4
    });
    
    // Recent crops
    const recentCrops = await Crop.findAll({
      attributes: ['id', 'name', 'pricePerKg', 'createdAt'],
      include: [
        {
          model: User,
          as: 'farmer',
          attributes: ['firstName', 'lastName']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit as string) / 4
    });
    
    // Combine and format activities
    const activities = [
      ...recentUsers.map(user => ({
        type: 'user_registration',
        id: user.id,
        title: `New ${user.role} registered`,
        description: `${user.firstName} ${user.lastName} (${user.email})`,
        timestamp: user.createdAt,
        icon: '👤'
      })),
      ...recentOrders.map(order => ({
        type: 'order',
        id: order.id,
        title: `New order placed`,
        description: `${order.consumer?.firstName} ${order.consumer?.lastName} ordered ${order.crop?.name} - ₹${order.totalAmount}`,
        timestamp: order.createdAt,
        icon: '🛒'
      })),
      ...recentSubscriptions.map(sub => ({
        type: 'subscription',
        id: sub.id,
        title: `New subscription`,
        description: `${(sub as any).user?.firstName} ${(sub as any).user?.lastName} subscribed to ${sub.planType} plan - ₹${sub.amount}`,
        timestamp: sub.createdAt,
        icon: '💳'
      })),
      ...recentCrops.map(crop => ({
        type: 'crop',
        id: crop.id,
        title: `New crop listed`,
        description: `${(crop as any).farmer?.firstName} ${(crop as any).farmer?.lastName} listed ${crop.name} at ₹${crop.pricePerKg}/kg`,
        timestamp: crop.createdAt,
        icon: '🌾'
      }))
    ];
    
    // Sort by timestamp and limit
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const limitedActivities = activities.slice(0, parseInt(limit as string));
    
    res.json({
      message: 'Recent activities retrieved successfully',
      activities: limitedActivities
    });
  } catch (error) {
    console.error('Get recent activities error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// User Management Functions

export const blockUser: RequestHandler = async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Prevent admin from blocking themselves
    if ((req as any).user?.id === parseInt(id)) {
      res.status(400).json({ message: 'Cannot block your own account' });
      return;
    }

    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Prevent blocking other admins
    if (user.role === 'admin') {
      res.status(400).json({ message: 'Cannot block admin accounts' });
      return;
    }

    await user.update({
      isActive: false,
      // You might want to add a 'blockReason' field to the User model
    });

    res.json({
      message: 'User blocked successfully',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const unblockUser: RequestHandler = async (req, res): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    await user.update({
      isActive: true
    });

    res.json({
      message: 'User unblocked successfully',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const verifyFarmer: RequestHandler = async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const { verified, hasVerifiedBadge } = req.body;

    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (user.role !== 'farmer') {
      res.status(400).json({ message: 'User is not a farmer' });
      return;
    }

    // Find or create farmer profile
    let farmer = await Farmer.findOne({ where: { userId: id } });
    
    if (!farmer) {
      res.status(404).json({ message: 'Farmer profile not found' });
      return;
    }

    await farmer.update({
      isVerified: verified !== undefined ? verified : farmer.isVerified,
      hasVerifiedBadge: hasVerifiedBadge !== undefined ? hasVerifiedBadge : farmer.hasVerifiedBadge
    });

    res.json({
      message: 'Farmer verification status updated successfully',
      farmer: {
        id: farmer.id,
        userId: farmer.userId,
        isVerified: farmer.isVerified,
        hasVerifiedBadge: farmer.hasVerifiedBadge
      }
    });
  } catch (error) {
    console.error('Verify farmer error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getFarmersForVerification: RequestHandler = async (req, res) => {
  try {
    const { status = 'pending' } = req.query;

    let whereClause: any = {};
    
    if (status === 'pending') {
      whereClause = { isVerified: false };
    } else if (status === 'verified') {
      whereClause = { isVerified: true };
    }

    const farmers = await Farmer.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'isActive', 'createdAt'],
          where: { role: 'farmer' }
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      message: 'Farmers retrieved successfully',
      farmers,
      total: farmers.length
    });
  } catch (error) {
    console.error('Get farmers for verification error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getUsersByRole: RequestHandler = async (req, res) => {
  try {
    const { role } = req.params;
    const { status, page = 1, limit = 20 } = req.query;

    if (!['farmer', 'consumer', 'admin'].includes(role)) {
      res.status(400).json({ message: 'Invalid role specified' });
      return;
    }

    let whereClause: any = { role };

    if (status === 'active') {
      whereClause.isActive = true;
    } else if (status === 'blocked') {
      whereClause.isActive = false;
    }

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['password'] },
      include: role === 'farmer' ? [
        {
          model: Farmer,
          as: 'farmerProfile',
          required: false
        }
      ] : [],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit as string),
      offset
    });

    res.json({
      message: `${role.charAt(0).toUpperCase() + role.slice(1)}s retrieved successfully`,
      users,
      total: count,
      page: parseInt(page as string),
      totalPages: Math.ceil(count / parseInt(limit as string))
    });
  } catch (error) {
    console.error('Get users by role error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getUserStats: RequestHandler = async (req, res) => {
  try {
    const { role } = req.params;

    if (!['farmer', 'consumer'].includes(role)) {
      res.status(400).json({ message: 'Invalid role specified' });
      return;
    }

    const totalUsers = await User.count({ where: { role } });
    const activeUsers = await User.count({ where: { role, isActive: true } });
    const blockedUsers = await User.count({ where: { role, isActive: false } });

    let additionalStats: any = {};

    if (role === 'farmer') {
      const verifiedFarmers = await Farmer.count({ 
        where: { isVerified: true },
        include: [{ model: User, as: 'user', where: { role: 'farmer' } }]
      });
      const unverifiedFarmers = await Farmer.count({ 
        where: { isVerified: false },
        include: [{ model: User, as: 'user', where: { role: 'farmer' } }]
      });
      const premiumFarmers = await User.count({ where: { role: 'farmer', isPremium: true } });

      additionalStats = {
        verified: verifiedFarmers,
        unverified: unverifiedFarmers,
        premium: premiumFarmers
      };
    } else if (role === 'consumer') {
      const premiumConsumers = await User.count({ where: { role: 'consumer', isPremium: true } });
      const totalOrders = await Order.count({
        include: [{ model: User, as: 'consumer', where: { role: 'consumer' } }]
      });

      additionalStats = {
        premium: premiumConsumers,
        totalOrders
      };
    }

    res.json({
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} stats retrieved successfully`,
      stats: {
        total: totalUsers,
        active: activeUsers,
        blocked: blockedUsers,
        ...additionalStats
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const searchUsers: RequestHandler = async (req, res) => {
  try {
    const { query, role, status } = req.query;

    if (!query) {
      res.status(400).json({ message: 'Search query is required' });
      return;
    }

    let whereClause: any = {
      [Op.or]: [
        { firstName: { [Op.iLike]: `%${query}%` } },
        { lastName: { [Op.iLike]: `%${query}%` } },
        { email: { [Op.iLike]: `%${query}%` } }
      ]
    };

    if (role && ['farmer', 'consumer', 'admin'].includes(role as string)) {
      whereClause.role = role;
    }

    if (status === 'active') {
      whereClause.isActive = true;
    } else if (status === 'blocked') {
      whereClause.isActive = false;
    }

    const users = await User.findAll({
      where: whereClause,
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Farmer,
          as: 'farmerProfile',
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    res.json({
      message: 'Users found successfully',
      users,
      total: users.length
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Approve/Verify a farmer
export const approveFarmer: RequestHandler = async (req, res): Promise<void> => {
  try {
    const { userId } = req.params;
    
    // Find the farmer profile first
    const farmer = await Farmer.findOne({ where: { userId } });
    if (!farmer) {
      res.status(404).json({ message: 'Farmer profile not found' });
      return;
    }

    // Update farmer verification status
    await farmer.update({
      isVerified: true,
      hasVerifiedBadge: true
    });

    // Update user premium status (approved farmers get basic premium features)
    const user = await User.findByPk(userId);
    if (user) {
      await user.update({
        isPremium: true,
        premiumExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      });
    }

    res.json({
      message: 'Farmer approved and verified successfully',
      farmer: {
        ...farmer.toJSON(),
        user: user?.toJSON()
      }
    });
  } catch (error) {
    console.error('Approve farmer error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Reject farmer verification
export const rejectFarmer: RequestHandler = async (req, res): Promise<void> => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    
    const farmer = await Farmer.findOne({ where: { userId } });
    if (!farmer) {
      res.status(404).json({ message: 'Farmer profile not found' });
      return;
    }

    // Update farmer as not verified
    await farmer.update({
      isVerified: false,
      hasVerifiedBadge: false
    });

    // Remove premium status
    const user = await User.findByPk(userId);
    if (user) {
      await user.update({
        isPremium: false,
        premiumExpiresAt: undefined as any
      });
    }

    res.json({
      message: 'Farmer verification rejected',
      reason: reason || 'Verification rejected by admin'
    });
  } catch (error) {
    console.error('Reject farmer error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Suspend/Block a user
export const suspendUser: RequestHandler = async (req, res): Promise<void> => {
  try {
    const { userId } = req.params;
    const { reason, duration } = req.body; // duration in days
    
    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (user.id === (req as any).user?.id) {
      res.status(400).json({ message: 'Cannot suspend yourself' });
      return;
    }

    // Calculate suspension expiry
    const suspendedUntil = duration ? 
      new Date(Date.now() + duration * 24 * 60 * 60 * 1000) : 
      undefined; // Permanent suspension if no duration

    await user.update({
      isActive: false,
      suspendedUntil: (suspendedUntil as any),
      suspensionReason: (reason || 'Account suspended by admin') as any
    });

    res.json({
      message: `${user.role} account suspended successfully`,
      suspendedUntil: suspendedUntil,
      reason: reason || 'Account suspended by admin'
    });
  } catch (error) {
    console.error('Suspend user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Restore/Unblock a user
export const restoreUser: RequestHandler = async (req, res): Promise<void> => {
  try {
    const { userId } = req.params;
    
    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    await user.update({
      isActive: true,
      suspendedUntil: undefined as any,
      suspensionReason: undefined as any
    });

    res.json({
      message: `${user.role} account restored successfully`
    });
  } catch (error) {
    console.error('Restore user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete a user account permanently
export const deleteUserAccount: RequestHandler = async (req, res): Promise<void> => {
  try {
    const { userId } = req.params;
    const { confirmDelete } = req.body;
    
    if (!confirmDelete) {
      res.status(400).json({ message: 'Please confirm deletion' });
      return;
    }

    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (user.id === (req as any).user?.id) {
      res.status(400).json({ message: 'Cannot delete yourself' });
      return;
    }

    // Soft delete - set as inactive and mark deletion timestamp
    await user.update({
      isActive: false,
      deletedAt: new Date(),
      email: `deleted_${user.id}_${user.email}`, // Anonymize email
      firstName: 'Deleted',
      lastName: 'User'
    });

    res.json({
      message: `User account (${user.email}) deleted successfully`
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get user management statistics
export const getUserManagementStats: RequestHandler = async (req, res): Promise<void> => {
  try {
    const [
      totalUsers,
      activeUsers,
      blockedUsers,
      suspendedUsers,
      verifiedFarmers,
      unverifiedFarmers,
      newUsersThisWeek,
      premiumUsers
    ] = await Promise.all([
      User.count(),
      User.count({ where: { isActive: true } }),
      User.count({ where: { isActive: false } }),
      User.count({ where: { suspendedUntil: { [Op.not]: undefined } as any } }),
      Farmer.count({ where: { isVerified: true } }),
      Farmer.count({ where: { isVerified: false } }),
      User.count({ 
        where: { 
          createdAt: { 
            [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) 
          } 
        } 
      }),
      User.count({ where: { isPremium: true } })
    ]);

    const stats = {
      users: {
        total: totalUsers,
        active: activeUsers,
        blocked: blockedUsers,
        suspended: suspendedUsers,
        newThisWeek: newUsersThisWeek,
        premium: premiumUsers
      },
      farmers: {
        verified: verifiedFarmers,
        unverified: unverifiedFarmers,
        total: verifiedFarmers + unverifiedFarmers,
        verificationRate: verifiedFarmers + unverifiedFarmers > 0 ? 
          (verifiedFarmers / (verifiedFarmers + unverifiedFarmers) * 100).toFixed(1) : 0
      }
    };

    res.json({
      message: 'User management statistics retrieved successfully',
      stats
    });
  } catch (error) {
    console.error('Get user management stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Listing (Crop) Moderation
export const getListings: RequestHandler = async (req, res): Promise<void> => {
  try {
    const { status, sponsored, flagged, page = 1, limit = 20, search } = req.query as any;

    const where: any = {};
    if (status === 'approved') where.isApproved = true;
    if (status === 'pending') where.isApproved = false;
    if (sponsored === 'true') where.isSponsored = true;
    if (flagged === 'true') where.flaggedReason = { [Op.not]: undefined } as any;
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { category: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Crop.findAndCountAll({
      where,
      include: [{ model: User, as: 'farmer', attributes: ['id', 'firstName', 'lastName', 'email'] }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      message: 'Listings retrieved successfully',
      listings: rows,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / parseInt(limit))
    });
  } catch (error) {
    console.error('Get listings error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const approveListing: RequestHandler = async (req, res): Promise<void> => {
  try {
    const { cropId } = req.params as any;
    const crop = await Crop.findByPk(cropId);
    if (!crop) {
      res.status(404).json({ message: 'Listing not found' });
      return;
    }

    await crop.update({
      isApproved: true,
      approvedAt: new Date(),
      moderatedBy: ((req as any).user?.id ?? undefined) as any,
      flaggedReason: undefined as any,
      flaggedAt: undefined as any
    } as any);

    res.json({ message: 'Listing approved successfully', crop });
  } catch (error) {
    console.error('Approve listing error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const flagListing: RequestHandler = async (req, res): Promise<void> => {
  try {
    const { cropId } = req.params as any;
    const { reason } = req.body;
    const crop = await Crop.findByPk(cropId);
    if (!crop) {
      res.status(404).json({ message: 'Listing not found' });
      return;
    }

    await crop.update({
      isApproved: false,
      flaggedReason: (reason || 'Inappropriate content') as any,
      flaggedAt: new Date(),
      moderatedBy: ((req as any).user?.id ?? undefined) as any
    } as any);

    res.json({ message: 'Listing flagged successfully', crop });
  } catch (error) {
    console.error('Flag listing error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const sponsorListing: RequestHandler = async (req, res): Promise<void> => {
  try {
    const { cropId } = req.params as any;
    const { days = 30 } = req.body; // default 30 days
    const crop = await Crop.findByPk(cropId);
    if (!crop) {
      res.status(404).json({ message: 'Listing not found' });
      return;
    }

    const until = new Date(Date.now() + Number(days) * 24 * 60 * 60 * 1000);
    await crop.update({
      isSponsored: true,
      sponsoredUntil: until,
      moderatedBy: ((req as any).user?.id ?? undefined) as any
    } as any);

    res.json({ message: 'Listing marked as sponsored', crop });
  } catch (error) {
    console.error('Sponsor listing error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const unsponsorListing: RequestHandler = async (req, res): Promise<void> => {
  try {
    const { cropId } = req.params as any;
    const crop = await Crop.findByPk(cropId);
    if (!crop) {
      res.status(404).json({ message: 'Listing not found' });
      return;
    }

    await crop.update({
      isSponsored: false,
      sponsoredUntil: undefined as any
    } as any);

    res.json({ message: 'Listing sponsorship removed', crop });
  } catch (error) {
    console.error('Unsponsor listing error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
