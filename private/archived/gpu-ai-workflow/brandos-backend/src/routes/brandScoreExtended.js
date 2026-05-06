/**
 * BrandOS AI Infrastructure - Extended Brand Score API Routes
 * Additional endpoints for rankings, historical data, and compliance features
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const BrandScoreEngine = require('../scoring/brandScoreEngine');
const databaseService = require('../services/databaseService');
const logger = require('../utils/logger');
const { validateRequest, validateUUID } = require('../middleware/validation');
const { authenticateAPI } = require('../middleware/auth');

const router = express.Router();
const scoreEngine = new BrandScoreEngine();

/**
 * @route   GET /api/brand-score/ranking
 * @desc    Get brand rankings with advanced filtering and sorting
 * @access  Public (with optional API key authentication)
 * @query   limit, grade, industry, region, complianceTags, minScore, maxScore, period
 */
router.get('/ranking', [
  // Query validation
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('grade').optional().isIn(['AAA', 'AA', 'A', 'BBB', 'Risk']).withMessage('Invalid grade'),
  query('industry').optional().isString().withMessage('Industry must be a string'),
  query('region').optional().isString().withMessage('Region must be a string'),
  query('complianceTags').optional().isString().withMessage('Compliance tags must be a string'),
  query('minScore').optional().isFloat({ min: 0, max: 100 }).withMessage('Min score must be between 0 and 100'),
  query('maxScore').optional().isFloat({ min: 0, max: 100 }).withMessage('Max score must be between 0 and 100'),
  query('period').optional().isIn(['all', 'today', 'week', 'month', 'quarter', 'year']).withMessage('Invalid period'),
  query('includeHistorical').optional().isBoolean().withMessage('Include historical must be boolean')
], async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Parse query parameters
    const options = {
      limit: parseInt(req.query.limit) || 100,
      grade: req.query.grade,
      industry: req.query.industry,
      region: req.query.region,
      minScore: req.query.minScore ? parseFloat(req.query.minScore) : undefined,
      maxScore: req.query.maxScore ? parseFloat(req.query.maxScore) : undefined,
      period: req.query.period || 'all',
      includeHistorical: req.query.includeHistorical === 'true'
    };

    // Parse compliance tags if provided
    if (req.query.complianceTags) {
      options.complianceTags = req.query.complianceTags.split(',').map(tag => tag.trim());
    }

    logger.info(`Getting brand rankings with filters:`, options);

    // Get rankings from database service
    const rankings = await databaseService.getBrandRankings(options);

    // Prepare response
    const response = {
      success: true,
      data: rankings,
      metadata: {
        request_id: req.headers['x-request-id'],
        processing_time_ms: Date.now() - startTime,
        api_version: 'v1',
        filters_applied: options
      }
    };

    logger.info(`Brand rankings generated: ${rankings.rankings.length} results`);

    res.status(200).json(response);

  } catch (error) {
    logger.error('Brand rankings retrieval failed:', error);
    
    res.status(500).json({
      success: false,
      error: 'Rankings retrieval failed',
      message: error.message,
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id']
    });
  }
});

/**
 * @route   GET /api/brand-score/:brandId/history
 * @desc    Get historical score data for a specific brand
 * @access  Public
 * @param   brandId - Brand identifier
 * @query   period, limit
 */
router.get('/:brandId/history', [
  // Parameter validation
  param('brandId').isString().withMessage('Brand ID must be a string'),
  // Query validation
  query('period').optional().isIn(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).withMessage('Invalid period'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], async (req, res) => {
  try {
    const { brandId } = req.params;
    const period = req.query.period || 'monthly';
    const limit = parseInt(req.query.limit) || 12;

    logger.info(`Getting historical data for brand: ${brandId}, period: ${period}, limit: ${limit}`);

    // Get historical trend
    const historicalTrend = await databaseService.getBrandHistoricalTrend(brandId, period, limit);

    // Get current brand score for context
    const currentScore = await databaseService.retrieveBrandScore(brandId);

    const response = {
      success: true,
      data: {
        brand_id: brandId,
        current_score: currentScore ? {
          score: currentScore.brand_score,
          grade: currentScore.grade,
          confidence: currentScore.confidence,
          created_at: currentScore.created_at
        } : null,
        historical_trend: historicalTrend,
        trend_analysis: {
          period: period,
          data_points: historicalTrend.length,
          latest_change: historicalTrend.length > 1 ? historicalTrend[0].trend_change : 0,
          trend_direction: historicalTrend.length > 1 ? historicalTrend[0].trend_direction : 'stable'
        }
      },
      metadata: {
        request_id: req.headers['x-request-id'],
        api_version: 'v1'
      }
    };

    logger.info(`Historical data retrieved for brand: ${brandId}, ${historicalTrend.length} data points`);

    res.status(200).json(response);

  } catch (error) {
    logger.error('Historical data retrieval failed:', error);
    
    res.status(500).json({
      success: false,
      error: 'Historical data retrieval failed',
      message: error.message,
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id']
    });
  }
});

/**
 * @route   GET /api/brand-score/trends/industry/:industry
 * @desc    Get industry-wide trends and statistics
 * @access  Public
 * @param   industry - Industry name
 * @query   period, limit
 */
router.get('/trends/industry/:industry', [
  // Parameter validation
  param('industry').isString().withMessage('Industry must be a string'),
  // Query validation
  query('period').optional().isIn(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).withMessage('Invalid period'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
], async (req, res) => {
  try {
    const { industry } = req.params;
    const period = req.query.period || 'monthly';
    const limit = parseInt(req.query.limit) || 12;

    logger.info(`Getting industry trends for: ${industry}, period: ${period}, limit: ${limit}`);

    // Get industry trends
    const industryTrends = await databaseService.getIndustryTrends(industry, period, limit);

    // Get top movers in industry
    const topMovers = await databaseService.getTopMovers(period, 10, 'up');
    const topMoversInIndustry = topMovers.filter(mover => {
      // This would need to be implemented to check if brand belongs to industry
      return true; // Simplified for now
    });

    const response = {
      success: true,
      data: {
        industry: industry,
        period: period,
        trends: industryTrends,
        top_movers: topMoversInIndustry.slice(0, 5),
        summary: {
          data_points: industryTrends.length,
          latest_average_score: industryTrends.length > 0 ? industryTrends[0].average_score : 0,
          trend_direction: industryTrends.length > 1 ? 
            (industryTrends[0].average_score > industryTrends[1].average_score ? 'improving' : 'declining') : 'stable'
        }
      },
      metadata: {
        request_id: req.headers['x-request-id'],
        api_version: 'v1',
        generated_at: new Date().toISOString()
      }
    };

    logger.info(`Industry trends retrieved for: ${industry}, ${industryTrends.length} data points`);

    res.status(200).json(response);

  } catch (error) {
    logger.error('Industry trends retrieval failed:', error);
    
    res.status(500).json({
      success: false,
      error: 'Industry trends retrieval failed',
      message: error.message,
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id']
    });
  }
});

/**
 * @route   GET /api/brand-score/trends/movers
 * @desc    Get top movers (biggest score changes)
 * @access  Public
 * @query   period, limit, direction
 */
router.get('/trends/movers', [
  // Query validation
  query('period').optional().isIn(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).withMessage('Invalid period'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('direction').optional().isIn(['up', 'down']).withMessage('Direction must be up or down')
], async (req, res) => {
  try {
    const period = req.query.period || 'monthly';
    const limit = parseInt(req.query.limit) || 10;
    const direction = req.query.direction || 'up';

    logger.info(`Getting top movers: period=${period}, limit=${limit}, direction=${direction}`);

    // Get top movers
    const topMovers = await databaseService.getTopMovers(period, limit, direction);

    const response = {
      success: true,
      data: {
        period: period,
        direction: direction,
        movers: topMovers,
        summary: {
          total_movers: topMovers.length,
          average_change: topMovers.length > 0 ? 
            topMovers.reduce((sum, m) => sum + m.score_change, 0) / topMovers.length : 0,
          max_change: topMovers.length > 0 ? Math.max(...topMovers.map(m => m.score_change)) : 0
        }
      },
      metadata: {
        request_id: req.headers['x-request-id'],
        api_version: 'v1',
        generated_at: new Date().toISOString()
      }
    };

    logger.info(`Top movers retrieved: ${topMovers.length} movers`);

    res.status(200).json(response);

  } catch (error) {
    logger.error('Top movers retrieval failed:', error);
    
    res.status(500).json({
      success: false,
      error: 'Top movers retrieval failed',
      message: error.message,
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id']
    });
  }
});

/**
 * @route   GET /api/brand-score/compliance/tags
 * @desc    Get all available compliance tags and their criteria
 * @access  Public
 */
router.get('/compliance/tags', async (req, res) => {
  try {
    logger.info('Getting compliance tags');

    const ComplianceTag = require('../models/ComplianceTag');
    const tags = await ComplianceTag.getActiveTags();

    const response = {
      success: true,
      data: {
        tags: tags,
        categories: ['ESG', 'TNFD', 'Carbon', 'Sustainability', 'Risk'],
        total_tags: tags.length
      },
      metadata: {
        request_id: req.headers['x-request-id'],
        api_version: 'v1',
        generated_at: new Date().toISOString()
      }
    };

    logger.info(`Compliance tags retrieved: ${tags.length} tags`);

    res.status(200).json(response);

  } catch (error) {
    logger.error('Compliance tags retrieval failed:', error);
    
    res.status(500).json({
      success: false,
      error: 'Compliance tags retrieval failed',
      message: error.message,
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id']
    });
  }
});

/**
 * @route   GET /api/brand-score/compliance/statistics
 * @desc    Get compliance statistics and distribution
 * @access  Public
 */
router.get('/compliance/statistics', async (req, res) => {
  try {
    logger.info('Getting compliance statistics');

    const complianceStats = await databaseService.getComplianceStatistics();

    const response = {
      success: true,
      data: complianceStats,
      metadata: {
        request_id: req.headers['x-request-id'],
        api_version: 'v1',
        generated_at: new Date().toISOString()
      }
    };

    logger.info('Compliance statistics retrieved');

    res.status(200).json(response);

  } catch (error) {
    logger.error('Compliance statistics retrieval failed:', error);
    
    res.status(500).json({
      success: false,
      error: 'Compliance statistics retrieval failed',
      message: error.message,
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id']
    });
  }
});

/**
 * @route   POST /api/brand-score/search
 * @desc    Search brand scores by text
 * @access  Public
 * @input   Search term and filters
 */
router.post('/search', [
  // Input validation
  body('searchTerm').isString().isLength({ min: 1, max: 100 }).withMessage('Search term must be 1-100 characters'),
  body('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  body('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative')
], validateRequest, async (req, res) => {
  try {
    const startTime = Date.now();
    const { searchTerm, limit = 50, offset = 0 } = req.body;

    logger.info(`Searching brand scores: term="${searchTerm}", limit=${limit}, offset=${offset}`);

    // Search scores
    const searchResults = await databaseService.searchBrandScores(searchTerm, { limit, offset });

    const response = {
      success: true,
      data: searchResults,
      metadata: {
        request_id: req.headers['x-request-id'],
        processing_time_ms: Date.now() - startTime,
        api_version: 'v1',
        search_term: searchTerm
      }
    };

    logger.info(`Search completed: ${searchResults.results.length} results`);

    res.status(200).json(response);

  } catch (error) {
    logger.error('Search failed:', error);
    
    res.status(500).json({
      success: false,
      error: 'Search failed',
      message: error.message,
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id']
    });
  }
});

/**
 * @route   GET /api/brand-score/export
 * @desc    Export brand scores data (CSV format)
 * @access  Private (requires API key)
 */
router.get('/export', authenticateAPI, [
  // Query validation
  query('format').optional().isIn(['csv', 'json']).withMessage('Format must be csv or json'),
  query('grade').optional().isIn(['AAA', 'AA', 'A', 'BBB', 'Risk']).withMessage('Invalid grade'),
  query('industry').optional().isString().withMessage('Industry must be a string'),
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000')
], async (req, res) => {
  try {
    const format = req.query.format || 'csv';
    const options = {
      grade: req.query.grade,
      industry: req.query.industry,
      limit: parseInt(req.query.limit) || 100
    };

    logger.info(`Exporting brand scores: format=${format}, options=`, options);

    // Get scores
    const scores = await databaseService.listBrandScores(options);

    if (format === 'csv') {
      // Convert to CSV
      const csv = convertToCSV(scores.results);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="brand-scores-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } else {
      // Return JSON
      const response = {
        success: true,
        data: scores,
        export_info: {
          format: format,
          total_records: scores.results.length,
          exported_at: new Date().toISOString()
        },
        metadata: {
          request_id: req.headers['x-request-id'],
          api_version: 'v1'
        }
      };

      res.setHeader('Content-Disposition', `attachment; filename="brand-scores-${new Date().toISOString().split('T')[0]}.json"`);
      res.json(response);
    }

    logger.info(`Export completed: ${scores.results.length} records in ${format} format`);

  } catch (error) {
    logger.error('Export failed:', error);
    
    res.status(500).json({
      success: false,
      error: 'Export failed',
      message: error.message,
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id']
    });
  }
});

/**
 * Helper function to convert data to CSV format
 */
function convertToCSV(data) {
  if (data.length === 0) {
    return 'No data available';
  }

  const headers = [
    'brand_id',
    'brand_score',
    'grade',
    'confidence',
    'breakdown_brand',
    'breakdown_esg',
    'breakdown_carbon',
    'breakdown_tnfd',
    'compliance_tags',
    'industry',
    'region',
    'created_at'
  ];

  const csvRows = [headers.join(',')];

  data.forEach(row => {
    const csvRow = [
      row.brand_id || '',
      row.brand_score || '',
      row.grade || '',
      row.confidence || '',
      row.breakdown?.brand || '',
      row.breakdown?.esg || '',
      row.breakdown?.carbon || '',
      row.breakdown?.tnfd || '',
      (row.compliance_tags || []).join(';'),
      row.metadata?.industry || '',
      row.metadata?.region || '',
      row.created_at || ''
    ];
    
    // Escape commas and quotes in CSV
    const escapedRow = csvRow.map(field => {
      const fieldStr = String(field);
      if (fieldStr.includes(',') || fieldStr.includes('"') || fieldStr.includes('\n')) {
        return `"${fieldStr.replace(/"/g, '""')}"`;
      }
      return fieldStr;
    });

    csvRows.push(escapedRow.join(','));
  });

  return csvRows.join('\n');
}

module.exports = router;
