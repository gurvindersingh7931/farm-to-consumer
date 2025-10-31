import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { StringValue } from 'ms';
import { trackFailedAttempt, clearFailedAttempts, revokeToken } from '../middleware/auth';
import { User } from '../models';

interface RegisterRequest extends Request {
  body: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: 'farmer' | 'consumer' | 'admin';
  };
}

interface LoginRequest extends Request {
  body: {
    email: string;
    password: string;
  };
}

// Password strength validation
const validatePasswordStrength = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[@$!%*?&]/.test(password)) {
    errors.push('Password must contain at least one special character (@$!%*?&)');
  }
  
  // Check for common passwords
  const commonPasswords = ['password', '123456', 'qwerty', 'abc123', 'password123'];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common, please choose a stronger password');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Email validation
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && email.length <= 254;
};

export const register = async (req: RegisterRequest, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName, role = 'consumer' } = req.body;

    // Validate email format
    if (!validateEmail(email)) {
      res.status(400).json({ 
        message: 'Invalid email format',
        code: 'INVALID_EMAIL',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      res.status(400).json({ 
        message: 'Password does not meet security requirements',
        code: 'WEAK_PASSWORD',
        errors: passwordValidation.errors,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      res.status(400).json({ 
        message: 'User already exists with this email',
        code: 'USER_EXISTS',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Hash password with high salt rounds
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role,
      isActive: true
    });

    // Generate JWT token with secure options
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

    const options: SignOptions = { 
      expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as StringValue,
      issuer: process.env.JWT_ISSUER || 'farm-to-consumer-api',
      audience: process.env.JWT_AUDIENCE || 'farm-to-consumer-app'
    };

    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role,
        iat: Math.floor(Date.now() / 1000)
      }, 
      jwtSecret, 
      options
    );

    // Clear any failed attempts for this IP
    clearFailedAttempts(req);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isPremium: user.isPremium
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      code: 'REGISTRATION_ERROR',
      timestamp: new Date().toISOString()
    });
  }
};

export const login = async (req: LoginRequest, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validate email format
    if (!validateEmail(email)) {
      trackFailedAttempt(req);
      res.status(400).json({ 
        message: 'Invalid email format',
        code: 'INVALID_EMAIL',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Find user by email (case-insensitive)
    const user = await User.findOne({ 
      where: { email: email.toLowerCase() },
      attributes: ['id', 'email', 'password', 'firstName', 'lastName', 'role', 'isActive', 'isPremium', 'suspendedUntil']
    });

    if (!user) {
      trackFailedAttempt(req);
      res.status(401).json({ 
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Check if account is active
    if (!user.isActive) {
      trackFailedAttempt(req);
      res.status(401).json({ 
        message: 'Account is deactivated',
        code: 'ACCOUNT_DEACTIVATED',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Check if account is suspended
    if (user.suspendedUntil && new Date(user.suspendedUntil) > new Date()) {
      trackFailedAttempt(req);
      res.status(401).json({ 
        message: 'Account is suspended',
        code: 'ACCOUNT_SUSPENDED',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      trackFailedAttempt(req);
      res.status(401).json({ 
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Clear failed attempts on successful login
    clearFailedAttempts(req);

    // Generate JWT token
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

    const options: SignOptions = { 
      expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as StringValue,
      issuer: process.env.JWT_ISSUER || 'farm-to-consumer-api',
      audience: process.env.JWT_AUDIENCE || 'farm-to-consumer-app'
    };

    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role,
        iat: Math.floor(Date.now() / 1000)
      }, 
      jwtSecret, 
      options
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isPremium: user.isPremium
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Login error:', error);
    trackFailedAttempt(req);
    res.status(500).json({ 
      message: 'Internal server error',
      code: 'LOGIN_ERROR',
      timestamp: new Date().toISOString()
    });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
      // Revoke the token
      revokeToken(token);
    }

    res.status(200).json({
      message: 'Logout successful',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      code: 'LOGOUT_ERROR',
      timestamp: new Date().toISOString()
    });
  }
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      res.status(401).json({ 
        message: 'Token required for refresh',
        code: 'MISSING_TOKEN',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      res.status(500).json({ 
        message: 'Server configuration error',
        code: 'CONFIG_ERROR',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Verify the existing token
    const decoded = jwt.verify(token, jwtSecret) as any;
    const user = await User.findByPk(decoded.userId);
    
    if (!user || !user.isActive) {
      res.status(401).json({ 
        message: 'Invalid token or user not found',
        code: 'INVALID_TOKEN',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Generate new token
    const options: SignOptions = { 
      expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as StringValue,
      issuer: process.env.JWT_ISSUER || 'farm-to-consumer-api',
      audience: process.env.JWT_AUDIENCE || 'farm-to-consumer-app'
    };

    const newToken = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role,
        iat: Math.floor(Date.now() / 1000)
      }, 
      jwtSecret, 
      options
    );

    // Revoke old token
    revokeToken(token);

    res.status(200).json({
      message: 'Token refreshed successfully',
      token: newToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isPremium: user.isPremium
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ 
      message: 'Invalid or expired token',
      code: 'INVALID_TOKEN',
      timestamp: new Date().toISOString()
    });
  }
};

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ 
        message: 'Unauthorized',
        code: 'UNAUTHORIZED',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const user = await User.findByPk(userId, {
      attributes: ['id', 'email', 'firstName', 'lastName', 'role', 'isPremium']
    });

    if (!user) {
      res.status(404).json({ 
        message: 'User not found',
        code: 'USER_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
      return;
    }

    res.status(200).json({
      message: 'Profile fetched successfully',
      user,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      code: 'PROFILE_ERROR',
      timestamp: new Date().toISOString()
    });
  }
};