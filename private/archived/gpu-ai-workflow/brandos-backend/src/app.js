/**
 * BrandOS AI Infrastructure - Main Application
 * Production-ready Brand Scoring Backend System
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import custom modules
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const brandScoreRoutes = require('./routes/brandScore');
const brandScoreExtendedRoutes = require('./routes/brandScoreExtended');
const database = require('./config/database');
const { logAPIUsage, validateExternalAccess } = require('./middleware/auth');

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX || 1000, // limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// API usage logging and external access validation
app.use(logAPIUsage);
app.use(validateExternalAccess);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const databaseStatus = database.getStatus();
    const databaseHealth = await database.healthCheck();
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: {
        ...databaseStatus,
        health: databaseHealth
      }
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    title: 'BrandOS AI Infrastructure API',
    version: 'v1',
    description: 'Production-ready Brand Scoring System',
    baseUrl: `${req.protocol}://${req.get('host')}/api`,
    endpoints: {
      calculate: '/api/brand-score/calculate',
      retrieve: '/api/brand-score/:id',
      ranking: '/api/brand-score/ranking',
      history: '/api/brand-score/:brandId/history',
      trends: '/api/brand-score/trends',
      compliance: '/api/brand-score/compliance',
      search: '/api/brand-score/search',
      export: '/api/brand-score/export',
      health: '/health'
    },
    documentation: `${req.protocol}://${req.get('host')}/api/docs`,
    health: `${req.protocol}://${req.get('host')}/health`
  });
});

// API routes
app.use('/api/brand-score', brandScoreRoutes);
app.use('/api/brand-score', brandScoreExtendedRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id']
  });
});

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Unhandled promise rejection
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Uncaught exception
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Initialize storage and start server
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

async function startServer() {
  try {
    // Initialize database
    await database.connect();
    logger.info('Database connected successfully');

    // Create database indexes
    await database.createIndexes();
    logger.info('Database indexes created successfully');

    // Start server
    const server = app.listen(PORT, HOST, () => {
      logger.info(`BrandOS Scoring API running on ${HOST}:${PORT}`);
      logger.info(`API Documentation: http://${HOST}:${PORT}/api`);
      logger.info(`Health Check: http://${HOST}:${PORT}/health`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.syscall !== 'listen') {
        throw error;
      }

      const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;

      switch (error.code) {
        case 'EACCES':
          logger.error(`${bind} requires elevated privileges`);
          process.exit(1);
          break;
        case 'EADDRINUSE':
          logger.error(`${bind} is already in use`);
          process.exit(1);
          break;
        default:
          throw error;
      }
    });

    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app;
