import { Request, Response } from 'express';
import { Crop, User, Farmer } from '../models';
import FarmerRating from '../models/FarmerRating';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import * as s3Presign from '../services/s3PresignService';
import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';
import path from 'path';
import fs from 'fs';
import { Op, Sequelize } from 'sequelize';

// Multer setup for crop image uploads (S3 if configured)
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
      cb(null, `crop-images/${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
  });
} else {
  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(__dirname, '../../public/uploads/crop-images');
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    },
  });
}

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only images (jpeg, jpg, png, gif) are allowed'));
  },
}).single('image');

// Check if farmer can add more crops (free users limited to 3 active crops)
const checkCropLimit = async (farmerId: number, isPremium: boolean): Promise<{ canAdd: boolean; message?: string }> => {
  if (isPremium) {
    return { canAdd: true };
  }

  const activeCropCount = await Crop.count({
    where: {
      farmerId,
      isActive: true,
    },
  });

  if (activeCropCount >= 10) {
    return {
      canAdd: false,
      message: 'Free users are limited to 10 active crop listings. Upgrade to premium for unlimited listings.',
    };
  }

  return { canAdd: true };
};

export const createCrop = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  upload(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      res.status(400).json({ message: err.message });
      return;
    } else if (err) {
      res.status(500).json({ message: err.message });
      return;
    }

    try {
      const farmerId = req.user!.id;
      const {
        name,
        description,
        pricePerKg,
        quantity,
        unit,
        category,
        harvestDate,
        expiryDate,
        location,
        organic,
      } = req.body;

      // Get farmer details to check premium status
      const farmer = await User.findByPk(farmerId);
      if (!farmer) {
        res.status(404).json({ message: 'Farmer not found' });
        return;
      }

      // Check crop limit for free users
      const limitCheck = await checkCropLimit(farmerId, farmer.isPremium || false);
      if (!limitCheck.canAdd) {
        res.status(403).json({ message: limitCheck.message });
        return;
      }

      const imageUrl = req.file
        ? (isS3Enabled ? (req.file as any).location : `/uploads/crop-images/${req.file.filename}`)
        : undefined;

      const crop = await Crop.create({
        farmerId,
        name,
        description,
        pricePerKg: parseFloat(pricePerKg),
        quantity: parseFloat(quantity),
        unit,
        category,
        imageUrl,
        harvestDate: harvestDate ? new Date(harvestDate) : undefined,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        location,
        organic: organic === 'true' || organic === true,
        isPremium: farmer.isPremium || false,
        isAvailable: true, // Default to available when creating
        isOrganic: organic || false, // Set isOrganic based on organic field
      });

      const cropData = await s3Presign.withPresignedCropImageUrl(crop);
      res.status(201).json({
        message: 'Crop created successfully',
        crop: cropData,
      });
    } catch (error) {
      console.error('Error creating crop:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
};

export const getFarmerCrops = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const farmerId = req.user!.id;
    const { page = 1, limit = 10, category, isActive } = req.query;

    const whereClause: any = { farmerId };
    
    if (category) {
      whereClause.category = category;
    }
    
    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }

    const offset = (Number(page) - 1) * Number(limit);

    const { count, rows: crops } = await Crop.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'farmer',
          attributes: ['firstName', 'lastName', 'email'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: Number(limit),
      offset,
    });

    const cropsData = await s3Presign.withPresignedCropImageUrls(crops);
    res.status(200).json({
      crops: cropsData,
      pagination: {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching farmer crops:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Duplicate function removed - using the more comprehensive version below

export const updateCrop = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  upload(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      res.status(400).json({ message: err.message });
      return;
    } else if (err) {
      res.status(500).json({ message: err.message });
      return;
    }

    try {
      const farmerId = req.user!.id;
      const { id } = req.params;
      const {
        name,
        description,
        pricePerKg,
        quantity,
        unit,
        category,
        harvestDate,
        expiryDate,
        location,
        organic,
        isActive,
        isAvailable,
        isPremium,
        removeImage,
      } = req.body;

      const crop = await Crop.findOne({
        where: { id, farmerId },
      });

      if (!crop) {
        res.status(404).json({ message: 'Crop not found' });
        return;
      }

      // Handle image update/removal
      let newImageUrl = crop.imageUrl;
      if (req.file) {
        // Delete old image if exists (local only)
        if (!isS3Enabled && crop.imageUrl) {
          const oldImagePath = path.join(__dirname, '../../public', crop.imageUrl);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }
        newImageUrl = isS3Enabled ? (req.file as any).location : `/uploads/crop-images/${req.file.filename}`;
      } else if (removeImage === 'true' && crop.imageUrl) {
        // Remove existing local image if requested (for S3, you may mark/remove via SDK if needed)
        if (!isS3Enabled) {
          const oldImagePath = path.join(__dirname, '../../public', crop.imageUrl);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }
        newImageUrl = undefined;
      }

      await crop.update({
        name: name || crop.name,
        description: description || crop.description,
        pricePerKg: pricePerKg ? parseFloat(pricePerKg) : crop.pricePerKg,
        quantity: quantity ? parseFloat(quantity) : crop.quantity,
        unit: unit || crop.unit,
        category: category || crop.category,
        imageUrl: newImageUrl,
        harvestDate: harvestDate ? new Date(harvestDate) : crop.harvestDate,
        expiryDate: expiryDate ? new Date(expiryDate) : crop.expiryDate,
        location: location || crop.location,
        organic: organic !== undefined ? (organic === 'true' || organic === true) : crop.organic,
        isActive: isActive !== undefined ? (isActive === 'true' || isActive === true) : crop.isActive,
        isAvailable: isAvailable !== undefined ? (isAvailable === 'true' || isAvailable === true) : crop.isAvailable,
        isPremium: isPremium !== undefined ? (isPremium === 'true' || isPremium === true) : crop.isPremium,
      });

      const cropData = await s3Presign.withPresignedCropImageUrl(crop);
      res.status(200).json({
        message: 'Crop updated successfully',
        crop: cropData,
      });
    } catch (error) {
      console.error('Error updating crop:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
};

export const deleteCrop = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const farmerId = req.user!.id;
    const { id } = req.params;

    const crop = await Crop.findOne({
      where: { id, farmerId },
    });

    if (!crop) {
      res.status(404).json({ message: 'Crop not found' });
      return;
    }

    // Delete image if it exists
    if (crop.imageUrl) {
      const imagePath = path.join(__dirname, '../../public', crop.imageUrl);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await crop.destroy();

    res.status(200).json({ message: 'Crop deleted successfully' });
  } catch (error) {
    console.error('Error deleting crop:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAllCrops = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 20, category, search, minPrice, maxPrice, organic } = req.query;

    const whereClause: any = { isActive: true };

    if (category) {
      whereClause.category = category;
    }

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (minPrice || maxPrice) {
      whereClause.pricePerKg = {};
      if (minPrice) whereClause.pricePerKg[Op.gte] = parseFloat(minPrice as string);
      if (maxPrice) whereClause.pricePerKg[Op.lte] = parseFloat(maxPrice as string);
    }

    if (organic !== undefined) {
      whereClause.organic = organic === 'true';
    }

    const offset = (Number(page) - 1) * Number(limit);

    const { count, rows: crops } = await Crop.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'farmer',
          attributes: ['firstName', 'lastName', 'email'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: Number(limit),
      offset,
    });

    const cropsData = await s3Presign.withPresignedCropImageUrls(crops);
    res.status(200).json({
      crops: cropsData,
      pagination: {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching all crops:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const toggleCropAvailability = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const farmerId = req.user!.id;
    const { id } = req.params;

    const crop = await Crop.findOne({
      where: { id, farmerId },
    });

    if (!crop) {
      res.status(404).json({ message: 'Crop not found' });
      return;
    }

    // Toggle availability status
    await crop.update({
      isAvailable: !crop.isAvailable,
    });

    const cropData = await s3Presign.withPresignedCropImageUrl(crop);
    res.status(200).json({
      message: `Crop marked as ${crop.isAvailable ? 'available' : 'sold out'}`,
      crop: cropData,
    });
  } catch (error) {
    console.error('Error toggling crop availability:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getCropCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await Crop.findAll({
      attributes: [
        'category',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      where: { isActive: true },
      group: ['category'],
      order: [['category', 'ASC']],
    });

    const categoryList = categories.map(crop => ({
      name: crop.category,
      count: parseInt((crop as any).getDataValue('count') as string)
    }));

    res.status(200).json({ categories: categoryList });
  } catch (error) {
    console.error('Error fetching crop categories:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const browseCrops = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 12,
      search,
      category,
      minPrice,
      maxPrice,
      maxDistance,
      minRating,
      isOrganic,
      isAvailable,
      farmerPremium,
      latitude,
      longitude,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    // Build where clause
    const whereClause: any = { isActive: true };

    // Enhanced search filter
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { category: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Category filter
    if (category) {
      whereClause.category = category;
    }

    // Price range filter
    if (minPrice || maxPrice) {
      whereClause.pricePerKg = {};
      if (minPrice) whereClause.pricePerKg[Op.gte] = parseFloat(minPrice as string);
      if (maxPrice) whereClause.pricePerKg[Op.lte] = parseFloat(maxPrice as string);
    }

    // Organic filter (check both fields)
    if (isOrganic !== undefined) {
      const organicValue = isOrganic === 'true';
      whereClause[Op.or] = [
        { organic: organicValue },
        { isOrganic: organicValue }
      ];
    }

    // Availability filter
    if (isAvailable !== undefined) {
      whereClause.isAvailable = isAvailable === 'true';
    }

    // Build include clause with Farmer and User models
    const includeClause: any[] = [
      {
        model: User,
        as: 'farmer',
        attributes: ['id', 'firstName', 'lastName', 'email', 'isPremium'],
        include: [
          {
            model: Farmer,
            as: 'farmerProfile',
            attributes: ['farmName', 'city', 'state', 'latitude', 'longitude', 'hasVerifiedBadge', 'isBoosted'],
            required: maxDistance && latitude && longitude ? true : false
          }
        ]
      }
    ];

    // Premium farmer filter
    if (farmerPremium === 'true') {
      (includeClause[0] as any).where = { isPremium: true };
    }

    // Build order clause
    let orderClause: any[] = [];
    
    switch (sortBy) {
      case 'price':
        orderClause = [['pricePerKg', (sortOrder as string).toUpperCase()]];
        break;
      case 'freshness':
        orderClause = [['harvestDate', 'ASC']]; // Most recent harvest first
        break;
      case 'distance':
        if (latitude && longitude) {
          // Use PostgreSQL distance calculation for sorting
          const userLat = parseFloat(latitude as string);
          const userLon = parseFloat(longitude as string);
          orderClause = [[
            Sequelize.literal(`
              (
                6371 * acos(
                  cos(radians(${userLat})) *
                  cos(radians("farmer->farmerProfile"."latitude")) *
                  cos(radians("farmer->farmerProfile"."longitude") - radians(${userLon})) +
                  sin(radians(${userLat})) *
                  sin(radians("farmer->farmerProfile"."latitude"))
                )
              )
            `), 
            'ASC'
          ]];
        } else {
          orderClause = [['createdAt', 'DESC']];
        }
        break;
      case 'rating':
        // For now, we'll use a placeholder since we don't have ratings yet
        orderClause = [['createdAt', 'DESC']];
        break;
      case 'createdAt':
      default:
        orderClause = [['createdAt', (sortOrder as string).toUpperCase()]];
        break;
    }

    // Add premium farmers first if not already sorted by something else
    if (sortBy !== 'price' && sortBy !== 'freshness') {
      orderClause.unshift([{ model: User, as: 'farmer' }, 'isPremium', 'DESC']);
    }

    const offset = (Number(page) - 1) * Number(limit);

    const { count, rows: crops } = await Crop.findAndCountAll({
      where: whereClause,
      include: includeClause,
      order: orderClause,
      limit: Number(limit),
      offset,
    });

    // Calculate distances and apply distance filter if location provided
    let filteredCrops = crops;
    if (latitude && longitude && maxDistance) {
      const userLat = parseFloat(latitude as string);
      const userLon = parseFloat(longitude as string);
      const maxDist = parseFloat(maxDistance as string);

      filteredCrops = crops.filter(crop => {
        const farmer = (crop as any).farmer?.farmerProfile;
        if (farmer?.latitude && farmer?.longitude) {
          const distance = calculateDistance(
            userLat, userLon,
            farmer.latitude, farmer.longitude
          );
          (crop as any).farmer.distance = distance;
          return distance <= maxDist;
        }
        return false;
      });
    }

    // Apply rating filter (placeholder for future implementation)
    if (minRating) {
      const minRatingValue = parseFloat(minRating as string);
      // For now, we'll skip this filter since we don't have ratings yet
      // filteredCrops = filteredCrops.filter(crop => crop.farmer?.rating >= minRatingValue);
    }

    // Presign image URLs first (this converts to plain objects; rating must be attached after)
    const cropsData = await s3Presign.withPresignedCropImageUrls(filteredCrops);

    // Attach farmer rating to each crop (after presign so plain response includes rating)
    const farmerIds = [...new Set((cropsData as any[]).map((c: any) => c.farmer?.id).filter(Boolean))] as number[];
    if (farmerIds.length > 0) {
      const ratingRows = await FarmerRating.findAll({
        attributes: [
          'farmerId',
          [Sequelize.fn('AVG', Sequelize.col('rating')), 'avg'],
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
        ],
        where: { farmerId: { [Op.in]: farmerIds } },
        group: ['farmerId'],
        raw: true
      }) as unknown as Array<{ farmerId: number; avg: number | string; count: number | string }>;
      const ratingByFarmer: Record<number, { rating: number; totalRatings: number }> = {};
      ratingRows.forEach((r: { farmerId: number; avg: number | string; count: number | string }) => {
        ratingByFarmer[r.farmerId] = {
          rating: r.avg != null ? parseFloat(String(r.avg)) : 0,
          totalRatings: r.count != null ? parseInt(String(r.count), 10) : 0
        };
      });
      (cropsData as any[]).forEach((crop: any) => {
        if (crop.farmer?.id == null) return;
        const { rating, totalRatings } = ratingByFarmer[crop.farmer.id] ?? { rating: 0, totalRatings: 0 };
        crop.farmer.rating = rating;
        crop.farmer.totalRatings = totalRatings;
        if (crop.farmer.farmerProfile && typeof crop.farmer.farmerProfile === 'object') {
          crop.farmer.farmerProfile.rating = rating;
          crop.farmer.farmerProfile.totalRatings = totalRatings;
        } else {
          crop.farmer.farmerProfile = { ...(crop.farmer.farmerProfile || {}), rating, totalRatings };
        }
      });
    }

    // Get aggregation data for filters
    const [priceRange, categoryCounts] = await Promise.all([
      // Price range
      Crop.findAll({
        attributes: [
          [Sequelize.fn('MIN', Sequelize.col('pricePerKg')), 'min'],
          [Sequelize.fn('MAX', Sequelize.col('pricePerKg')), 'max']
        ],
        where: { isActive: true },
        raw: true
      }),
      
      // Category counts
      Crop.findAll({
        attributes: [
          'category',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
        ],
        where: { isActive: true },
        group: ['category'],
        raw: true
      })
    ]);

    const priceRangeData = priceRange[0] && (priceRange[0] as any).min && (priceRange[0] as any).max
      ? {
          min: parseFloat((priceRange[0] as any).min),
          max: parseFloat((priceRange[0] as any).max)
        }
      : { min: 0, max: 100 };

    res.status(200).json({
      message: 'Crops retrieved successfully',
      crops: cropsData,
      pagination: {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / Number(limit)),
        hasNext: offset + Number(limit) < count,
        hasPrev: Number(page) > 1
      },
      filters: {
        priceRange: priceRangeData,
        categories: categoryCounts,
        totalCrops: count
      }
    });
  } catch (error) {
    console.error('Error browsing crops:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/** Get 4 random premium crops for featured section. Premium = crops marked as premium listing (isPremium). */
export const getPremiumFeaturedCrops = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(parseInt((req.query.limit as string) || '4', 10) || 4, 10);

    const crops = await Crop.findAll({
      where: { isActive: true, isAvailable: true, isPremium: true },
      include: [
        {
          model: User,
          as: 'farmer',
          required: true,
          attributes: ['id', 'firstName', 'lastName', 'email', 'isPremium'],
          include: [
            {
              model: Farmer,
              as: 'farmerProfile',
              attributes: ['farmName', 'city', 'state', 'latitude', 'longitude', 'hasVerifiedBadge', 'isBoosted'],
              required: false,
            },
          ],
        },
      ],
      order: Sequelize.literal('RANDOM()'),
      limit,
    });

    const cropsData = await s3Presign.withPresignedCropImageUrls(crops);
    const farmerIds = [...new Set((cropsData as any[]).map((c: any) => c.farmer?.id).filter(Boolean))] as number[];

    if (farmerIds.length > 0) {
      const ratingRows = await FarmerRating.findAll({
        attributes: [
          'farmerId',
          [Sequelize.fn('AVG', Sequelize.col('rating')), 'avg'],
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
        ],
        where: { farmerId: { [Op.in]: farmerIds } },
        group: ['farmerId'],
        raw: true,
      }) as unknown as Array<{ farmerId: number; avg: number | string; count: number | string }>;
      const ratingByFarmer: Record<number, { rating: number; totalRatings: number }> = {};
      ratingRows.forEach((r: { farmerId: number; avg: number | string; count: number | string }) => {
        ratingByFarmer[r.farmerId] = {
          rating: r.avg != null ? parseFloat(String(r.avg)) : 0,
          totalRatings: r.count != null ? parseInt(String(r.count), 10) : 0,
        };
      });
      (cropsData as any[]).forEach((crop: any) => {
        if (crop.farmer?.id == null) return;
        const { rating, totalRatings } = ratingByFarmer[crop.farmer.id] ?? { rating: 0, totalRatings: 0 };
        crop.farmer.rating = rating;
        crop.farmer.totalRatings = totalRatings;
        if (crop.farmer.farmerProfile && typeof crop.farmer.farmerProfile === 'object') {
          crop.farmer.farmerProfile.rating = rating;
          crop.farmer.farmerProfile.totalRatings = totalRatings;
        } else {
          crop.farmer.farmerProfile = { ...(crop.farmer.farmerProfile || {}), rating, totalRatings };
        }
      });
    }

    res.status(200).json({
      message: 'Premium featured crops retrieved',
      crops: cropsData,
    });
  } catch (error) {
    console.error('Error fetching premium featured crops:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getFarmerCropsPublic = async (req: Request, res: Response): Promise<void> => {
  try {
    const { farmerId } = req.params;
    const { page = 1, limit = 12 } = req.query;

    const whereClause: any = { 
      farmerId: parseInt(farmerId),
      isActive: true 
    };

    const offset = (Number(page) - 1) * Number(limit);

    const { count, rows: crops } = await Crop.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'farmer',
          attributes: ['id', 'firstName', 'lastName', 'email', 'isPremium'],
          include: [
            {
              model: Farmer,
              as: 'farmerProfile',
              attributes: ['farmName', 'city', 'state', 'latitude', 'longitude', 'hasVerifiedBadge', 'isBoosted'],
              required: false
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: Number(limit),
      offset,
    });

    const cropsData = await s3Presign.withPresignedCropImageUrls(crops);
    // Attach farmer rating to each crop (same as browse / getCropById)
    const farmerIds = [...new Set((cropsData as any[]).map((c: any) => c.farmer?.id).filter(Boolean))] as number[];
    if (farmerIds.length > 0) {
      const ratingRows = await FarmerRating.findAll({
        attributes: [
          'farmerId',
          [Sequelize.fn('AVG', Sequelize.col('rating')), 'avg'],
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
        ],
        where: { farmerId: { [Op.in]: farmerIds } },
        group: ['farmerId'],
        raw: true
      }) as unknown as Array<{ farmerId: number; avg: number | string; count: number | string }>;
      const ratingByFarmer: Record<number, { rating: number; totalRatings: number }> = {};
      ratingRows.forEach((r: { farmerId: number; avg: number | string; count: number | string }) => {
        ratingByFarmer[r.farmerId] = {
          rating: r.avg != null ? parseFloat(String(r.avg)) : 0,
          totalRatings: r.count != null ? parseInt(String(r.count), 10) : 0
        };
      });
      (cropsData as any[]).forEach((crop: any) => {
        if (crop.farmer?.id == null) return;
        const { rating, totalRatings } = ratingByFarmer[crop.farmer.id] ?? { rating: 0, totalRatings: 0 };
        crop.farmer.rating = rating;
        crop.farmer.totalRatings = totalRatings;
        if (crop.farmer.farmerProfile && typeof crop.farmer.farmerProfile === 'object') {
          crop.farmer.farmerProfile.rating = rating;
          crop.farmer.farmerProfile.totalRatings = totalRatings;
        } else {
          crop.farmer.farmerProfile = { ...(crop.farmer.farmerProfile || {}), rating, totalRatings };
        }
      });
    }
    res.status(200).json({
      message: 'Farmer crops retrieved successfully',
      crops: cropsData,
      pagination: {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / Number(limit)),
      }
    });
  } catch (error) {
    console.error('Error fetching farmer crops:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getCropById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const crop = await Crop.findByPk(parseInt(id), {
      include: [
        {
          model: User,
          as: 'farmer',
          attributes: ['id', 'firstName', 'lastName', 'email', 'isPremium'],
          include: [
            {
              model: Farmer,
              as: 'farmerProfile',
              attributes: [
                'id', 'farmName', 'farmDescription', 'farmLocation', 
                'latitude', 'longitude', 'address', 'city', 'state', 
                'zipCode', 'country', 'profilePhoto', 'website',
                'hasVerifiedBadge', 'isBoosted', 'phone'
              ],
              required: false
            }
          ]
        }
      ]
    });

    if (!crop) {
      res.status(404).json({ message: 'Crop not found' });
      return;
    }

    // Calculate average rating (placeholder - you can implement actual rating system)
    const averageRating = 4.5; // This would come from a ratings table
    const totalRatings = 23; // This would come from a ratings table

    // Attach farmer rating aggregate
    const ratingAgg = await FarmerRating.findAll({
      where: { farmerId: (crop as any).farmer?.id },
      attributes: [
        [Sequelize.fn('AVG', Sequelize.col('rating')), 'avg'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      raw: true
    });
    const [row] = (ratingAgg as unknown as Array<{ avg: number | string | null; count: number | string | null }>);
    const farmerAvg = row && row.avg != null ? parseFloat(String(row.avg)) : 0;
    const farmerCount = row && row.count != null ? parseInt(String(row.count)) : 0;

    const farmerJson = (crop as any).farmer?.toJSON?.() ?? (crop as any).farmer;
    const cropData = {
      ...crop.toJSON(),
      averageRating,
      totalRatings,
      farmer: {
        ...farmerJson,
        rating: farmerAvg,
        totalRatings: farmerCount,
        farmerProfile: farmerJson?.farmerProfile && typeof farmerJson.farmerProfile === 'object'
          ? { ...farmerJson.farmerProfile, rating: farmerAvg, totalRatings: farmerCount }
          : { ...(farmerJson?.farmerProfile || {}), rating: farmerAvg, totalRatings: farmerCount }
      }
    } as any;

    cropData.imageUrl = await s3Presign.getPresignedImageUrl(cropData.imageUrl) ?? cropData.imageUrl;
    res.status(200).json({
      message: 'Crop details retrieved successfully',
      crop: cropData
    });
  } catch (error) {
    console.error('Error fetching crop details:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
