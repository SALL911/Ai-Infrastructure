/**
 * BrandOS AI Infrastructure - Error Handler Middleware
 * Centralized error handling for the Express application
 */

const logger = require('../utils/logger');

/**
 * Global error handler middleware
 * Handles all errors that occur in the application
 */
const errorHandler = (error, req, res, next) => {
  // Log the error
  logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    requestId: req.headers['x-request-id'],
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  // Determine error type and status code
  let statusCode = 500;
  let errorMessage = 'Internal server error';
  let errorDetails = null;

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    errorMessage = 'Validation error';
    errorDetails = error.details;
  } else if (error.name === 'CastError') {
    statusCode = 400;
    errorMessage = 'Invalid data format';
    errorDetails = error.message;
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    errorMessage = 'Unauthorized access';
  } else if (error.name === 'ForbiddenError') {
    statusCode = 403;
    errorMessage = 'Access forbidden';
  } else if (error.name === 'NotFoundError') {
    statusCode = 404;
    errorMessage = 'Resource not found';
  } else if (error.name === 'ConflictError') {
    statusCode = 409;
    errorMessage = 'Resource conflict';
  } else if (error.name === 'TooManyRequestsError') {
    statusCode = 429;
    errorMessage = 'Too many requests';
  } else if (error.code === 'ENOENT') {
    statusCode = 404;
    errorMessage = 'Resource not found';
  } else if (error.code === 'EACCES') {
    statusCode = 403;
    errorMessage = 'Access denied';
  } else if (error.code === 'EADDRINUSE') {
    statusCode = 500;
    errorMessage = 'Server configuration error';
  }

  // Don't expose stack trace in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const errorResponse = {
    success: false,
    error: errorMessage,
    message: error.message || 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
    request_id: req.headers['x-request-id']
  };

  // Include error details in development mode
  if (isDevelopment) {
    errorResponse.details = errorDetails || error.stack;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * Async error wrapper for route handlers
 * Catches async errors and passes them to the error handler
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 handler for undefined routes
 */
const notFoundHandler = (req, res) => {
  logger.warn('Route not found:', {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    requestId: req.headers['x-request-id']
  });

  res.status(404).json({
    success: false,
    error: 'Not found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
    request_id: req.headers['x-request-id']
  });
};

module.exports = {
  errorHandler,
  asyncHandler,
  notFoundHandler
};
