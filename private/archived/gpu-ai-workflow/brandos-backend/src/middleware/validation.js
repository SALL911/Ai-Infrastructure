/**
 * BrandOS AI Infrastructure - Validation Middleware
 * Express middleware for request validation using express-validator
 */

const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

/**
 * Validation middleware that checks for validation errors
 * If errors exist, returns a 400 response with error details
 * If no errors, calls next() to continue the request chain
 */
const validateRequest = (req, res, next) => {
  try {
    // Get validation results from express-validator
    const errors = validationResult(req);
    
    // If there are validation errors, return error response
    if (!errors.isEmpty()) {
      const errorDetails = errors.array().map(error => ({
        field: error.path || error.param,
        message: error.msg,
        value: error.value,
        location: error.location
      }));

      logger.warn('Validation failed:', {
        errors: errorDetails,
        requestId: req.headers['x-request-id'],
        url: req.originalUrl,
        method: req.method
      });

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Request validation failed',
        details: errorDetails,
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id']
      });
    }

    // If no errors, continue to next middleware
    next();

  } catch (error) {
    logger.error('Validation middleware error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Validation error',
      message: 'Internal validation error',
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id']
    });
  }
};

/**
 * Custom validation for brand score input data
 * Validates the complete data structure for brand scoring
 */
const validateBrandScoreInput = (req, res, next) => {
  try {
    const { brand, esg, carbon, tnfd } = req.body;
    const errors = [];

    // Validate brand component
    if (!brand || typeof brand !== 'object') {
      errors.push({
        field: 'brand',
        message: 'Brand component is required and must be an object'
      });
    } else {
      // Check brand fields
      if (typeof brand.mentions !== 'number') {
        errors.push({
          field: 'brand.mentions',
          message: 'Brand mentions must be a number'
        });
      }
      if (typeof brand.sentiment !== 'number' || brand.sentiment < -1 || brand.sentiment > 1) {
        errors.push({
          field: 'brand.sentiment',
          message: 'Brand sentiment must be a number between -1 and 1'
        });
      }
      if (typeof brand.nps !== 'number' || brand.nps < -100 || brand.nps > 100) {
        errors.push({
          field: 'brand.nps',
          message: 'Brand NPS must be a number between -100 and 100'
        });
      }
    }

    // Validate ESG component
    if (!esg || typeof esg !== 'object') {
      errors.push({
        field: 'esg',
        message: 'ESG component is required and must be an object'
      });
    } else {
      // Check ESG fields
      ['e', 's', 'g'].forEach(factor => {
        if (typeof esg[factor] !== 'number' || esg[factor] < 0 || esg[factor] > 100) {
          errors.push({
            field: `esg.${factor}`,
            message: `ESG ${factor.toUpperCase()} score must be a number between 0 and 100`
          });
        }
      });
    }

    // Validate carbon component
    if (!carbon || typeof carbon !== 'object') {
      errors.push({
        field: 'carbon',
        message: 'Carbon component is required and must be an object'
      });
    } else {
      if (typeof carbon.total_emission !== 'number' || carbon.total_emission < 0) {
        errors.push({
          field: 'carbon.total_emission',
          message: 'Carbon total emission must be a non-negative number'
        });
      }
    }

    // Validate TNFD component
    if (!tnfd || typeof tnfd !== 'object') {
      errors.push({
        field: 'tnfd',
        message: 'TNFD component is required and must be an object'
      });
    } else {
      // Check TNFD fields
      ['dependency', 'impact', 'risk'].forEach(factor => {
        if (typeof tnfd[factor] !== 'number' || tnfd[factor] < 0 || tnfd[factor] > 1) {
          errors.push({
            field: `tnfd.${factor}`,
            message: `TNFD ${factor} must be a number between 0 and 1`
          });
        }
      });
    }

    // If there are errors, return error response
    if (errors.length > 0) {
      logger.warn('Custom validation failed:', {
        errors,
        requestId: req.headers['x-request-id'],
        url: req.originalUrl,
        method: req.method
      });

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Input data validation failed',
        details: errors,
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id']
      });
    }

    // If no errors, continue to next middleware
    next();

  } catch (error) {
    logger.error('Custom validation middleware error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Validation error',
      message: 'Internal validation error',
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id']
    });
  }
};

/**
 * UUID validation middleware
 * Validates that a parameter is a valid UUID v4
 */
const validateUUID = (paramName) => {
  return (req, res, next) => {
    try {
      const value = req.params[paramName];
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      if (!value || !uuidRegex.test(value)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid parameter',
          message: `${paramName} must be a valid UUID v4`,
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        });
      }

      next();

    } catch (error) {
      logger.error('UUID validation error:', error);
      
      return res.status(500).json({
        success: false,
        error: 'Validation error',
        message: 'Internal validation error',
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id']
      });
    }
  };
};

/**
 * Query parameter validation middleware
 * Validates common query parameters like limit, offset, grade
 */
const validateQueryParams = (req, res, next) => {
  try {
    const { limit, offset, grade } = req.query;
    const errors = [];

    // Validate limit
    if (limit !== undefined) {
      const limitNum = parseInt(limit);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        errors.push({
          field: 'limit',
          message: 'Limit must be a number between 1 and 100'
        });
      }
    }

    // Validate offset
    if (offset !== undefined) {
      const offsetNum = parseInt(offset);
      if (isNaN(offsetNum) || offsetNum < 0) {
        errors.push({
          field: 'offset',
          message: 'Offset must be a non-negative number'
        });
      }
    }

    // Validate grade
    if (grade !== undefined) {
      const validGrades = ['AAA', 'AA', 'A', 'BBB', 'Risk'];
      if (!validGrades.includes(grade)) {
        errors.push({
          field: 'grade',
          message: `Grade must be one of: ${validGrades.join(', ')}`
        });
      }
    }

    // If there are errors, return error response
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        message: 'Query parameter validation failed',
        details: errors,
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id']
      });
    }

    // Convert string parameters to numbers
    if (limit) req.query.limit = parseInt(limit);
    if (offset) req.query.offset = parseInt(offset);

    next();

  } catch (error) {
    logger.error('Query validation error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Validation error',
      message: 'Internal validation error',
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id']
    });
  }
};

module.exports = {
  validateRequest,
  validateBrandScoreInput,
  validateUUID,
  validateQueryParams
};
