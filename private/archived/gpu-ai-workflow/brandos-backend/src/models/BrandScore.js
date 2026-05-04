/**
 * BrandOS AI Infrastructure - BrandScore Model
 * MongoDB schema for storing brand score calculations
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * BrandScore Schema
 * Stores individual brand score calculations with full breakdown
 */
const brandScoreSchema = new Schema({
  // Brand identification
  brand_id: {
    type: String,
    required: true,
    index: true,
    description: 'Unique identifier for the brand'
  },
  
  // Score results
  brand_score: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    index: true,
    description: 'Final brand score (0-100)'
  },
  
  grade: {
    type: String,
    required: true,
    enum: ['AAA', 'AA', 'A', 'BBB', 'Risk'],
    index: true,
    description: 'Credit-style grade based on score'
  },
  
  confidence: {
    type: Number,
    required: true,
    min: 0.8,
    max: 0.95,
    description: 'Confidence score based on data completeness'
  },
  
  verified: {
    type: Boolean,
    required: true,
    default: true,
    description: 'Whether the result has been verified'
  },
  
  hash: {
    type: String,
    required: true,
    unique: true,
    description: 'SHA-256 hash of input data for verification'
  },
  
  // Component breakdown
  breakdown: {
    brand: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      description: 'Brand perception component score'
    },
    esg: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      description: 'ESG component score'
    },
    carbon: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      description: 'Carbon footprint component score'
    },
    tnfd: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      description: 'TNFD component score'
    }
  },
  
  // Input data (for verification and historical tracking)
  input_data: {
    brand: {
      mentions: { type: Number, required: true },
      sentiment: { type: Number, required: true, min: -1, max: 1 },
      nps: { type: Number, required: true, min: -100, max: 100 }
    },
    esg: {
      e: { type: Number, required: true, min: 0, max: 100 },
      s: { type: Number, required: true, min: 0, max: 100 },
      g: { type: Number, required: true, min: 0, max: 100 }
    },
    carbon: {
      total_emission: { type: Number, required: true, min: 0 }
    },
    tnfd: {
      dependency: { type: Number, required: true, min: 0, max: 1 },
      impact: { type: Number, required: true, min: 0, max: 1 },
      risk: { type: Number, required: true, min: 0, max: 1 }
    }
  },
  
  // Metadata
  metadata: {
    industry: { type: String, index: true },
    region: { type: String, index: true },
    reporting_period: { type: String },
    source: { type: String, default: 'api' },
    version: { type: String, default: '1.0' }
  },
  
  // Compliance tags
  compliance_tags: [{
    type: String,
    enum: ['ESG_Compliant', 'TNFD_Compliant', 'Carbon_Neutral', 'Sustainable', 'High_Risk'],
    description: 'Compliance and risk assessment tags'
  }],
  
  // Execution metrics
  execution_time_ms: {
    type: Number,
    required: true,
    description: 'Time taken to calculate the score in milliseconds'
  },
  
  // Request tracking
  request_id: { type: String },
  user_agent: { type: String },
  ip_address: { type: String },
  
  // Timestamps
  created_at: {
    type: Date,
    default: Date.now,
    index: true,
    description: 'When the score was calculated'
  },
  
  updated_at: {
    type: Date,
    default: Date.now,
    description: 'When the record was last updated'
  }
}, {
  timestamps: true,
  collection: 'brand_scores'
});

// Compound indexes for performance
brandScoreSchema.index({ brand_id: 1, created_at: -1 });
brandScoreSchema.index({ grade: 1, brand_score: -1 });
brandScoreSchema.index({ 'metadata.industry': 1, brand_score: -1 });
brandScoreSchema.index({ created_at: -1 });
brandScoreSchema.index({ brand_score: -1 });

// Text index for search functionality
brandScoreSchema.index({ 
  'brand_id': 'text', 
  'metadata.industry': 'text',
  'metadata.region': 'text'
});

// Pre-save middleware to update timestamps
brandScoreSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Static methods
brandScoreSchema.statics.findByBrandId = function(brandId, limit = 10) {
  return this.find({ brand_id: brandId })
    .sort({ created_at: -1 })
    .limit(limit);
};

brandScoreSchema.statics.findByGrade = function(grade, limit = 50) {
  return this.find({ grade: grade })
    .sort({ brand_score: -1, created_at: -1 })
    .limit(limit);
};

brandScoreSchema.statics.findByIndustry = function(industry, limit = 50) {
  return this.find({ 'metadata.industry': industry })
    .sort({ brand_score: -1, created_at: -1 })
    .limit(limit);
};

brandScoreSchema.statics.getTopScores = function(limit = 100, grade = null) {
  const query = grade ? { grade: grade } : {};
  return this.find(query)
    .sort({ brand_score: -1, created_at: -1 })
    .limit(limit);
};

brandScoreSchema.statics.getComplianceStats = function() {
  return this.aggregate([
    { $unwind: '$compliance_tags' },
    { $group: { _id: '$compliance_tags', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
};

// Instance methods
brandScoreSchema.methods.addComplianceTag = function(tag) {
  if (!this.compliance_tags.includes(tag)) {
    this.compliance_tags.push(tag);
  }
  return this.save();
};

brandScoreSchema.methods.removeComplianceTag = function(tag) {
  this.compliance_tags = this.compliance_tags.filter(t => t !== tag);
  return this.save();
};

brandScoreSchema.methods.isCompliant = function(tag) {
  return this.compliance_tags.includes(tag);
};

// Virtual fields
brandScoreSchema.virtual('age_days').get(function() {
  return Math.floor((Date.now() - this.created_at.getTime()) / (1000 * 60 * 60 * 24));
});

brandScoreSchema.virtual('is_recent').get(function() {
  return this.age_days <= 30;
});

// Ensure virtuals are included in JSON output
brandScoreSchema.set('toJSON', { virtuals: true });
brandScoreSchema.set('toObject', { virtuals: true });

const BrandScore = mongoose.model('BrandScore', brandScoreSchema);

module.exports = BrandScore;
