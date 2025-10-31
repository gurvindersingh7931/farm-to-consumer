import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
// NOTE: express-mongo-sanitize causes issues with Express v5's req.query getter.
// Remove for now; consider replacing with a safer query sanitizer.
import hpp from 'hpp';
import compression from 'compression';
import routes from './routes';
import { registerSwagger } from './config/swagger';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for accurate IP addresses (important for rate limiting)
app.set('trust proxy', 1);

// Security middleware - Helmet with enhanced configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/api/health' || req.path === '/health';
  }
});

// Speed limiter for additional protection
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50,
  // New v2 behaviour: constant 500ms delay once over delayAfter
  delayMs: () => 500,
  // Silence deprecation warning validation
  validate: { delayMs: false }
});

// Apply rate limiting
app.use('/api', limiter);
app.use('/api', speedLimiter);

// CORS configuration with enhanced security
const corsOptions = {
  origin: function (origin: string | undefined, callback: Function) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:4200',
      'http://localhost:4201',
      'https://localhost:4200',
      'https://localhost:4201',
      process.env.FRONTEND_URL,
      process.env.PRODUCTION_FRONTEND_URL
    ].filter(Boolean);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// Compression middleware
app.use(compression());

// Logging middleware with security considerations
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined', {
    skip: (req, res) => {
      // Skip logging for health checks and static files
      return req.path === '/health' || req.path.startsWith('/uploads/');
    }
  }));
} else {
  app.use(morgan('dev'));
}

// Body parsing middleware with size limits
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // Store raw body for signature verification if needed
    (req as any).rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 1000 // Limit number of parameters
}));

// Data sanitization middleware


// HTTP Parameter Pollution protection
app.use(hpp());

// Static file serving with security headers
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads'), {
  maxAge: '1d',
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    // Set security headers for static files
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    // Allow cross-origin image loads
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Only allow images
    if (path.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    } else {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

app.use('/public', express.static(path.join(__dirname, '../public'), {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Routes
app.use('/api', routes);

// API Docs
registerSwagger(app);

// Security headers middleware for all responses
app.use((req, res, next) => {
  // Additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  next();
});

// Error handling middleware with security considerations
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Log error details (but don't expose sensitive info)
  console.error('Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(isDevelopment && { 
      stack: err.stack,
      details: err.details 
    }),
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || 'unknown'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    message: 'Route not found',
    timestamp: new Date().toISOString(),
    path: req.path
  });
});

export default app;