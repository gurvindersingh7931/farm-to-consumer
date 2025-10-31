import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { Op } from 'sequelize';
import path from 'path';
import rateLimit from 'express-rate-limit';

// Custom validation middleware
export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.type === 'field' ? error.path : 'unknown',
        message: error.msg,
        value: error.type === 'field' ? error.value : undefined
      })),
      timestamp: new Date().toISOString()
    });
    return;
  }
  next();
};

// Sanitize input data
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Remove any potential script tags or dangerous content
  const sanitizeString = (str: string): string => {
    if (typeof str !== 'string') return str;
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  };

  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};

// Common validation rules
export const commonValidations = {
  // Email validation
  email: body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),

  // Password validation
  password: body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

  // Name validation
  firstName: body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),

  lastName: body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),

  // Phone validation
  phone: body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),

  // Farm name validation
  farmName: body('farmName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Farm name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-'&.,()]+$/)
    .withMessage('Farm name contains invalid characters'),

  // Location validation
  farmLocation: body('farmLocation')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Farm location must be between 5 and 200 characters'),

  city: body('city')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('City must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s\-']+$/)
    .withMessage('City can only contain letters, spaces, and hyphens'),

  state: body('state')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('State must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s\-']+$/)
    .withMessage('State can only contain letters, spaces, and hyphens'),

  // Coordinates validation
  latitude: body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),

  longitude: body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),

  // Crop validation
  cropName: body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Crop name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-'&.,()]+$/)
    .withMessage('Crop name contains invalid characters'),

  cropDescription: body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),

  category: body('category')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Category must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s\-']+$/)
    .withMessage('Category can only contain letters, spaces, and hyphens'),

  pricePerKg: body('pricePerKg')
    .isFloat({ min: 0.01, max: 10000 })
    .withMessage('Price must be between 0.01 and 10,000'),

  quantity: body('quantity')
    .isFloat({ min: 0.01, max: 10000 })
    .withMessage('Quantity must be between 0.01 and 10,000'),

  unit: body('unit')
    .isIn(['kg', 'g', 'lb', 'oz', 'piece', 'dozen', 'bunch', 'bag'])
    .withMessage('Unit must be one of: kg, g, lb, oz, piece, dozen, bunch, bag'),

  // Date validation
  harvestDate: body('harvestDate')
    .optional()
    .isISO8601()
    .withMessage('Harvest date must be a valid date')
    .custom((value) => {
      if (value && new Date(value) > new Date()) {
        throw new Error('Harvest date cannot be in the future');
      }
      return true;
    }),

  expiryDate: body('expiryDate')
    .optional()
    .isISO8601()
    .withMessage('Expiry date must be a valid date')
    .custom((value) => {
      if (value && new Date(value) < new Date()) {
        throw new Error('Expiry date cannot be in the past');
      }
      return true;
    }),

  // Pagination validation
  page: query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Page must be between 1 and 1000'),

  limit: query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  // Search validation
  search: query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-'&.,()]+$/)
    .withMessage('Search term contains invalid characters'),

  // ID validation
  id: param('id')
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer'),

  // Radius validation
  radius: query('radius')
    .optional()
    .isFloat({ min: 0.1, max: 1000 })
    .withMessage('Radius must be between 0.1 and 1000 kilometers'),

  // Rating validation
  rating: body('rating')
    .optional()
    .isFloat({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),

  // Order quantity validation
  orderQuantity: body('quantity')
    .isFloat({ min: 0.01, max: 1000 })
    .withMessage('Order quantity must be between 0.01 and 1000'),

  // Website validation
  website: body('website')
    .optional()
    .isURL({ protocols: ['http', 'https'] })
    .withMessage('Website must be a valid URL'),

  // Farm description validation
  farmDescription: body('farmDescription')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Farm description must not exceed 2000 characters')
};

// SQL injection protection for dynamic queries
export const sanitizeQuery = (query: any): any => {
  if (typeof query === 'string') {
    // Remove potential SQL injection patterns
    return query
      .replace(/('|;|--)/g, '')
      .replace(/union\s+select/gi, '')
      .replace(/drop\s+table/gi, '')
      .replace(/delete\s+from/gi, '')
      .replace(/insert\s+into/gi, '')
      .replace(/update\s+set/gi, '')
      .replace(/exec\s*\(/gi, '')
      .replace(/script\s*>/gi, '')
      .trim();
  }
  
  if (Array.isArray(query)) {
    return query.map(sanitizeQuery);
  }
  
  if (query && typeof query === 'object') {
    const sanitized: any = {};
    for (const key in query) {
      if (query.hasOwnProperty(key)) {
        sanitized[key] = sanitizeQuery(query[key]);
      }
    }
    return sanitized;
  }
  
  return query;
};

// Validate file uploads
export const validateFileUpload = (req: Request, res: Response, next: NextFunction) => {
  if (!req.file && !req.files) {
    return next();
  }

  const file = req.file || (req.files as any)?.[0];
  if (!file) {
    return next();
  }

  // Check file size (5MB limit)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return res.status(400).json({
      message: 'File size exceeds 5MB limit',
      timestamp: new Date().toISOString()
    });
  }

  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.mimetype)) {
    return res.status(400).json({
      message: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed',
      timestamp: new Date().toISOString()
    });
  }

  // Check file extension
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(fileExtension)) {
    return res.status(400).json({
      message: 'Invalid file extension',
      timestamp: new Date().toISOString()
    });
  }

  next();
};

// Rate limiting for specific endpoints
export const createRateLimit = (windowMs: number, max: number, message?: string) => {
  return rateLimit({
    windowMs,
    max,
    message: message || 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false
  });
};

// Authentication rate limiting
export const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts per window
  'Too many authentication attempts, please try again in 15 minutes'
);

// File upload rate limiting
export const uploadRateLimit = createRateLimit(
  60 * 1000, // 1 minute
  10, // 10 uploads per minute
  'Too many file uploads, please try again in a minute'
);

// Search rate limiting
export const searchRateLimit = createRateLimit(
  60 * 1000, // 1 minute
  30, // 30 searches per minute
  'Too many search requests, please try again in a minute'
);

export default {
  validateRequest,
  sanitizeInput,
  commonValidations,
  sanitizeQuery,
  validateFileUpload,
  createRateLimit,
  authRateLimit,
  uploadRateLimit,
  searchRateLimit
};
