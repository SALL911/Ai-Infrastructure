/**
 * BrandOS AI Infrastructure - ComplianceTag Model
 * MongoDB schema for ESG and TNFD compliance tagging system
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * ComplianceTag Schema
 * Stores compliance tags and their criteria for ESG and TNFD assessments
 */
const complianceTagSchema = new Schema({
  // Tag identification
  tag_name: {
    type: String,
    required: true,
    unique: true,
    enum: ['ESG_Compliant', 'TNFD_Compliant', 'Carbon_Neutral', 'Sustainable', 'High_Risk'],
    description: 'Name of the compliance tag'
  },
  
  // Tag classification
  category: {
    type: String,
    required: true,
    enum: ['ESG', 'TNFD', 'Carbon', 'Sustainability', 'Risk'],
    index: true,
    description: 'Category of the compliance tag'
  },
  
  // Tag criteria and thresholds
  criteria: {
    // Minimum score requirements
    min_total_score: {
      type: Number,
      min: 0,
      max: 100,
      description: 'Minimum total brand score required'
    },
    
    // Component-specific requirements
    component_requirements: {
      brand: {
        min_score: { type: Number, min: 0, max: 100 },
        required: { type: Boolean, default: false }
      },
      esg: {
        min_score: { type: Number, min: 0, max: 100 },
        required: { type: Boolean, default: false },
        sub_components: {
          environmental: { min_score: Number, required: Boolean },
          social: { min_score: Number, required: Boolean },
          governance: { min_score: Number, required: Boolean }
        }
      },
      carbon: {
        min_score: { type: Number, min: 0, max: 100 },
        required: { type: Boolean, default: false },
        max_emission: { type: Number, min: 0 }, // kg CO2e
        renewable_percentage: { type: Number, min: 0, max: 100 }
      },
      tnfd: {
        min_score: { type: Number, min: 0, max: 100 },
        required: { type: Boolean, default: false },
        max_risk: { type: Number, min: 0, max: 1 },
        max_impact: { type: Number, min: 0, max: 1 },
        max_dependency: { type: Number, min: 0, max: 1 }
      }
    },
    
    // Grade requirements
    min_grade: {
      type: String,
      enum: ['AAA', 'AA', 'A', 'BBB'],
      description: 'Minimum grade required'
    },
    
    // Confidence requirements
    min_confidence: {
      type: Number,
      min: 0.8,
      max: 0.95,
      description: 'Minimum confidence score required'
    }
  },
  
  // Tag metadata
  description: {
    type: String,
    required: true,
    description: 'Description of what the tag represents'
  },
  
  icon: {
    type: String,
    description: 'Icon or emoji representing the tag'
  },
  
  color: {
    type: String,
    default: '#000000',
    description: 'Color code for the tag (hex format)'
  },
  
  // Tag status and lifecycle
  is_active: {
    type: Boolean,
    default: true,
    index: true,
    description: 'Whether the tag is currently active'
  },
  
  version: {
    type: String,
    default: '1.0',
    description: 'Version of the tag criteria'
  },
  
  // Regulatory references
  regulatory_references: [{
    framework: { type: String }, // e.g., 'EU Taxonomy', 'SFDR', 'TNFD'
    standard: { type: String },  // e.g., 'Article 8', 'Article 9'
    url: { type: String },
    last_updated: { type: Date }
  }],
  
  // Application statistics
  statistics: {
    total_applications: { type: Number, default: 0 },
    current_applications: { type: Number, default: 0 },
    average_score: { type: Number, default: 0 },
    last_applied: { type: Date }
  },
  
  // Timestamps
  created_at: {
    type: Date,
    default: Date.now,
    description: 'When the tag was created'
  },
  
  updated_at: {
    type: Date,
    default: Date.now,
    description: 'When the tag was last updated'
  }
}, {
  timestamps: true,
  collection: 'compliance_tags'
});

// Indexes for performance
complianceTagSchema.index({ category: 1, is_active: 1 });
complianceTagSchema.index({ tag_name: 1 });
complianceTagSchema.index({ 'criteria.min_total_score': 1 });

// Pre-save middleware to update timestamps
complianceTagSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Static methods for tag management
complianceTagSchema.statics.getActiveTags = function(category = null) {
  const query = { is_active: true };
  if (category) {
    query.category = category;
  }
  return this.find(query).sort({ tag_name: 1 });
};

complianceTagSchema.statics.getTagsByCategory = function() {
  return this.aggregate([
    { $match: { is_active: true } },
    { $group: { _id: '$category', tags: { $push: '$$ROOT' } } },
    { $sort: { _id: 1 } }
  ]);
};

complianceTagSchema.statics.getApplicableTags = function(scoreData) {
  return this.find({ is_active: true }).then(tags => {
    return tags.filter(tag => tag.isApplicable(scoreData));
  });
};

// Instance methods
complianceTagSchema.methods.isApplicable = function(scoreData) {
  const criteria = this.criteria;
  
  // Check total score requirement
  if (criteria.min_total_score && scoreData.brand_score < criteria.min_total_score) {
    return false;
  }
  
  // Check grade requirement
  if (criteria.min_grade) {
    const gradeOrder = ['Risk', 'BBB', 'A', 'AA', 'AAA'];
    const requiredGradeIndex = gradeOrder.indexOf(criteria.min_grade);
    const actualGradeIndex = gradeOrder.indexOf(scoreData.grade);
    
    if (actualGradeIndex < requiredGradeIndex) {
      return false;
    }
  }
  
  // Check confidence requirement
  if (criteria.min_confidence && scoreData.confidence < criteria.min_confidence) {
    return false;
  }
  
  // Check component requirements
  const compReqs = criteria.component_requirements;
  
  // Brand component
  if (compReqs.brand.required && (!compReqs.brand.min_score || scoreData.breakdown.brand < compReqs.brand.min_score)) {
    return false;
  }
  
  // ESG component
  if (compReqs.esg.required) {
    if (compReqs.esg.min_score && scoreData.breakdown.esg < compReqs.esg.min_score) {
      return false;
    }
    
    // Check ESG sub-components if input data is available
    if (scoreData.input_data && scoreData.input_data.esg) {
      const esgData = scoreData.input_data.esg;
      
      if (compReqs.esg.sub_components.environmental.required && 
          (!compReqs.esg.sub_components.environmental.min_score || esgData.e < compReqs.esg.sub_components.environmental.min_score)) {
        return false;
      }
      
      if (compReqs.esg.sub_components.social.required && 
          (!compReqs.esg.sub_components.social.min_score || esgData.s < compReqs.esg.sub_components.social.min_score)) {
        return false;
      }
      
      if (compReqs.esg.sub_components.governance.required && 
          (!compReqs.esg.sub_components.governance.min_score || esgData.g < compReqs.esg.sub_components.governance.min_score)) {
        return false;
      }
    }
  }
  
  // Carbon component
  if (compReqs.carbon.required) {
    if (compReqs.carbon.min_score && scoreData.breakdown.carbon < compReqs.carbon.min_score) {
      return false;
    }
    
    // Check carbon-specific criteria if input data is available
    if (scoreData.input_data && scoreData.input_data.carbon) {
      const carbonData = scoreData.input_data.carbon;
      
      if (compReqs.carbon.max_emission && carbonData.total_emission > compReqs.carbon.max_emission) {
        return false;
      }
      
      // Check renewable energy percentage if available in metadata
      if (compReqs.carbon.renewable_percentage && scoreData.metadata) {
        // This would need to be calculated from carbon data or provided separately
        // For now, we'll assume it's not available
      }
    }
  }
  
  // TNFD component
  if (compReqs.tnfd.required) {
    if (compReqs.tnfd.min_score && scoreData.breakdown.tnfd < compReqs.tnfd.min_score) {
      return false;
    }
    
    // Check TNFD-specific criteria if input data is available
    if (scoreData.input_data && scoreData.input_data.tnfd) {
      const tnfdData = scoreData.input_data.tnfd;
      
      if (compReqs.tnfd.max_risk && tnfdData.risk > compReqs.tnfd.max_risk) {
        return false;
      }
      
      if (compReqs.tnfd.max_impact && tnfdData.impact > compReqs.tnfd.max_impact) {
        return false;
      }
      
      if (compReqs.tnfd.max_dependency && tnfdData.dependency > compReqs.tnfd.max_dependency) {
        return false;
      }
    }
  }
  
  return true;
};

complianceTagSchema.methods.applyTag = function(brandScoreId) {
  const BrandScore = mongoose.model('BrandScore');
  return BrandScore.findById(brandScoreId).then(brandScore => {
    if (!brandScore) {
      throw new Error('Brand score not found');
    }
    
    return brandScore.addComplianceTag(this.tag_name);
  });
};

complianceTagSchema.methods.updateStatistics = function() {
  const BrandScore = mongoose.model('BrandScore');
  
  return BrandScore.find({ compliance_tags: this.tag_name }).then(scores => {
    this.statistics.total_applications = scores.length;
    this.statistics.current_applications = scores.filter(s => s.is_recent).length;
    
    if (scores.length > 0) {
      const avgScore = scores.reduce((sum, s) => sum + s.brand_score, 0) / scores.length;
      this.statistics.average_score = Math.round(avgScore * 100) / 100;
      
      const lastApplied = scores.reduce((latest, s) => {
        return s.created_at > latest ? s.created_at : latest;
      }, scores[0].created_at);
      
      this.statistics.last_applied = lastApplied;
    }
    
    return this.save();
  });
};

// Virtual fields
complianceTagSchema.virtual('is_esg_tag').get(function() {
  return this.category === 'ESG';
});

complianceTagSchema.virtual('is_tnfd_tag').get(function() {
  return this.category === 'TNFD';
});

complianceTagSchema.virtual('is_carbon_tag').get(function() {
  return this.category === 'Carbon';
});

complianceTagSchema.virtual('is_sustainability_tag').get(function() {
  return this.category === 'Sustainability';
});

complianceTagSchema.virtual('is_risk_tag').get(function() {
  return this.category === 'Risk';
});

// Ensure virtuals are included in JSON output
complianceTagSchema.set('toJSON', { virtuals: true });
complianceTagSchema.set('toObject', { virtuals: true });

const ComplianceTag = mongoose.model('ComplianceTag', complianceTagSchema);

module.exports = ComplianceTag;
