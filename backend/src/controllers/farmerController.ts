import { Request, Response } from 'express';
import { Op, Sequelize } from 'sequelize';
import FarmerRating from '../models/FarmerRating';
import Farmer from '../models/Farmer';
import User from '../models/User';
import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';
import path from 'path';
import fs from 'fs';

interface AuthRequest extends Request {
  user?: any;
}

// Helper function to calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Configure multer for file uploads (S3 if configured, else disk)
const isS3Enabled = Boolean(
  process.env.AWS_S3_BUCKET && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
);

let storage: multer.StorageEngine;

if (isS3Enabled) {
  const s3 = new S3Client({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    },
  });

  storage = multerS3({
    s3: s3 as any,
    bucket: process.env.AWS_S3_BUCKET as string,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req: Express.Request, file: Express.Multer.File, cb: (error: any, key?: string) => void) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, `profiles/farmer-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
  });
} else {
  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, '../../public/uploads/profiles');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, `farmer-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
  });
}

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

export const uploadProfilePhoto = upload.single('profilePhoto');

export const createFarmerProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    console.log('Received request body:', req.body);
    console.log('Received file:', req.file);
    
    const userId = req.user.id;
    const {
      phone,
      farmName,
      farmDescription,
      farmLocation,
      latitude,
      longitude,
      address,
      city,
      state,
      zipCode,
      country,
      website
    } = req.body;

    // Check if farmer profile already exists
    const existingFarmer = await Farmer.findOne({ where: { userId } });
    if (existingFarmer) {
      res.status(400).json({ message: 'Farmer profile already exists' });
      return;
    }

    // Create farmer profile
    const profilePhotoUrl = req.file
      ? (isS3Enabled ? (req.file as any).location : `/uploads/profiles/${req.file.filename}`)
      : undefined;

    const farmer = await Farmer.create({
      userId,
      phone,
      farmName,
      farmDescription,
      farmLocation,
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
      address,
      city,
      state,
      zipCode,
      country,
      profilePhoto: profilePhotoUrl,
      website,
      isVerified: false,
      hasVerifiedBadge: false,
      isBoosted: false,
    });

    // Get user details
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] }
    });

    res.status(201).json({
      message: 'Farmer profile created successfully',
      farmer: {
        ...farmer.toJSON(),
        user
      }
    });
  } catch (error) {
    console.error('Create farmer profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getFarmerProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;

    const farmer = await Farmer.findOne({
      where: { userId },
      include: [{
        model: User,
        as: 'user',
        attributes: { exclude: ['password'] }
      }]
    });

    if (!farmer) {
      res.status(404).json({ message: 'Farmer profile not found' });
      return;
    }

    res.json({
      message: 'Farmer profile retrieved successfully',
      farmer
    });
  } catch (error) {
    console.error('Get farmer profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateFarmerProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const {
      phone,
      farmName,
      farmDescription,
      farmLocation,
      latitude,
      longitude,
      address,
      city,
      state,
      zipCode,
      country,
      website
    } = req.body;

    const farmer = await Farmer.findOne({ where: { userId } });
    if (!farmer) {
      res.status(404).json({ message: 'Farmer profile not found' });
      return;
    }

    // Delete old profile photo if new one is uploaded
    if (req.file && farmer.profilePhoto) {
      try {
        // Only delete local files; S3 objects are versioned/managed separately
        if (!isS3Enabled && farmer.profilePhoto) {
          const oldPath = farmer.profilePhoto.startsWith('/uploads')
            ? path.join(__dirname, '../../public', farmer.profilePhoto)
            : farmer.profilePhoto;
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
      } catch (error) {
        console.error('Error deleting old profile photo:', error);
      }
    }

    // Update farmer profile
    await farmer.update({
      phone,
      farmName,
      farmDescription,
      farmLocation,
      latitude: latitude ? parseFloat(latitude) : farmer.latitude,
      longitude: longitude ? parseFloat(longitude) : farmer.longitude,
      address,
      city,
      state,
      zipCode,
      country,
      profilePhoto: req.file ? (isS3Enabled ? (req.file as any).location : `/uploads/profiles/${req.file.filename}`) : farmer.profilePhoto,
      website,
    });

    // Get updated farmer with user details
    const updatedFarmer = await Farmer.findOne({
      where: { userId },
      include: [{
        model: User,
        as: 'user',
        attributes: { exclude: ['password'] }
      }]
    });

    res.json({
      message: 'Farmer profile updated successfully',
      farmer: updatedFarmer
    });
  } catch (error) {
    console.error('Update farmer profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteFarmerProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;

    const farmer = await Farmer.findOne({ where: { userId } });
    if (!farmer) {
      res.status(404).json({ message: 'Farmer profile not found' });
      return;
    }

    // Delete profile photo if exists
    if (farmer.profilePhoto) {
      try {
        fs.unlinkSync(farmer.profilePhoto);
      } catch (error) {
        console.error('Error deleting profile photo:', error);
      }
    }

    await farmer.destroy();

    res.json({
      message: 'Farmer profile deleted successfully'
    });
  } catch (error) {
    console.error('Delete farmer profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAllFarmers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, location, category, premium } = req.query;
    
    // Build where clause
    const whereClause: any = {};
    
    if (search) {
      whereClause[Op.or] = [
        { farmName: { [Op.iLike]: `%${search}%` } },
        { farmDescription: { [Op.iLike]: `%${search}%` } },
        { farmLocation: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    if (location) {
      whereClause[Op.or] = [
        { city: { [Op.iLike]: `%${location}%` } },
        { state: { [Op.iLike]: `%${location}%` } },
        { farmLocation: { [Op.iLike]: `%${location}%` } }
      ];
    }

    // Build include clause with User model
    const includeClause = [{
      model: User,
      as: 'user',
      attributes: { exclude: ['password'] }
    }];

    // If premium filter is requested, add user premium status to where clause
    if (premium === 'true') {
        (includeClause[0] as any).where = { isPremium: true };
    }

    const farmers = await Farmer.findAll({
      where: whereClause,
      include: includeClause,
      order: [
        // Premium farmers first (boosted visibility)
        [{ model: User, as: 'user' }, 'isPremium', 'DESC'],
        // Then verified badge farmers
        ['hasVerifiedBadge', 'DESC'],
        // Then boosted farmers
        ['isBoosted', 'DESC'],
        // Finally by creation date
        ['createdAt', 'DESC']
      ]
    });

    res.json({
      message: 'Farmers retrieved successfully',
      farmers,
      total: farmers.length
    });
  } catch (error) {
    console.error('Get all farmers error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getFarmerById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Try to find by Farmer ID first
    let farmer = await Farmer.findByPk(id, {
      include: [{
        model: User,
        as: 'user',
        attributes: { exclude: ['password'] }
      }]
    });

    // If not found, try to find by User ID
    if (!farmer) {
      farmer = await Farmer.findOne({
        where: { userId: parseInt(id) },
        include: [{
          model: User,
          as: 'user',
          attributes: { exclude: ['password'] }
        }]
      });
    }

    if (!farmer) {
      res.status(404).json({ message: 'Farmer not found' });
      return;
    }

    // Aggregate rating
    const ratingAgg = await FarmerRating.findAll({
      where: { farmerId: (farmer as any).userId },
      attributes: [
        [Sequelize.fn('AVG', Sequelize.col('rating')), 'avg'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      raw: true
    });
    const [row] = (ratingAgg as unknown as Array<{ avg: number | string | null; count: number | string | null }>);
    const avg = row && row.avg != null ? parseFloat(String(row.avg)) : 0;
    const count = row && row.count != null ? parseInt(String(row.count)) : 0;

    res.json({
      message: 'Farmer retrieved successfully',
      farmer: { ...(farmer as any).toJSON(), rating: avg, totalRatings: count }
    });
  } catch (error) {
    console.error('Get farmer by ID error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updatePremiumStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const { hasVerifiedBadge, isBoosted } = req.body;

    const farmer = await Farmer.findOne({ where: { userId } });
    if (!farmer) {
      res.status(404).json({ message: 'Farmer profile not found' });
      return;
    }

    // Update premium features
    await farmer.update({
      hasVerifiedBadge: hasVerifiedBadge !== undefined ? hasVerifiedBadge : farmer.hasVerifiedBadge,
      isBoosted: isBoosted !== undefined ? isBoosted : farmer.isBoosted,
    });

    // Get updated farmer with user details
    const updatedFarmer = await Farmer.findOne({
      where: { userId },
      include: [{
        model: User,
        as: 'user',
        attributes: { exclude: ['password'] }
      }]
    });

    res.json({
      message: 'Premium status updated successfully',
      farmer: updatedFarmer
    });
  } catch (error) {
    console.error('Update premium status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const searchFarmers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, location, premium, limit = 20, offset = 0, latitude, longitude, radius } = req.query;
    
    // Build where clause
    const whereClause: any = {};
    
    if (q) {
      whereClause[Op.or] = [
        { farmName: { [Op.iLike]: `%${q}%` } },
        { farmDescription: { [Op.iLike]: `%${q}%` } },
        { farmLocation: { [Op.iLike]: `%${q}%` } }
      ];
    }
    
    if (location) {
      whereClause[Op.or] = [
        { city: { [Op.iLike]: `%${location}%` } },
        { state: { [Op.iLike]: `%${location}%` } },
        { farmLocation: { [Op.iLike]: `%${location}%` } }
      ];
    }

    // Build include clause with User model
    const includeClause = [{
      model: User,
      as: 'user',
      attributes: { exclude: ['password'] }
    }];

    // If premium filter is requested, add user premium status to where clause
    if (premium === 'true') {
        (includeClause[0] as any).where = { isPremium: true };
    }

    let farmers: any[] = [];
    let totalCount = 0;

    // If radius filtering is requested, we need to calculate distances
    if (latitude && longitude && radius) {
      const userLat = parseFloat(latitude as string);
      const userLon = parseFloat(longitude as string);
      const radiusKm = parseFloat(radius as string);

      // Get all farmers first
      const allFarmers = await Farmer.findAll({
        where: whereClause,
        include: includeClause,
        order: [
          // Premium farmers first (boosted visibility)
          [{ model: User, as: 'user' }, 'isPremium', 'DESC'],
          // Then verified badge farmers
          ['hasVerifiedBadge', 'DESC'],
          // Then boosted farmers
          ['isBoosted', 'DESC'],
          // Finally by creation date
          ['createdAt', 'DESC']
        ]
      });

      // Filter by distance
      const farmersWithDistance = allFarmers
        .map(farmer => {
          const farmerData = farmer.toJSON() as any;
          if (farmerData.latitude && farmerData.longitude) {
            const distance = calculateDistance(userLat, userLon, farmerData.latitude, farmerData.longitude);
            return { ...farmerData, distance };
          }
          return { ...farmerData, distance: null };
        })
        .filter(farmer => farmer.distance !== null && farmer.distance <= radiusKm)
        .sort((a, b) => a.distance - b.distance); // Sort by distance

      totalCount = farmersWithDistance.length;
      farmers = farmersWithDistance.slice(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string));
    } else {
      // No radius filtering, use standard query
      const result = await Farmer.findAndCountAll({
        where: whereClause,
        include: includeClause,
        order: [
          // Premium farmers first (boosted visibility)
          [{ model: User, as: 'user' }, 'isPremium', 'DESC'],
          // Then verified badge farmers
          ['hasVerifiedBadge', 'DESC'],
          // Then boosted farmers
          ['isBoosted', 'DESC'],
          // Finally by creation date
          ['createdAt', 'DESC']
        ],
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

      farmers = result.rows.map(farmer => farmer.toJSON());
      totalCount = result.count;
    }

    res.json({
      message: 'Farmers search completed successfully',
      farmers,
      total: totalCount,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
  } catch (error) {
    console.error('Search farmers error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Advanced farmer browsing with comprehensive filtering
export const browseFarmers = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      state,
      city,
      premium,
      verified,
      boosted,
      radius,
      latitude,
      longitude,
      sortBy = 'premium',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const userLat = latitude ? parseFloat(latitude as string) : null;
    const userLon = longitude ? parseFloat(longitude as string) : null;
    const radiusKm = radius ? parseFloat(radius as string) : null;

    // Build base where clause
    const whereClause: any = { farmerId: { [Op.ne]: null } }; // Only farmers with profiles

    // Enhanced search filter
    if (search) {
      whereClause[Op.or] = [
        { farmName: { [Op.iLike]: `%${search}%` } },
        { farmDescription: { [Op.iLike]: `%${search}%` } },
        { farmLocation: { [Op.iLike]: `%${search}%` } },
        { city: { [Op.iLike]: `%${search}%` } },
        { state: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Location filters
    if (state) {
      whereClause.state = { [Op.iLike]: `%${state}%` };
    }
    if (city) {
      whereClause.city = { [Op.iLike]: `%${city}%` };
    }

    // Premium/Feature filters
    if (verified !== undefined) {
      whereClause.hasVerifiedBadge = verified === 'true';
    }
    if (boosted !== undefined) {
      whereClause.isBoosted = boosted === 'true';
    }

    // Location-based filtering with PostgreSQL Haversine formula
    let includeWhere: any = {};

    if (userLat && userLon && radiusKm) {
      includeWhere = {
        latitude: { [Op.ne]: null },
        longitude: { [Op.ne]: null }
      };
    }

    // Premium filter
    if (premium === 'true') {
      includeWhere = { ...includeWhere, isPremium: true };
    }

    // Build include clause with user data
    const includeClause = [{
      model: User,
      as: 'user',
      attributes: ['id', 'firstName', 'lastName', 'email', 'isPremium'],
      where: Object.keys(includeWhere).length > 0 ? includeWhere : undefined,
      required: Object.keys(includeWhere).length > 0
    }];

    // Build order clause
    let orderClause: any[] = [];

    switch (sortBy) {
      case 'distance':
        if (userLat && userLon) {
          orderClause = [[
            Sequelize.literal(`
              (
                6371 * acos(
                  cos(radians(${userLat})) * cos(radians("Farmer"."latitude")) *
                  cos(radians("Farmer"."longitude") - radians(${userLon})) +
                  sin(radians(${userLat})) * sin(radians("Farmer"."latitude"))
                )
              )
            `),
            'ASC'
          ]];
        } else {
          orderClause = [['createdAt', 'DESC']];
        }
        break;
      case 'premium':
        orderClause = [
          [{ model: User, as: 'user' }, 'isPremium', 'DESC'],
          ['hasVerifiedBadge', 'DESC'],
          ['isBoosted', 'DESC'],
          ['createdAt', 'DESC']
        ];
        break;
      case 'verified':
        orderClause = [
          ['hasVerifiedBadge', 'DESC'],
          ['isBoosted', 'DESC'],
          [{ model: User, as: 'user' }, 'isPremium', 'DESC'],
          ['createdAt', 'DESC']
        ];
        break;
      case 'name':
        orderClause = [['farmName', (sortOrder as string).toUpperCase()]];
        break;
      case 'created':
        orderClause = [['createdAt', (sortOrder as string).toUpperCase()]];
        break;
      default:
        orderClause = [
          [{ model: User, as: 'user' }, 'isPremium', 'DESC'],
          ['hasVerifiedBadge', 'DESC'],
          ['isBoosted', 'DESC'],
          ['createdAt', 'DESC']
        ];
        break;
    }

    // Execute main query
    const { count, rows: farmers } = await Farmer.findAndCountAll({
      where: whereClause,
      include: includeClause,
      order: orderClause,
      limit: Number(limit),
      offset,
      subQuery: false
    });

    // Calculate distances and apply additional filtering
    let filteredFarmers = farmers.map(farmer => {
      const farmerData = farmer.toJSON() as any;
      if (userLat && userLon && farmerData.latitude && farmerData.longitude) {
        const distance = calculateDistance(userLat, userLon, farmerData.latitude, farmerData.longitude);
        return { ...farmerData, distance };
      }
      return farmerData;
    });

    // Apply radius filter
    if (radiusKm) {
      filteredFarmers = filteredFarmers.filter(farmer => 
        farmer.distance !== null && farmer.distance <= radiusKm
      );
    }

    // Get aggregation data for filters
    const [locationStats, premiumStats] = await Promise.all([
      // Location counts
      Farmer.findAll({
        attributes: [
          'state',
          [Sequelize.fn('COUNT', Sequelize.col('Farmer.id')), 'count']
        ],
        include: [{
          model: User,
          as: 'user',
          attributes: [],
          where: { farmerId: { [Op.ne]: null } }
        }],
        group: ['state'],
        raw: true
      }),
      
      // Premium counts
      Farmer.findAll({
        attributes: [
          [Sequelize.fn('COUNT', Sequelize.col('Farmer.id')), 'total'],
          [
            Sequelize.fn('COUNT', 
              Sequelize.literal('CASE WHEN "user"."isPremium" = true THEN 1 END')
            ), 
            'premiumCount'
          ],
          [
            Sequelize.fn('COUNT', 
              Sequelize.literal('CASE WHEN "Farmer"."hasVerifiedBadge" = true THEN 1 END')
            ), 
            'verifiedCount'
          ],
          [
            Sequelize.fn('COUNT', 
              Sequelize.literal('CASE WHEN "Farmer"."isBoosted" = true THEN 1 END')
            ), 
            'boostedCount'
          ]
        ],
        include: [{
          model: User,
          as: 'user',
          attributes: [],
          where: { farmerId: { [Op.ne]: null } }
        }],
        raw: true
      })
    ]);

    const locationData = locationStats.map((stat: any) => ({
      state: stat.state,
      count: parseInt(stat.count)
    }));

    const premiumStatsData = premiumStats[0] || { total: 0, premiumCount: 0, verifiedCount: 0, boostedCount: 0 };

    res.status(200).json({
      message: 'Farmers retrieved successfully',
      farmers: filteredFarmers,
      pagination: {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / Number(limit)),
        hasNext: offset + Number(limit) < count,
        hasPrev: Number(page) > 1
      },
      filters: {
        locations: locationData,
        premiumStats: premiumStatsData,
        totalFarmers: count
      }
    });
  } catch (error) {
    console.error('Error browsing farmers:', error);
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Internal server error', error: errMsg });
  }
};

// Get user's rating for a farmer
export const getUserRating = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const farmerUserId = parseInt(req.params.id);
    const raterUserId = req.user?.id;

    if (!raterUserId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const rating = await FarmerRating.findOne({
      where: { farmerId: farmerUserId, userId: raterUserId }
    });

    res.json({ rating: rating?.rating || null });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Get user rating error:', error);
    res.status(500).json({ message: 'Internal server error', error: errMsg });
  }
};

// Rate a farmer (by userId of the farmer)
export const rateFarmer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    console.log('Rate farmer endpoint hit', { user: req.user, params: req.params, body: req.body });
    const farmerUserId = parseInt(req.params.id);
    const raterUserId = req.user?.id;

    if (!raterUserId) {
      console.log('No user found in request');
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const { rating } = req.body || {};
    const parsed = Number(rating);
    if (!parsed || parsed < 1 || parsed > 5) {
      res.status(400).json({ message: 'Rating must be between 1 and 5' });
      return;
    }
    if (raterUserId === farmerUserId) {
      res.status(400).json({ message: 'You cannot rate yourself' });
      return;
    }

    // Upsert: unique (farmerId, userId)
    const existing = await FarmerRating.findOne({ where: { farmerId: farmerUserId, userId: raterUserId } });
    if (existing) {
      await existing.update({ rating: parsed });
    } else {
      await FarmerRating.create({ farmerId: farmerUserId, userId: raterUserId, rating: parsed } as any);
    }

    // Recompute average and count
    const agg = await FarmerRating.findAll({
      where: { farmerId: farmerUserId },
      attributes: [
        [Sequelize.fn('AVG', Sequelize.col('rating')), 'avg'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      raw: true
    });
    const [aggRow] = (agg as unknown as Array<{ avg: number | string | null; count: number | string | null }>);
    const avg = aggRow && aggRow.avg != null ? parseFloat(String(aggRow.avg)) : 0;
    const count = aggRow && aggRow.count != null ? parseInt(String(aggRow.count)) : 0;

    res.json({ message: 'Rating saved', rating: avg, totalRatings: count });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Rate farmer error:', error);
    res.status(500).json({ message: 'Internal server error', error: errMsg });
  }
};
