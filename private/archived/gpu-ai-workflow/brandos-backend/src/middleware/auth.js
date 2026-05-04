/**
 * BrandOS AI Infrastructure - Authentication Middleware
 * JWT and API key authentication for external integration
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

// JWT Secret (should be in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// API Keys for external integration
const API_KEYS = process.env.API_KEYS ? process.env.API_KEYS.split(',') : [
  'brandos-api-key-2026',
  'external-partner-key-001',
  'integration-test-key'
];

/**
 * Middleware to authenticate JWT token
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access denied',
      message: 'No token provided',
      timestamp: new Date().toISOString()
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      logger.warn('JWT verification failed:', err.message);
      return res.status(403).json({
        success: false,
        error: 'Invalid token',
        message: 'Token verification failed',
        timestamp: new Date().toISOString()
      });
    }

    req.user = user;
    next();
  });
};

/**
 * Middleware to authenticate API key
 */
const authenticateAPI = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key required',
      message: 'X-API-Key header is required',
      timestamp: new Date().toISOString()
    });
  }

  if (!API_KEYS.includes(apiKey)) {
    logger.warn('Invalid API key used:', apiKey.substring(0, 8) + '...');
    return res.status(401).json({
      success: false,
      error: 'Invalid API key',
      message: 'The provided API key is invalid',
      timestamp: new Date().toISOString()
    });
  }

  req.apiKey = apiKey;
  next();
};

/**
 * Middleware to authenticate either JWT token or API key
 */
const authenticateEither = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const apiKey = req.headers['x-api-key'];

  // Try JWT authentication first
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        req.authMethod = 'jwt';
        return next();
      } catch (err) {
        // JWT failed, continue to API key check
      }
    }
  }

  // Try API key authentication
  if (apiKey && API_KEYS.includes(apiKey)) {
    req.apiKey = apiKey;
    req.authMethod = 'api_key';
    return next();
  }

  // Neither authentication method succeeded
  return res.status(401).json({
    success: false,
    error: 'Authentication required',
    message: 'Either JWT token or API key is required',
    timestamp: new Date().toISOString()
  });
};

/**
 * Middleware to check user role/permissions
 */
const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'User not authenticated',
        timestamp: new Date().toISOString()
      });
    }

    if (req.user.role !== role && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: `Role '${role}' required`,
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

/**
 * Middleware to check specific permission
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'User not authenticated',
        timestamp: new Date().toISOString()
      });
    }

    if (!req.user.permissions || !req.user.permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: `Permission '${permission}' required`,
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

/**
 * Rate limiting middleware for API keys
 */
const apiKeyRateLimit = (maxRequests = 1000, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();

  return (req, res, next) => {
    if (!req.apiKey) {
      return next(); // Skip if not using API key authentication
    }

    const apiKey = req.apiKey;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get existing requests for this API key
    let keyRequests = requests.get(apiKey) || [];
    
    // Filter out old requests outside the window
    keyRequests = keyRequests.filter(timestamp => timestamp > windowStart);
    
    // Add current request
    keyRequests.push(now);
    
    // Check if limit exceeded
    if (keyRequests.length > maxRequests) {
      const resetTime = Math.ceil((keyRequests[0] + windowMs - now) / 1000);
      
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: `Too many requests. Please try again in ${resetTime} seconds.`,
        reset_in: resetTime,
        timestamp: new Date().toISOString()
      });
    }

    // Update requests map
    requests.set(apiKey, keyRequests);
    
    // Clean up old entries periodically
    if (Math.random() < 0.01) { // 1% chance to clean up
      for (const [key, timestamps] of requests.entries()) {
        if (timestamps[0] < windowStart) {
          requests.delete(key);
        }
      }
    }

    next();
  };
};

/**
 * Generate JWT token
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role || 'user',
      permissions: user.permissions || []
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

/**
 * Verify JWT token
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

/**
 * Hash password
 */
const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Compare password
 */
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

/**
 * Middleware to log API usage
 */
const logAPIUsage = (req, res, next) => {
  const startTime = Date.now();
  
  // Log request
  logger.info('API Request:', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    authMethod: req.authMethod || 'none',
    apiKey: req.apiKey ? req.apiKey.substring(0, 8) + '...' : null,
    userId: req.user?.id
  });

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(data) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    logger.info('API Response:', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: responseTime,
      authMethod: req.authMethod || 'none',
      success: data.success
    });

    return originalJson.call(this, data);
  };

  next();
};

/**
 * Middleware to validate external API access
 */
const validateExternalAccess = (req, res, next) => {
  // Check if request is from external source
  const userAgent = req.headers['user-agent'] || '';
  const origin = req.headers['origin'] || '';
  
  // List of allowed external origins (can be configured via environment)
  const allowedOrigins = process.env.ALLOWED_EXTERNAL_ORIGINS 
    ? process.env.ALLOWED_EXTERNAL_ORIGINS.split(',') 
    : [];

  // If origin is specified and not in allowed list, block request
  if (origin && allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) {
    logger.warn('External access blocked:', { origin, userAgent });
    
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'External access not allowed from this origin',
      timestamp: new Date().toISOString()
    });
  }

  // Add external access metadata
  req.isExternal = origin && origin !== req.headers['host'];
  
  next();
};

module.exports = {
  authenticateToken,
  authenticateAPI,
  authenticateEither,
  requireRole,
  requirePermission,
  apiKeyRateLimit,
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
  logAPIUsage,
  validateExternalAccess
};
