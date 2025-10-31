import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { Op } from 'sequelize';

interface AuthRequest extends Request {
  user?: any;
  token?: string;
}

// Token blacklist to track revoked tokens
const tokenBlacklist = new Set<string>();

// Track failed login attempts
const failedAttempts = new Map<string, { count: number; lastAttempt: Date }>();

// Clean up old failed attempts (older than 1 hour)
setInterval(() => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  for (const [ip, data] of failedAttempts.entries()) {
    if (data.lastAttempt < oneHourAgo) {
      failedAttempts.delete(ip);
    }
  }
}, 60 * 60 * 1000); // Run every hour

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({ 
        message: 'Access token required',
        code: 'MISSING_TOKEN',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Check if token is blacklisted
    if (tokenBlacklist.has(token)) {
      res.status(401).json({ 
        message: 'Token has been revoked',
        code: 'TOKEN_REVOKED',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET not configured');
      res.status(500).json({ 
        message: 'Server configuration error',
        code: 'CONFIG_ERROR',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const decoded = jwt.verify(token, jwtSecret) as any;
    
    // Validate token structure
    if (!decoded.userId || !decoded.iat || !decoded.exp) {
      res.status(401).json({ 
        message: 'Invalid token structure',
        code: 'INVALID_TOKEN',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Check if token is too old (more than 7 days)
    const tokenAge = Date.now() - (decoded.iat * 1000);
    const maxTokenAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    if (tokenAge > maxTokenAge) {
      res.status(401).json({ 
        message: 'Token too old, please re-authenticate',
        code: 'TOKEN_EXPIRED',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const user = await User.findByPk(decoded.userId, {
      attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'isActive', 'isPremium', 'lastLoginAt']
    });
    
    if (!user) {
      res.status(401).json({ 
        message: 'User not found',
        code: 'USER_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({ 
        message: 'Account is deactivated',
        code: 'ACCOUNT_DEACTIVATED',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Check if user has been suspended
    if (user.suspendedUntil && new Date(user.suspendedUntil) > new Date()) {
      res.status(401).json({ 
        message: 'Account is suspended',
        code: 'ACCOUNT_SUSPENDED',
        timestamp: new Date().toISOString()
      });
      return;
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ 
        message: 'Invalid token',
        code: 'INVALID_TOKEN',
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ 
        message: 'Token expired',
        code: 'TOKEN_EXPIRED',
        timestamp: new Date().toISOString()
      });
      return;
    }

    console.error('Authentication error:', error);
    res.status(500).json({ 
      message: 'Authentication error',
      code: 'AUTH_ERROR',
      timestamp: new Date().toISOString()
    });
    return;
  }
};

export const requireRole = (roles: string | string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ 
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const roleArray = Array.isArray(roles) ? roles : [roles];
    if (!roleArray.includes(req.user.role)) {
      res.status(403).json({ 
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        timestamp: new Date().toISOString()
      });
      return;
    }

    next();
  };
};

// Rate limiting for authentication endpoints
export const authRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = new Date();
  
  const attempts = failedAttempts.get(ip);
  if (attempts) {
    const timeDiff = now.getTime() - attempts.lastAttempt.getTime();
    const resetTime = 15 * 60 * 1000; // 15 minutes
    
    if (attempts.count >= 5 && timeDiff < resetTime) {
      res.status(429).json({
        message: 'Too many failed login attempts. Please try again later.',
        code: 'RATE_LIMITED',
        retryAfter: Math.ceil((resetTime - timeDiff) / 1000),
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    if (timeDiff >= resetTime) {
      failedAttempts.delete(ip);
    }
  }
  
  next();
};

// Track failed login attempt
export const trackFailedAttempt = (req: Request): void => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const attempts = failedAttempts.get(ip);
  
  if (attempts) {
    attempts.count++;
    attempts.lastAttempt = new Date();
  } else {
    failedAttempts.set(ip, { count: 1, lastAttempt: new Date() });
  }
};

// Clear failed attempts on successful login
export const clearFailedAttempts = (req: Request): void => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  failedAttempts.delete(ip);
};

// Revoke token (for logout)
export const revokeToken = (token: string): void => {
  tokenBlacklist.add(token);
  
  // Clean up old tokens from blacklist (older than 24 hours)
  setTimeout(() => {
    tokenBlacklist.delete(token);
  }, 24 * 60 * 60 * 1000);
};

// Check if user owns resource or is admin
export const requireOwnershipOrAdmin = (resourceUserIdField: string = 'userId') => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ 
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Admin can access any resource
    if (req.user.role === 'admin') {
      next();
      return;
    }

    // Check if user owns the resource
    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    if (resourceUserId && parseInt(resourceUserId) === req.user.id) {
      next();
      return;
    }

    res.status(403).json({ 
      message: 'Access denied. You can only access your own resources.',
      code: 'ACCESS_DENIED',
      timestamp: new Date().toISOString()
    });
  };
};

// Validate JWT token format
export const validateTokenFormat = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    res.status(401).json({ 
      message: 'Authorization header required',
      code: 'MISSING_AUTH_HEADER',
      timestamp: new Date().toISOString()
    });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({ 
      message: 'Invalid authorization header format. Use "Bearer <token>"',
      code: 'INVALID_AUTH_FORMAT',
      timestamp: new Date().toISOString()
    });
    return;
  }

  const token = parts[1];
  if (!token || token.length < 10) {
    res.status(401).json({ 
      message: 'Invalid token format',
      code: 'INVALID_TOKEN_FORMAT',
      timestamp: new Date().toISOString()
    });
    return;
  }

  next();
};

export default {
  authenticateToken,
  requireRole,
  authRateLimit,
  trackFailedAttempt,
  clearFailedAttempts,
  revokeToken,
  requireOwnershipOrAdmin,
  validateTokenFormat
};