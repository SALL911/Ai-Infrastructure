/**
 * BrandOS AI Infrastructure - HistoricalScore Model
 * MongoDB schema for storing historical brand score data for trend analysis
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * HistoricalScore Schema
 * Stores historical snapshots of brand scores for trend analysis
 */
const historicalScoreSchema = new Schema({
  // Brand identification
  brand_id: {
    type: String,
    required: true,
    index: true,
    description: 'Unique identifier for the brand'
  },
  
  // Score data at specific point in time
  score_data: {
    brand_score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      description: 'Brand score at this point in time'
    },
    grade: {
      type: String,
      required: true,
      enum: ['AAA', 'AA', 'A', 'BBB', 'Risk'],
      description: 'Grade at this point in time'
    },
    breakdown: {
      brand: { type: Number, required: true, min: 0, max: 100 },
      esg: { type: Number, required: true, min: 0, max: 100 },
      carbon: { type: Number, required: true, min: 0, max: 100 },
      tnfd: { type: Number, required: true, min: 0, max: 100 }
    },
    confidence: {
      type: Number,
      required: true,
      min: 0.8,
      max: 0.95
    }
  },
  
  // Time period information
  period: {
    type: String,
    required: true,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
    index: true,
    description: 'Time period for this historical record'
  },
  
  period_start: {
    type: Date,
    required: true,
    index: true,
    description: 'Start date of the period'
  },
  
  period_end: {
    type: Date,
    required: true,
    index: true,
    description: 'End date of the period'
  },
  
  // Trend analysis data
  trend_analysis: {
    score_change: {
      type: Number,
      description: 'Change in score from previous period'
    },
    grade_change: {
      type: String,
      description: 'Change in grade from previous period'
    },
    trend_direction: {
      type: String,
      enum: ['improving', 'declining', 'stable'],
      description: 'Overall trend direction'
    },
    volatility: {
      type: Number,
      min: 0,
      max: 100,
      description: 'Volatility index (0-100)'
    }
  },
  
  // Component trends
  component_trends: {
    brand: {
      change: Number,
      direction: { type: String, enum: ['up', 'down', 'stable'] },
      significance: { type: String, enum: ['high', 'medium', 'low'] }
    },
    esg: {
      change: Number,
      direction: { type: String, enum: ['up', 'down', 'stable'] },
      significance: { type: String, enum: ['high', 'medium', 'low'] }
    },
    carbon: {
      change: Number,
      direction: { type: String, enum: ['up', 'down', 'stable'] },
      significance: { type: String, enum: ['high', 'medium', 'low'] }
    },
    tnfd: {
      change: Number,
      direction: { type: String, enum: ['up', 'down', 'stable'] },
      significance: { type: String, enum: ['high', 'medium', 'low'] }
    }
  },
  
  // Metadata at time of recording
  metadata: {
    industry: { type: String, index: true },
    region: { type: String, index: true },
    market_cap: { type: Number },
    employee_count: { type: Number },
    revenue: { type: Number }
  },
  
  // Compliance status at time of recording
  compliance_tags: [{
    type: String,
    enum: ['ESG_Compliant', 'TNFD_Compliant', 'Carbon_Neutral', 'Sustainable', 'High_Risk']
  }],
  
  // Data source and quality
  data_source: {
    type: String,
    default: 'automated',
    enum: ['automated', 'manual', 'api', 'import']
  },
  
  data_quality: {
    completeness: {
      type: Number,
      min: 0,
      max: 100,
      default: 100
    },
    accuracy: {
      type: Number,
      min: 0,
      max: 100,
      default: 100
    },
    timeliness: {
      type: Number,
      min: 0,
      max: 100,
      default: 100
    }
  },
  
  // Aggregated metrics for the period
  period_metrics: {
    total_calculations: { type: Number, default: 1 },
    average_score: { type: Number },
    min_score: { type: Number },
    max_score: { type: Number },
    standard_deviation: { type: Number }
  },
  
  // Timestamps
  created_at: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'historical_scores'
});

// Compound indexes for performance
historicalScoreSchema.index({ brand_id: 1, period: 1, period_start: -1 });
historicalScoreSchema.index({ period: 1, period_start: -1 });
historicalScoreSchema.index({ 'metadata.industry': 1, period_start: -1 });
historicalScoreSchema.index({ 'score_data.brand_score': -1, period_start: -1 });

// Pre-save middleware to update timestamps
historicalScoreSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Static methods for trend analysis
historicalScoreSchema.statics.getBrandHistory = function(brandId, period = 'monthly', limit = 24) {
  return this.find({ brand_id: brandId, period: period })
    .sort({ period_start: -1 })
    .limit(limit);
};

historicalScoreSchema.statics.getIndustryTrends = function(industry, period = 'monthly', limit = 12) {
  return this.find({ 'metadata.industry': industry, period: period })
    .sort({ period_start: -1 })
    .limit(limit);
};

historicalScoreSchema.statics.getTopMovers = function(period = 'monthly', limit = 10, direction = 'up') {
  const sortField = direction === 'up' ? 'trend_analysis.score_change' : -1;
  return this.find({ 
    period: period, 
    'trend_analysis.score_change': { $exists: true, $ne: 0 }
  })
  .sort({ 'trend_analysis.score_change': sortField === -1 ? 1 : -1 })
  .limit(limit);
};

historicalScoreSchema.statics.getVolatilityLeaders = function(period = 'monthly', limit = 10) {
  return this.find({ period: period, 'trend_analysis.volatility': { $exists: true } })
    .sort({ 'trend_analysis.volatility': -1 })
    .limit(limit);
};

historicalScoreSchema.statics.getComplianceTrends = function(tag, period = 'monthly', limit = 12) {
  return this.find({ 
    compliance_tags: tag, 
    period: period 
  })
  .sort({ period_start: -1 })
  .limit(limit);
};

// Instance methods for trend calculation
historicalScoreSchema.methods.calculateTrend = function(previousRecord) {
  if (!previousRecord) {
    this.trend_analysis = {
      score_change: 0,
      grade_change: this.score_data.grade,
      trend_direction: 'stable',
      volatility: 0
    };
    return this;
  }

  const scoreChange = this.score_data.brand_score - previousRecord.score_data.brand_score;
  const gradeChange = this.score_data.grade !== previousRecord.score_data.grade ? 
    previousRecord.score_data.grade : null;
  
  let trendDirection = 'stable';
  if (Math.abs(scoreChange) > 2) {
    trendDirection = scoreChange > 0 ? 'improving' : 'declining';
  }

  this.trend_analysis = {
    score_change: Math.round(scoreChange * 100) / 100,
    grade_change: gradeChange,
    trend_direction: trendDirection,
    volatility: this.calculateVolatility(previousRecord)
  };

  // Calculate component trends
  this.component_trends = {
    brand: this.calculateComponentTrend(
      this.score_data.breakdown.brand, 
      previousRecord.score_data.breakdown.brand
    ),
    esg: this.calculateComponentTrend(
      this.score_data.breakdown.esg, 
      previousRecord.score_data.breakdown.esg
    ),
    carbon: this.calculateComponentTrend(
      this.score_data.breakdown.carbon, 
      previousRecord.score_data.breakdown.carbon
    ),
    tnfd: this.calculateComponentTrend(
      this.score_data.breakdown.tnfd, 
      previousRecord.score_data.breakdown.tnfd
    )
  };

  return this;
};

historicalScoreSchema.methods.calculateComponentTrend = function(current, previous) {
  const change = current - previous;
  let direction = 'stable';
  let significance = 'low';

  if (Math.abs(change) > 5) {
    direction = change > 0 ? 'up' : 'down';
    significance = Math.abs(change) > 15 ? 'high' : 'medium';
  }

  return {
    change: Math.round(change * 100) / 100,
    direction: direction,
    significance: significance
  };
};

historicalScoreSchema.methods.calculateVolatility = function(previousRecord) {
  if (!previousRecord) return 0;
  
  // Simple volatility calculation based on score change magnitude
  const change = Math.abs(this.score_data.brand_score - previousRecord.score_data.brand_score);
  const volatility = Math.min((change / 100) * 100, 100);
  
  return Math.round(volatility * 100) / 100;
};

// Virtual fields
historicalScoreSchema.virtual('period_duration_days').get(function() {
  return Math.ceil((this.period_end - this.period_start) / (1000 * 60 * 60 * 24));
});

historicalScoreSchema.virtual('is_current_period').get(function() {
  const now = new Date();
  return now >= this.period_start && now <= this.period_end;
});

// Ensure virtuals are included in JSON output
historicalScoreSchema.set('toJSON', { virtuals: true });
historicalScoreSchema.set('toObject', { virtuals: true });

const HistoricalScore = mongoose.model('HistoricalScore', historicalScoreSchema);

module.exports = HistoricalScore;
