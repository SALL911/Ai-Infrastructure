/**
 * BrandOS Scoring API Routes
 * RESTful endpoints for brand scoring calculations
 */

const express = require('express');
const { body, validationResult, query } = require('express-validator');
const rateLimit = require('express-rate-limit');
const BrandScoreEngine = require('../scoring/brandScoreEngine');
const logger = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');

const router = express.Router();
const scoreEngine = new BrandScoreEngine();

// Stricter rate limiting for scoring endpoints
const scoringLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many scoring requests',
    message: 'Rate limit exceeded. Please try again later.',
    retryAfter: '1 minute'
  }
});

// Apply scoring rate limiting
router.use(scoringLimiter);

/**
 * @route   POST /api/v1/scoring/calculate
 * @desc    Calculate comprehensive brand score
 * @access  Private
 */
router.post('/calculate', authenticateToken, [
  // Validation middleware
  body('brand.brand_id').notEmpty().withMessage('Brand ID is required'),
  body('brand.metadata.name').notEmpty().withMessage('Brand name is required'),
  body('brand.metadata.industry').isIn(['technology', 'retail', 'finance', 'healthcare', 'manufacturing', 'services', 'energy', 'agriculture']).withMessage('Invalid industry'),
  body('brand.metadata.country').isLength({ min: 2, max: 2 }).withMessage('Country code must be 2 characters'),
  body('esg.carbon_tracking.scope1_emissions').isFloat({ min: 0 }).withMessage('Scope1 emissions must be positive'),
  body('esg.carbon_tracking.scope2_emissions').isFloat({ min: 0 }).withMessage('Scope2 emissions must be positive'),
  body('esg.carbon_tracking.scope3_emissions').isFloat({ min: 0 }).withMessage('Scope3 emissions must be positive'),
  body('carbon.scope1_emissions').isFloat({ min: 0 }).withMessage('Scope1 emissions must be positive'),
  body('carbon.scope2_emissions').isFloat({ min: 0 }).withMessage('Scope2 emissions must be positive'),
  body('carbon.scope3_emissions').isFloat({ min: 0 }).withMessage('Scope3 emissions must be positive'),
], validateRequest, async (req, res) => {
  try {
    const startTime = Date.now();
    
    const {
      brand,
      esg,
      carbon,
      tnfd,
      industry = brand?.metadata?.industry || 'technology',
      scoring_options = {}
    } = req.body;

    logger.info(`Calculating brand score for: ${brand.brand_id}`);

    // Calculate brand score
    const result = await scoreEngine.calculateBrandScore(
      brand,
      esg,
      carbon,
      tnfd,
      { industry, ...scoring_options }
    );

    // Add execution time
    result.execution_time_ms = Date.now() - startTime;

    // Log successful calculation
    logger.info(`Brand score calculated successfully: ${result.brand_id} - ${result.total_score}`);

    res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id']
    });

  } catch (error) {
    logger.error('Brand score calculation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Score calculation failed',
      message: error.message,
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id']
    });
  }
});

/**
 * @route   POST /api/v1/scoring/calculate-batch
 * @desc    Calculate scores for multiple brands
 * @access  Private
 */
router.post('/calculate-batch', authenticateToken, [
  body('requests').isArray({ min: 1, max: 10 }).withMessage('Requests must be an array with 1-10 items'),
  body('requests.*.brand.brand_id').notEmpty().withMessage('Brand ID is required for all requests'),
  body('requests.*.brand.metadata.name').notEmpty().withMessage('Brand name is required for all requests'),
  body('parallel_processing').optional().isBoolean().withMessage('Parallel processing must be boolean')
], validateRequest, async (req, res) => {
  try {
    const startTime = Date.now();
    const { requests, parallel_processing = true } = req.body;

    logger.info(`Starting batch score calculation for ${requests.length} brands`);

    // Calculate batch scores
    const results = await scoreEngine.batchCalculateScores(requests, {
      parallel: parallel_processing
    });

    const executionTime = Date.now() - startTime;
    
    // Separate successful and failed results
    const successfulResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);

    logger.info(`Batch calculation completed: ${successfulResults.length} successful, ${failedResults.length} failed`);

    res.status(200).json({
      success: true,
      data: {
        total_requests: requests.length,
        successful_count: successfulResults.length,
        failed_count: failedResults.length,
        results: results,
        execution_time_ms: executionTime,
        parallel_processing
      },
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id']
    });

  } catch (error) {
    logger.error('Batch score calculation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Batch calculation failed',
      message: error.message,
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id']
    });
  }
});

/**
 * @route   GET /api/v1/scoring/benchmark/:industry
 * @desc    Get industry benchmark data
 * @access  Public
 */
router.get('/benchmark/:industry', [
  query('industry').isIn(['technology', 'retail', 'finance', 'healthcare', 'manufacturing', 'services', 'energy', 'agriculture']).withMessage('Invalid industry')
], async (req, res) => {
  try {
    const { industry } = req.params;
    
    const benchmarks = scoreEngine.getIndustryBenchmarks();
    
    if (!benchmarks[industry]) {
      return res.status(404).json({
        success: false,
        error: 'Industry not found',
        message: `Industry '${industry}' benchmark data not available`,
        available_industries: Object.keys(benchmarks)
      });
    }

    const industryBenchmark = benchmarks[industry];
    const overallAverage = Object.values(industryBenchmark).reduce((sum, val) => sum + val, 0) / 4;

    res.status(200).json({
      success: true,
      data: {
        industry,
        benchmark_scores: industryBenchmark,
        overall_average: Math.round(overallAverage * 100) / 100,
        last_updated: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Get benchmark failed:', error);
    res.status(500).json({
      success: false,
      error: 'Benchmark retrieval failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/v1/scoring/categories
 * @desc    Get scoring categories and definitions
 * @access  Public
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = {
      excellent: {
        name: '優秀',
        score_range: [80, 100],
        description: '品牌在各維度表現優異，是行業領先者'
      },
      good: {
        name: '良好',
        score_range: [60, 79],
        description: '品牌表現良好，有明確的改進空間'
      },
      average: {
        name: '平均',
        score_range: [40, 59],
        description: '品牌表現一般，需要重點改進'
      },
      poor: {
        name: '較差',
        score_range: [20, 39],
        description: '品牌表現較差，需要立即採取行動'
      },
      critical: {
        name: '危急',
        score_range: [0, 19],
        description: '品牌處於危急狀態，需要全面改革'
      }
    };

    res.status(200).json({
      success: true,
      data: {
        categories,
        total_categories: Object.keys(categories).length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Get categories failed:', error);
    res.status(500).json({
      success: false,
      error: 'Categories retrieval failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/v1/scoring/weights
 * @desc    Get current scoring weights
 * @access  Public
 */
router.get('/weights', async (req, res) => {
  try {
    const weights = scoreEngine.getScoringWeights();
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);

    res.status(200).json({
      success: true,
      data: {
        weights: {
          brand_identity: {
            weight: weights.brand_identity,
            description: '品牌身份權重'
          },
          esg_performance: {
            weight: weights.esg_performance,
            description: 'ESG 績效權重'
          },
          carbon_footprint: {
            weight: weights.carbon_footprint,
            description: '碳足跡權重'
          },
          tnfd_assessment: {
            weight: weights.tnfd_assessment,
            description: 'TNFD 評估權重'
          }
        },
        total_weight: Math.round(totalWeight * 100) / 100,
        last_updated: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Get weights failed:', error);
    res.status(500).json({
      success: false,
      error: 'Weights retrieval failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/v1/scoring/history/:brand_id
 * @desc    Get brand score history
 * @access  Private
 */
router.get('/history/:brand_id', authenticateToken, [
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], async (req, res) => {
  try {
    const { brand_id } = req.params;
    const { limit = 10 } = req.query;

    // This would typically fetch from database
    // For now, return mock data
    const mockHistory = [
      {
        scoring_date: '2026-03-01T00:00:00Z',
        total_score: 72.5,
        category: 'good',
        component_scores: {
          brand_identity: 78.0,
          esg_performance: 70.0,
          carbon_footprint: 68.0,
          tnfd_assessment: 74.0
        }
      },
      {
        scoring_date: '2026-02-01T00:00:00Z',
        total_score: 70.2,
        category: 'good',
        component_scores: {
          brand_identity: 76.0,
          esg_performance: 68.0,
          carbon_footprint: 65.0,
          tnfd_assessment: 72.0
        }
      }
    ];

    const limitedHistory = mockHistory.slice(0, parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        brand_id,
        history: limitedHistory,
        total_records: mockHistory.length,
        limit: parseInt(limit)
      },
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id']
    });

  } catch (error) {
    logger.error('Get score history failed:', error);
    res.status(500).json({
      success: false,
      error: 'History retrieval failed',
      message: error.message,
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id']
    });
  }
});

/**
 * @route   POST /api/v1/scoring/compare
 * @desc    Compare multiple brands
 * @access  Private
 */
router.post('/compare', authenticateToken, [
  body('brand_ids').isArray({ min: 2, max: 10 }).withMessage('Must provide 2-10 brand IDs for comparison')
], validateRequest, async (req, res) => {
  try {
    const { brand_ids } = req.body;

    logger.info(`Comparing ${brand_ids.length} brands`);

    // This would typically fetch scores from database
    // For now, return mock comparison data
    const comparison = {
      comparison_date: new Date().toISOString(),
      brands: brand_ids.map((brand_id, index) => {
        const baseScore = 75 + (Math.abs(brand_id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 20);
        return {
          brand_id,
          total_score: baseScore,
          category: baseScore >= 80 ? 'excellent' : baseScore >= 60 ? 'good' : 'average',
          component_scores: {
            brand_identity: baseScore + 3,
            esg_performance: baseScore - 3,
            carbon_footprint: baseScore - 1,
            tnfd_assessment: baseScore + 1
          },
          rank: 0 // Will be set below
        };
      })
    };

    // Sort and set ranks
    comparison.brands.sort((a, b) => b.total_score - a.total_score);
    comparison.brands.forEach((brand, index) => {
      brand.rank = index + 1;
    });

    // Calculate statistics
    const scores = comparison.brands.map(brand => brand.total_score);
    comparison.statistics = {
      highest_score: Math.max(...scores),
      lowest_score: Math.min(...scores),
      average_score: Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100) / 100,
      score_range: Math.max(...scores) - Math.min(...scores)
    };

    res.status(200).json({
      success: true,
      data: comparison,
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id']
    });

  } catch (error) {
    logger.error('Brand comparison failed:', error);
    res.status(500).json({
      success: false,
      error: 'Brand comparison failed',
      message: error.message,
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id']
    });
  }
});

/**
 * @route   PUT /api/v1/scoring/weights
 * @desc    Update scoring weights (admin only)
 * @access  Private (Admin)
 */
router.put('/weights', authenticateToken, [
  body('brand_identity').isFloat({ min: 0, max: 1 }).withMessage('Brand identity weight must be between 0 and 1'),
  body('esg_performance').isFloat({ min: 0, max: 1 }).withMessage('ESG performance weight must be between 0 and 1'),
  body('carbon_footprint').isFloat({ min: 0, max: 1 }).withMessage('Carbon footprint weight must be between 0 and 1'),
  body('tnfd_assessment').isFloat({ min: 0, max: 1 }).withMessage('TNFD assessment weight must be between 0 and 1')
], validateRequest, async (req, res) => {
  try {
    // Check if user has admin privileges
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'Admin privileges required to update scoring weights'
      });
    }

    const newWeights = {
      brand_identity: req.body.brand_identity,
      esg_performance: req.body.esg_performance,
      carbon_footprint: req.body.carbon_footprint,
      tnfd_assessment: req.body.tnfd_assessment
    };

    // Update weights in the engine
    scoreEngine.updateScoringWeights(newWeights);

    logger.info('Scoring weights updated by admin:', req.user.id);

    res.status(200).json({
      success: true,
      message: 'Scoring weights updated successfully',
      data: {
        old_weights: scoreEngine.getScoringWeights(),
        new_weights: newWeights,
        updated_by: req.user.id,
        updated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Update weights failed:', error);
    res.status(500).json({
      success: false,
      error: 'Weight update failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/v1/scoring/health
 * @desc    Health check for scoring service
 * @access  Public
 */
router.get('/health', async (req, res) => {
  try {
    const weights = scoreEngine.getScoringWeights();
    const benchmarks = scoreEngine.getIndustryBenchmarks();

    res.status(200).json({
      success: true,
      data: {
        status: 'healthy',
        service: 'brand-scoring-engine',
        version: '1.0.0',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        weights_loaded: Object.keys(weights).length > 0,
        benchmarks_loaded: Object.keys(benchmarks).length > 0,
        supported_industries: Object.keys(benchmarks),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Scoring health check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
