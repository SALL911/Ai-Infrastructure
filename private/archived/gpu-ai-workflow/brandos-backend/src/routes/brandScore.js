/**
 * BrandOS AI Infrastructure - Brand Score API Routes
 * RESTful endpoints for brand score calculation and retrieval
 */

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const BrandScoreEngine = require('../scoring/brandScoreEngine');
const storage = require('../utils/storage');
const logger = require('../utils/logger');
const { validateRequest } = require('../middleware/validation');

const router = express.Router();
const scoreEngine = new BrandScoreEngine();

/**
 * @route   POST /api/brand-score/calculate
 * @desc    Calculate comprehensive brand score
 * @access  Public
 * @input   JSON with brand, esg, carbon, tnfd data
 * @output  Score result with breakdown and verification
 */
router.post('/calculate', [
  // Input validation middleware
  body('brand.mentions').isNumeric().withMessage('Brand mentions must be numeric'),
  body('brand.sentiment').isFloat({ min: -1, max: 1 }).withMessage('Brand sentiment must be between -1 and 1'),
  body('brand.nps').isInt({ min: -100, max: 100 }).withMessage('Brand NPS must be between -100 and 100'),
  
  body('esg.e').isFloat({ min: 0, max: 100 }).withMessage('ESG Environmental score must be between 0 and 100'),
  body('esg.s').isFloat({ min: 0, max: 100 }).withMessage('ESG Social score must be between 0 and 100'),
  body('esg.g').isFloat({ min: 0, max: 100 }).withMessage('ESG Governance score must be between 0 and 100'),
  
  body('carbon.total_emission').isFloat({ min: 0 }).withMessage('Carbon total emission must be a non-negative number'),
  
  body('tnfd.dependency').isFloat({ min: 0, max: 1 }).withMessage('TNFD dependency must be between 0 and 1'),
  body('tnfd.impact').isFloat({ min: 0, max: 1 }).withMessage('TNFD impact must be between 0 and 1'),
  body('tnfd.risk').isFloat({ min: 0, max: 1 }).withMessage('TNFD risk must be between 0 and 1'),
  
  // Optional validation for additional metadata
  body('brand_id').optional().isString().withMessage('Brand ID must be a string'),
  body('metadata').optional().isObject().withMessage('Metadata must be an object')
], validateRequest, async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Extract input data
    const inputData = {
      brand: req.body.brand,
      esg: req.body.esg,
      carbon: req.body.carbon,
      tnfd: req.body.tnfd
    };

    // Add optional metadata
    if (req.body.brand_id) {
      inputData.brand_id = req.body.brand_id;
    }
    if (req.body.metadata) {
      inputData.metadata = req.body.metadata;
    }

    logger.info(`Starting brand score calculation for brand: ${req.body.brand_id || 'unknown'}`);

    // Calculate brand score using the scoring engine
    const scoringResult = await scoreEngine.calculateBrandScore(inputData);

    // Generate unique ID for this calculation
    const resultId = storage.generateId();
    
    // Prepare result for storage
    const storedResult = {
      id: resultId,
      ...scoringResult,
      input_data: inputData,
      created_at: new Date().toISOString(),
      request_id: req.headers['x-request-id'] || null,
      user_agent: req.headers['user-agent'] || null,
      ip_address: req.ip || null
    };

    // Store result
    await storage.store(resultId, storedResult);

    // Prepare response (exclude input data from response for privacy)
    const response = {
      success: true,
      data: {
        id: resultId,
        brand_score: scoringResult.brand_score,
        grade: scoringResult.grade,
        confidence: scoringResult.confidence,
        verified: scoringResult.verified,
        hash: scoringResult.hash,
        breakdown: scoringResult.breakdown,
        execution_time_ms: scoringResult.execution_time_ms,
        timestamp: scoringResult.timestamp
      },
      metadata: {
        request_id: req.headers['x-request-id'],
        processing_time_ms: Date.now() - startTime,
        api_version: 'v1'
      }
    };

    logger.info(`Brand score calculated successfully: ID=${resultId}, Score=${scoringResult.brand_score}, Grade=${scoringResult.grade}`);

    res.status(201).json(response);

  } catch (error) {
    logger.error('Brand score calculation failed:', error);
    
    res.status(400).json({
      success: false,
      error: 'Calculation failed',
      message: error.message,
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id']
    });
  }
});

/**
 * @route   GET /api/brand-score/:id
 * @desc    Retrieve previously calculated brand score
 * @access  Public
 * @param   id - Unique identifier of the calculation
 * @output  Stored score result
 */
router.get('/:id', [
  // Parameter validation
  param('id').isUUID(4).withMessage('Invalid result ID format')
], validateRequest, async (req, res) => {
  try {
    const { id } = req.params;
    
    logger.info(`Retrieving brand score result: ID=${id}`);

    // Retrieve result from storage
    const result = await storage.retrieve(id);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: `Brand score result with ID ${id} not found`,
        timestamp: new Date().toISOString()
      });
    }

    // Prepare response (exclude sensitive input data)
    const response = {
      success: true,
      data: {
        id: result.id,
        brand_score: result.brand_score,
        grade: result.grade,
        confidence: result.confidence,
        verified: result.verified,
        hash: result.hash,
        breakdown: result.breakdown,
        execution_time_ms: result.execution_time_ms,
        timestamp: result.timestamp,
        created_at: result.created_at
      },
      metadata: {
        request_id: result.request_id,
        api_version: 'v1'
      }
    };

    logger.info(`Brand score result retrieved successfully: ID=${id}, Score=${result.brand_score}`);

    res.status(200).json(response);

  } catch (error) {
    logger.error('Brand score retrieval failed:', error);
    
    res.status(500).json({
      success: false,
      error: 'Retrieval failed',
      message: error.message,
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id']
    });
  }
});

/**
 * @route   GET /api/brand-score/:id/verify
 * @desc    Verify the integrity of a stored calculation using hash
 * @access  Public
 * @param   id - Unique identifier of the calculation
 * @output  Verification result
 */
router.get('/:id/verify', [
  // Parameter validation
  param('id').isUUID(4).withMessage('Invalid result ID format')
], validateRequest, async (req, res) => {
  try {
    const { id } = req.params;
    
    logger.info(`Verifying brand score result: ID=${id}`);

    // Retrieve full result including input data
    const result = await storage.retrieve(id, true); // Include input data
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: `Brand score result with ID ${id} not found`,
        timestamp: new Date().toISOString()
      });
    }

    // Recalculate hash from stored input data
    const recalculatedHash = scoreEngine.generateHash(result.input_data);
    
    // Compare hashes
    const hashMatches = recalculatedHash === result.hash;
    
    const response = {
      success: true,
      data: {
        id: result.id,
        verified: hashMatches,
        original_hash: result.hash,
        recalculated_hash: recalculatedHash,
        verification_timestamp: new Date().toISOString(),
        confidence: result.confidence
      }
    };

    logger.info(`Brand score verification completed: ID=${id}, Verified=${hashMatches}`);

    res.status(200).json(response);

  } catch (error) {
    logger.error('Brand score verification failed:', error);
    
    res.status(500).json({
      success: false,
      error: 'Verification failed',
      message: error.message,
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id']
    });
  }
});

/**
 * @route   GET /api/brand-score
 * @desc    List all stored brand score calculations
 * @access  Public
 * @query   limit - Maximum number of results to return (default: 50)
 * @query   offset - Number of results to skip (default: 0)
 * @query   grade - Filter by grade (optional)
 * @output  Array of score results (summary only)
 */
router.get('/', [
  // Query validation
  param('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  param('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
  param('grade').optional().isIn(['AAA', 'AA', 'A', 'BBB', 'Risk']).withMessage('Invalid grade filter')
], async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const grade = req.query.grade;
    
    logger.info(`Listing brand scores: limit=${limit}, offset=${offset}, grade=${grade || 'all'}`);

    // Retrieve list of results
    const results = await storage.list({ limit, offset, grade });
    
    // Get total count for pagination
    const totalCount = await storage.count(grade);
    
    const response = {
      success: true,
      data: {
        results: results.map(result => ({
          id: result.id,
          brand_score: result.brand_score,
          grade: result.grade,
          confidence: result.confidence,
          created_at: result.created_at,
          execution_time_ms: result.execution_time_ms
        })),
        pagination: {
          total: totalCount,
          limit,
          offset,
          has_more: offset + limit < totalCount
        }
      },
      metadata: {
        api_version: 'v1',
        query: { limit, offset, grade }
      }
    };

    logger.info(`Brand scores listed successfully: ${results.length} results`);

    res.status(200).json(response);

  } catch (error) {
    logger.error('Brand score listing failed:', error);
    
    res.status(500).json({
      success: false,
      error: 'Listing failed',
      message: error.message,
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id']
    });
  }
});

/**
 * @route   DELETE /api/brand-score/:id
 * @desc    Delete a stored brand score calculation
 * @access  Public
 * @param   id - Unique identifier of the calculation
 * @output  Deletion confirmation
 */
router.delete('/:id', [
  // Parameter validation
  param('id').isUUID(4).withMessage('Invalid result ID format')
], validateRequest, async (req, res) => {
  try {
    const { id } = req.params;
    
    logger.info(`Deleting brand score result: ID=${id}`);

    // Check if result exists
    const result = await storage.retrieve(id);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: `Brand score result with ID ${id} not found`,
        timestamp: new Date().toISOString()
      });
    }

    // Delete result
    await storage.remove(id);
    
    const response = {
      success: true,
      data: {
        id: id,
        deleted: true,
        deleted_at: new Date().toISOString()
      }
    };

    logger.info(`Brand score result deleted successfully: ID=${id}`);

    res.status(200).json(response);

  } catch (error) {
    logger.error('Brand score deletion failed:', error);
    
    res.status(500).json({
      success: false,
      error: 'Deletion failed',
      message: error.message,
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id']
    });
  }
});

/**
 * @route   GET /api/brand-score/stats
 * @desc    Get statistics about stored brand scores
 * @access  Public
 * @output  Statistical summary of all calculations
 */
router.get('/stats', async (req, res) => {
  try {
    logger.info('Retrieving brand score statistics');

    // Get statistics from storage
    const stats = await storage.getStatistics();
    
    const response = {
      success: true,
      data: {
        total_calculations: stats.total,
        average_score: stats.averageScore,
        grade_distribution: stats.gradeDistribution,
        confidence_distribution: stats.confidenceDistribution,
        average_execution_time: stats.averageExecutionTime,
        calculations_today: stats.calculationsToday,
        calculations_this_week: stats.calculationsThisWeek,
        calculations_this_month: stats.calculationsThisMonth,
        last_calculation: stats.lastCalculation
      },
      metadata: {
        generated_at: new Date().toISOString(),
        api_version: 'v1'
      }
    };

    logger.info('Brand score statistics retrieved successfully');

    res.status(200).json(response);

  } catch (error) {
    logger.error('Brand score statistics retrieval failed:', error);
    
    res.status(500).json({
      success: false,
      error: 'Statistics retrieval failed',
      message: error.message,
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id']
    });
  }
});

/**
 * @route   GET /api/brand-score/config
 * @desc    Get current scoring configuration
 * @access  Public
 * @output  Current weights and thresholds
 */
router.get('/config', async (req, res) => {
  try {
    logger.info('Retrieving scoring configuration');

    // Get configuration from scoring engine
    const config = scoreEngine.getConfiguration();
    
    const response = {
      success: true,
      data: {
        weights: config.weights,
        grade_thresholds: config.gradeThresholds,
        scoring_formula: {
          brand_perception: "(sentiment * 50) + (nps * 0.5)",
          esg: "(e + s + g) / 3",
          carbon: "100 - normalized(total_emission)",
          tnfd: "(1 - risk) * 50 + (1 - impact) * 30 + (1 - dependency) * 20",
          final: "0.30 * Brand Perception + 0.25 * ESG + 0.20 * Carbon + 0.25 * TNFD"
        }
      },
      metadata: {
        api_version: 'v1',
        last_updated: new Date().toISOString()
      }
    };

    logger.info('Scoring configuration retrieved successfully');

    res.status(200).json(response);

  } catch (error) {
    logger.error('Scoring configuration retrieval failed:', error);
    
    res.status(500).json({
      success: false,
      error: 'Configuration retrieval failed',
      message: error.message,
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id']
    });
  }
});

module.exports = router;
