/**
 * Authentication Middleware
 * JWT token verification and user authentication
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

// JWT Secret (should be in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

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
 * Middleware to check admin privileges
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'Admin privileges required',
      timestamp: new Date().toISOString()
    });
  }
  next();
};

/**
 * Generate JWT token
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      brand_id: user.brand_id,
      isAdmin: user.isAdmin || false,
      permissions: user.permissions || []
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
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
 * Middleware to verify brand DID
 */
const verifyBrandDID = (req, res, next) => {
  const brandDID = req.headers['x-brand-did'];
  
  if (!brandDID) {
    return res.status(400).json({
      success: false,
      error: 'Brand DID required',
      message: 'X-Brand-DID header is required',
      timestamp: new Date().toISOString()
    });
  }

  // Basic DID format validation
  const didPattern = /^did:brand:[a-z]{2}:[a-zA-Z0-9-]+$/;
  if (!didPattern.test(brandDID)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid Brand DID format',
      message: 'Brand DID must follow format: did:brand:country:unique-id',
      timestamp: new Date().toISOString()
    });
  }

  req.brandDID = brandDID;
  next();
};

/**
 * Middleware to check specific permissions
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user || !req.user.permissions || !req.user.permissions.includes(permission)) {
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
 * Middleware to rate limit by user
 */
const userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const userRequests = new Map();

  return (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const userId = req.user.id;
    const now = Date.now();
    const userWindow = userRequests.get(userId) || { count: 0, resetTime: now + windowMs };

    if (now > userWindow.resetTime) {
      userWindow.count = 0;
      userWindow.resetTime = now + windowMs;
    }

    userWindow.count++;
    userRequests.set(userId, userWindow);

    if (userWindow.count > maxRequests) {
      const resetIn = Math.ceil((userWindow.resetTime - now) / 1000);
      
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: `Too many requests. Please try again in ${resetIn} seconds.`,
        reset_in: resetIn,
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

/**
 * Middleware to validate API key
 */
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key required',
      message: 'X-API-Key header is required',
      timestamp: new Date().toISOString()
    });
  }

  // In a real implementation, you would validate against a database
  const validApiKeys = process.env.VALID_API_KEYS ? 
    process.env.VALID_API_KEYS.split(',') : 
    ['demo-api-key-12345'];

  if (!validApiKeys.includes(apiKey)) {
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

module.exports = {
  authenticateToken,
  requireAdmin,
  generateToken,
  hashPassword,
  comparePassword,
  verifyBrandDID,
  requirePermission,
  userRateLimit,
  validateApiKey
};
