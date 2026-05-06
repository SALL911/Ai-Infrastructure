/**
 * BrandOS AI Infrastructure - Database Service
 * Service layer for database operations with MongoDB models
 */

const BrandScore = require('../models/BrandScore');
const HistoricalScore = require('../models/HistoricalScore');
const ComplianceTag = require('../models/ComplianceTag');
const logger = require('../utils/logger');

class DatabaseService {
  constructor() {
    this.models = {
      BrandScore,
      HistoricalScore,
      ComplianceTag
    };
  }

  /**
   * Store a new brand score calculation
   */
  async storeBrandScore(scoreData, inputData, metadata = {}) {
    try {
      // Create brand score document
      const brandScore = new BrandScore({
        brand_id: inputData.brand_id || 'unknown',
        brand_score: scoreData.brand_score,
        grade: scoreData.grade,
        confidence: scoreData.confidence,
        verified: scoreData.verified,
        hash: scoreData.hash,
        breakdown: scoreData.breakdown,
        input_data: inputData,
        metadata: metadata,
        execution_time_ms: scoreData.execution_time_ms,
        request_id: metadata.request_id,
        user_agent: metadata.user_agent,
        ip_address: metadata.ip_address
      });

      // Apply compliance tags
      const applicableTags = await ComplianceTag.getApplicableTags(scoreData);
      brandScore.compliance_tags = applicableTags.map(tag => tag.tag_name);

      // Save to database
      const savedScore = await brandScore.save();

      // Create historical record
      await this.createHistoricalRecord(savedScore);

      logger.info(`Brand score stored: ID=${savedScore._id}, Brand=${savedScore.brand_id}, Score=${savedScore.brand_score}`);

      return savedScore;

    } catch (error) {
      logger.error('Failed to store brand score:', error);
      throw error;
    }
  }

  /**
   * Retrieve a brand score by ID
   */
  async retrieveBrandScore(id, includeInputData = false) {
    try {
      const query = BrandScore.findById(id);
      
      if (!includeInputData) {
        query.select('-input_data');
      }

      const result = await query.exec();
      
      if (!result) {
        return null;
      }

      logger.debug(`Brand score retrieved: ID=${id}`);
      return result;

    } catch (error) {
      logger.error('Failed to retrieve brand score:', error);
      throw error;
    }
  }

  /**
   * Get brand scores with pagination and filtering
   */
  async listBrandScores(options = {}) {
    try {
      const {
        limit = 50,
        offset = 0,
        grade,
        industry,
        region,
        sortBy = 'brand_score',
        sortOrder = -1,
        complianceTag
      } = options;

      // Build query
      const query = {};
      
      if (grade) query.grade = grade;
      if (industry) query['metadata.industry'] = industry;
      if (region) query['metadata.region'] = region;
      if (complianceTag) query.compliance_tags = complianceTag;

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder;

      // Execute query
      const results = await BrandScore
        .find(query)
        .sort(sort)
        .skip(offset)
        .limit(limit)
        .select('-input_data')
        .exec();

      // Get total count
      const totalCount = await BrandScore.countDocuments(query);

      logger.debug(`Brand scores listed: ${results.length} results, total: ${totalCount}`);

      return {
        results,
        totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      };

    } catch (error) {
      logger.error('Failed to list brand scores:', error);
      throw error;
    }
  }

  /**
   * Get brand rankings with advanced filtering
   */
  async getBrandRankings(options = {}) {
    try {
      const {
        limit = 100,
        grade,
        industry,
        region,
        complianceTags,
        minScore,
        maxScore,
        period = 'all',
        includeHistorical = false
      } = options;

      // Build query
      const query = {};
      
      if (grade) query.grade = grade;
      if (industry) query['metadata.industry'] = industry;
      if (region) query['metadata.region'] = region;
      if (complianceTags && complianceTags.length > 0) {
        query.compliance_tags = { $in: complianceTags };
      }
      if (minScore) query.brand_score = { $gte: minScore };
      if (maxScore) query.brand_score = { ...query.brand_score, $lte: maxScore };

      // Time-based filtering
      if (period !== 'all') {
        const now = new Date();
        let startDate;
        
        switch (period) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'quarter':
            const quarter = Math.floor(now.getMonth() / 3);
            startDate = new Date(now.getFullYear(), quarter * 3, 1);
            break;
          case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
        }
        
        if (startDate) {
          query.created_at = { $gte: startDate };
        }
      }

      // Execute query with ranking
      const rankings = await BrandScore
        .find(query)
        .sort({ brand_score: -1, created_at: -1 })
        .limit(limit)
        .select('-input_data')
        .exec();

      // Add rank positions
      const rankedResults = rankings.map((result, index) => ({
        ...result.toObject(),
        rank: index + 1
      }));

      // Include historical data if requested
      if (includeHistorical && rankedResults.length > 0) {
        for (const result of rankedResults) {
          result.historical_trend = await this.getBrandHistoricalTrend(result.brand_id, 'monthly', 6);
        }
      }

      logger.info(`Brand rankings generated: ${rankedResults.length} results`);

      return {
        rankings: rankedResults,
        total: rankings.length,
        filters: options,
        generated_at: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Failed to get brand rankings:', error);
      throw error;
    }
  }

  /**
   * Create historical record for trend analysis
   */
  async createHistoricalRecord(brandScore) {
    try {
      // Determine period (monthly by default)
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      // Check if historical record already exists for this period
      const existingRecord = await HistoricalScore.findOne({
        brand_id: brandScore.brand_id,
        period: 'monthly',
        period_start: periodStart,
        period_end: periodEnd
      });

      if (existingRecord) {
        // Update existing record with new data
        await this.updateHistoricalRecord(existingRecord, brandScore);
      } else {
        // Create new historical record
        const historicalRecord = new HistoricalScore({
          brand_id: brandScore.brand_id,
          score_data: {
            brand_score: brandScore.brand_score,
            grade: brandScore.grade,
            breakdown: brandScore.breakdown,
            confidence: brandScore.confidence
          },
          period: 'monthly',
          period_start: periodStart,
          period_end: periodEnd,
          metadata: brandScore.metadata,
          compliance_tags: brandScore.compliance_tags,
          period_metrics: {
            total_calculations: 1,
            average_score: brandScore.brand_score,
            min_score: brandScore.brand_score,
            max_score: brandScore.brand_score,
            standard_deviation: 0
          }
        });

        // Calculate trend if previous period exists
        const previousRecord = await HistoricalScore
          .findOne({
            brand_id: brandScore.brand_id,
            period: 'monthly',
            period_end: { $lt: periodStart }
          })
          .sort({ period_end: -1 })
          .exec();

        if (previousRecord) {
          historicalRecord.calculateTrend(previousRecord);
        }

        await historicalRecord.save();
      }

    } catch (error) {
      logger.error('Failed to create historical record:', error);
      // Don't throw error - this shouldn't fail the main operation
    }
  }

  /**
   * Update existing historical record
   */
  async updateHistoricalRecord(historicalRecord, newBrandScore) {
    try {
      // Update period metrics
      const currentMetrics = historicalRecord.period_metrics;
      const newScore = newBrandScore.brand_score;
      
      currentMetrics.total_calculations += 1;
      currentMetrics.average_score = ((currentMetrics.average_score * (currentMetrics.total_calculations - 1)) + newScore) / currentMetrics.total_calculations;
      currentMetrics.min_score = Math.min(currentMetrics.min_score, newScore);
      currentMetrics.max_score = Math.max(currentMetrics.max_score, newScore);

      // Update score data to latest
      historicalRecord.score_data = {
        brand_score: newBrandScore.brand_score,
        grade: newBrandScore.grade,
        breakdown: newBrandScore.breakdown,
        confidence: newBrandScore.confidence
      };

      // Update compliance tags
      historicalRecord.compliance_tags = newBrandScore.compliance_tags;

      await historicalRecord.save();

    } catch (error) {
      logger.error('Failed to update historical record:', error);
      throw error;
    }
  }

  /**
   * Get brand historical trend
   */
  async getBrandHistoricalTrend(brandId, period = 'monthly', limit = 12) {
    try {
      const historicalData = await HistoricalScore
        .find({ brand_id: brandId, period: period })
        .sort({ period_start: -1 })
        .limit(limit)
        .exec();

      return historicalData.map(record => ({
        period_start: record.period_start,
        period_end: record.period_end,
        score: record.score_data.brand_score,
        grade: record.score_data.grade,
        trend_change: record.trend_analysis?.score_change || 0,
        trend_direction: record.trend_analysis?.trend_direction || 'stable'
      }));

    } catch (error) {
      logger.error('Failed to get brand historical trend:', error);
      throw error;
    }
  }

  /**
   * Get industry trends
   */
  async getIndustryTrends(industry, period = 'monthly', limit = 12) {
    try {
      const trends = await HistoricalScore
        .find({ 'metadata.industry': industry, period: period })
        .sort({ period_start: -1 })
        .limit(limit)
        .exec();

      // Aggregate data by period
      const aggregatedTrends = {};
      
      trends.forEach(record => {
        const periodKey = record.period_start.toISOString().substring(0, 7); // YYYY-MM
        
        if (!aggregatedTrends[periodKey]) {
          aggregatedTrends[periodKey] = {
            period_start: record.period_start,
            period_end: record.period_end,
            total_brands: 0,
            average_score: 0,
            grade_distribution: { 'AAA': 0, 'AA': 0, 'A': 0, 'BBB': 0, 'Risk': 0 },
            compliance_tags: {}
          };
        }

        const trend = aggregatedTrends[periodKey];
        trend.total_brands += 1;
        trend.average_score = (trend.average_score * (trend.total_brands - 1) + record.score_data.brand_score) / trend.total_brands;
        trend.grade_distribution[record.score_data.grade] += 1;

        // Aggregate compliance tags
        record.compliance_tags.forEach(tag => {
          trend.compliance_tags[tag] = (trend.compliance_tags[tag] || 0) + 1;
        });
      });

      return Object.values(aggregatedTrends);

    } catch (error) {
      logger.error('Failed to get industry trends:', error);
      throw error;
    }
  }

  /**
   * Get top movers (biggest score changes)
   */
  async getTopMovers(period = 'monthly', limit = 10, direction = 'up') {
    try {
      const movers = await HistoricalScore.getTopMovers(period, limit, direction);
      
      return movers.map(mover => ({
        brand_id: mover.brand_id,
        score_change: mover.trend_analysis.score_change,
        current_score: mover.score_data.brand_score,
        current_grade: mover.score_data.grade,
        trend_direction: mover.trend_analysis.trend_direction,
        volatility: mover.trend_analysis.volatility,
        period: mover.period,
        period_start: mover.period_start
      }));

    } catch (error) {
      logger.error('Failed to get top movers:', error);
      throw error;
    }
  }

  /**
   * Get compliance statistics
   */
  async getComplianceStatistics() {
    try {
      const stats = await BrandScore.getComplianceStats();
      
      return {
        total_scores: await BrandScore.countDocuments(),
        compliance_distribution: stats,
        generated_at: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Failed to get compliance statistics:', error);
      throw error;
    }
  }

  /**
   * Search brand scores
   */
  async searchBrandScores(searchTerm, options = {}) {
    try {
      const { limit = 50, offset = 0 } = options;

      const results = await BrandScore
        .find(
          { $text: { $search: searchTerm } },
          { score: { $meta: 'textScore' } }
        )
        .sort({ score: { $meta: 'textScore' } })
        .skip(offset)
        .limit(limit)
        .select('-input_data')
        .exec();

      const totalCount = await BrandScore.countDocuments(
        { $text: { $search: searchTerm } }
      );

      return {
        results,
        totalCount,
        searchTerm,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      };

    } catch (error) {
      logger.error('Failed to search brand scores:', error);
      throw error;
    }
  }

  /**
   * Delete a brand score
   */
  async deleteBrandScore(id) {
    try {
      const result = await BrandScore.findByIdAndDelete(id);
      
      if (!result) {
        return false;
      }

      logger.info(`Brand score deleted: ID=${id}, Brand=${result.brand_id}`);
      return true;

    } catch (error) {
      logger.error('Failed to delete brand score:', error);
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  async getStatistics() {
    try {
      const [
        totalScores,
        gradeDistribution,
        industryStats,
        recentScores,
        complianceStats
      ] = await Promise.all([
        BrandScore.countDocuments(),
        BrandScore.aggregate([
          { $group: { _id: '$grade', count: { $sum: 1 } } },
          { $sort: { _id: 1 } }
        ]),
        BrandScore.aggregate([
          { $group: { _id: '$metadata.industry', count: { $sum: 1 }, avgScore: { $avg: '$brand_score' } } },
          { $sort: { count: -1 } }
        ]),
        BrandScore.countDocuments({
          created_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }),
        BrandScore.getComplianceStats()
      ]);

      return {
        total_calculations: totalScores,
        grade_distribution: gradeDistribution,
        industry_breakdown: industryStats,
        calculations_today: recentScores,
        compliance_distribution: complianceStats,
        generated_at: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Failed to get statistics:', error);
      throw error;
    }
  }
}

// Create singleton instance
const databaseService = new DatabaseService();

module.exports = databaseService;
