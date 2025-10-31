import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export const authenticateJWT = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ message: 'Access token required' });
    return;
  }

  try {
    // Validate JWT_SECRET is configured - CRITICAL: Never use fallback secrets in production
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET not configured - authentication disabled for security');
      res.status(500).json({ message: 'Server configuration error: JWT secret not configured' });
      return;
    }
    
    const decoded = jwt.verify(token, jwtSecret) as any;
    const user = await User.findByPk(decoded.userId);
    
    if (!user || !user.isActive) {
      res.status(401).json({ message: 'Invalid token or user not found' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(403).json({ message: 'Invalid or expired token' });
    return;
  }
};

export const authorizeRoles = (roles: string | string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const roleArray = Array.isArray(roles) ? roles : [roles];
    if (!roleArray.includes(req.user.role)) {
      res.status(403).json({ message: 'Insufficient permissions' });
      return;
    }

    next();
  };
};
