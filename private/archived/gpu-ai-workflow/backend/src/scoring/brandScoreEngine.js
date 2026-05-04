/**
 * BrandOS Brand Score Engine
 * Comprehensive scoring system for brands based on ESG, Carbon, and TNFD metrics
 */

const _ = require('lodash');
const logger = require('../utils/logger');

class BrandScoreEngine {
  constructor() {
    // Scoring weights configuration
    this.weights = {
      brand_identity: 0.25,
      esg_performance: 0.30,
      carbon_footprint: 0.25,
      tnfd_assessment: 0.20
    };

    // Industry benchmarks
    this.benchmarks = {
      technology: {
        brand_identity: 75.0,
        esg: 68.0,
        carbon: 72.0,
        tnfd: 65.0
      },
      retail: {
        brand_identity: 70.0,
        esg: 62.0,
        carbon: 68.0,
        tnfd: 60.0
      },
      finance: {
        brand_identity: 80.0,
        esg: 75.0,
        carbon: 70.0,
        tnfd: 58.0
      },
      manufacturing: {
        brand_identity: 65.0,
        esg: 60.0,
        carbon: 55.0,
        tnfd: 52.0
      },
      healthcare: {
        brand_identity: 78.0,
        esg: 70.0,
        carbon: 65.0,
        tnfd: 60.0
      },
      services: {
        brand_identity: 72.0,
        esg: 65.0,
        carbon: 60.0,
        tnfd: 55.0
      },
      energy: {
        brand_identity: 68.0,
        esg: 72.0,
        carbon: 75.0,
        tnfd: 70.0
      },
      agriculture: {
        brand_identity: 60.0,
        esg: 58.0,
        carbon: 50.0,
        tnfd: 75.0
      }
    };

    // Score categories
    this.categories = {
      excellent: { min: 80, max: 100, label: '優秀', description: '品牌在各維度表現優異，是行業領先者' },
      good: { min: 60, max: 79, label: '良好', description: '品牌表現良好，有明確的改進空間' },
      average: { min: 40, max: 59, label: '平均', description: '品牌表現一般，需要重點改進' },
      poor: { min: 20, max: 39, label: '較差', description: '品牌表現較差，需要立即採取行動' },
      critical: { min: 0, max: 19, label: '危急', description: '品牌處於危急狀態，需要全面改革' }
    };
  }

  /**
   * Calculate comprehensive brand score
   * @param {Object} brandData - Brand identity data
   * @param {Object} esgData - ESG performance data
   * @param {Object} carbonData - Carbon footprint data
   * @param {Object} tnfdData - TNFD assessment data
   * @param {Object} options - Scoring options
   * @returns {Object} Comprehensive scoring result
   */
  async calculateBrandScore(brandData, esgData, carbonData, tnfdData, options = {}) {
    const startTime = Date.now();
    
    try {
      logger.info(`Starting brand score calculation for: ${brandData.brand_id || 'unknown'}`);

      // Calculate individual component scores
      const brandIdentityScore = this.calculateBrandIdentityScore(brandData);
      const esgScore = this.calculateESGScore(esgData);
      const carbonScore = this.calculateCarbonFootprintScore(carbonData);
      const tnfdScore = this.calculateTNFDScore(tnfdData);

      // Apply custom weights if provided
      const weights = { ...this.weights, ...options.weights };

      // Calculate weighted total score
      const totalScore = (
        brandIdentityScore.total_score * weights.brand_identity +
        esgScore.total_score * weights.esg_performance +
        carbonScore.total_score * weights.carbon_footprint +
        tnfdScore.total_score * weights.tnfd_assessment
      );

      // Determine score category
      const category = this.getScoreCategory(totalScore);

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        brandIdentityScore, esgScore, carbonScore, tnfdScore
      );

      // Benchmark comparison
      const benchmarkComparison = this.getBenchmarkComparison(
        brandData.industry || 'technology',
        brandIdentityScore.total_score,
        esgScore.total_score,
        carbonScore.total_score,
        tnfdScore.total_score
      );

      const executionTime = Date.now() - startTime;

      const result = {
        brand_id: brandData.brand_id || '',
        total_score: Math.round(totalScore * 100) / 100,
        category,
        scoring_date: new Date().toISOString(),
        component_scores: {
          brand_identity: {
            score: brandIdentityScore.total_score,
            weight: weights.brand_identity,
            weighted_score: Math.round(brandIdentityScore.total_score * weights.brand_identity * 100) / 100,
            sub_scores: brandIdentityScore
          },
          esg_performance: {
            score: esgScore.total_score,
            weight: weights.esg_performance,
            weighted_score: Math.round(esgScore.total_score * weights.esg_performance * 100) / 100,
            sub_scores: esgScore
          },
          carbon_footprint: {
            score: carbonScore.total_score,
            weight: weights.carbon_footprint,
            weighted_score: Math.round(carbonScore.total_score * weights.carbon_footprint * 100) / 100,
            sub_scores: carbonScore
          },
          tnfd_assessment: {
            score: tnfdScore.total_score,
            weight: weights.tnfd_assessment,
            weighted_score: Math.round(tnfdScore.total_score * weights.tnfd_assessment * 100) / 100,
            sub_scores: tnfdScore
          }
        },
        recommendations,
        benchmark_comparison,
        execution_time_ms: executionTime,
        options_used: options
      };

      logger.info(`Brand score calculation completed: ${result.brand_id} - ${result.total_score}`);
      return result;

    } catch (error) {
      logger.error('Brand score calculation failed:', error);
      throw new Error(`Score calculation failed: ${error.message}`);
    }
  }

  /**
   * Calculate brand identity score
   * @param {Object} brandData - Brand identity data
   * @returns {Object} Brand identity score breakdown
   */
  calculateBrandIdentityScore(brandData) {
    const scores = {
      did_verification: 0,
      credential_completeness: 0,
      brand_consistency: 0,
      reputation_score: 0
    };

    // DID verification score
    if (brandData.did) {
      scores.did_verification = 100;
    }

    // Credential completeness score
    const credentials = brandData.credentials || [];
    if (credentials.length > 0) {
      const requiredCreds = ['brand_registration', 'legal_entity', 'compliance_certificate'];
      const foundCreds = credentials.filter(cred => 
        requiredCreds.includes(cred.type)
      ).length;
      scores.credential_completeness = (foundCreds / requiredCreds.length) * 100;
    }

    // Brand consistency score
    const metadata = brandData.metadata || {};
    if (metadata.name && metadata.industry && metadata.country) {
      scores.brand_consistency = 100;
    }

    // Reputation score (simplified implementation)
    scores.reputation_score = this.calculateReputationScore(brandData);

    // Calculate total score
    const total_score = Object.values(scores).reduce((sum, score) => sum + score, 0) / 4;

    return {
      ...scores,
      total_score: Math.round(total_score * 100) / 100
    };
  }

  /**
   * Calculate ESG score
   * @param {Object} esgData - ESG data
   * @returns {Object} ESG score breakdown
   */
  calculateESGScore(esgData) {
    const scores = {
      environmental_score: 0,
      social_score: 0,
      governance_score: 0,
      sustainability_metrics: 0
    };

    // Environmental score
    if (esgData.carbon_tracking) {
      const carbon = esgData.carbon_tracking;
      const reductionTargets = carbon.reduction_targets || [];
      
      if (reductionTargets.length > 0) {
        scores.environmental_score += 40;
        
        const maxReduction = Math.max(...reductionTargets.map(t => t.reduction_percentage || 0));
        if (maxReduction >= 50) scores.environmental_score += 20;
        else if (maxReduction >= 30) scores.environmental_score += 10;
      }
    }

    // Sustainability metrics score
    if (esgData.sustainability_metrics) {
      const metrics = esgData.sustainability_metrics;
      const renewablePct = metrics.renewable_energy_percentage || 0;
      const recyclingRate = metrics.recycling_rate || 0;
      
      scores.sustainability_metrics = (renewablePct * 0.5) + (recyclingRate * 0.5);
    }

    // Social score
    if (esgData.social_impact) {
      const social = esgData.social_impact;
      const employeeCount = social.employee_count || 0;
      const genderDiversity = social.gender_diversity || 0;
      
      if (employeeCount > 0) scores.social_score += 30;
      
      if (genderDiversity >= 40) scores.social_score += 40;
      else if (genderDiversity >= 30) scores.social_score += 25;
      else if (genderDiversity >= 20) scores.social_score += 10;
    }

    // Governance score
    if (esgData.governance) {
      const governance = esgData.governance;
      const boardIndependence = governance.board_independence || 0;
      const ethicsTraining = governance.ethics_training_completion || 0;
      
      scores.governance_score = (boardIndependence * 0.6) + (ethicsTraining * 0.4);
    }

    // Calculate total score
    const total_score = Object.values(scores).reduce((sum, score) => sum + score, 0) / 4;

    return {
      ...scores,
      total_score: Math.round(total_score * 100) / 100
    };
  }

  /**
   * Calculate carbon footprint score
   * @param {Object} carbonData - Carbon data
   * @returns {Object} Carbon footprint score breakdown
   */
  calculateCarbonFootprintScore(carbonData) {
    const scores = {
      emission_reduction: 0,
      carbon_efficiency: 0,
      renewable_energy: 0,
      carbon_neutral_progress: 0
    };

    // Emission reduction score
    const reductionTargets = carbonData.reduction_targets || [];
    if (reductionTargets.length > 0) {
      const maxReduction = Math.max(...reductionTargets.map(t => t.reduction_percentage || 0));
      
      if (maxReduction >= 50) scores.emission_reduction = 100;
      else if (maxReduction >= 30) scores.emission_reduction = 80;
      else if (maxReduction >= 20) scores.emission_reduction = 60;
      else if (maxReduction >= 10) scores.emission_reduction = 40;
      else scores.emission_reduction = 20;
    }

    // Carbon efficiency score (advertising carbon)
    if (carbonData.advertising_carbon) {
      const adCarbon = carbonData.advertising_carbon;
      const impressions = adCarbon.impressions || 0;
      const carbonKg = adCarbon.carbon_kg || 0;
      
      if (impressions > 0 && carbonKg > 0) {
        const carbonPerMillion = (carbonKg / impressions) * 1000000;
        
        if (carbonPerMillion <= 0.5) scores.carbon_efficiency = 100;
        else if (carbonPerMillion <= 1.0) scores.carbon_efficiency = 80;
        else if (carbonPerMillion <= 2.0) scores.carbon_efficiency = 60;
        else if (carbonPerMillion <= 5.0) scores.carbon_efficiency = 40;
        else scores.carbon_efficiency = 20;
      }
    }

    // Renewable energy score
    if (carbonData.sustainability_metrics) {
      scores.renewable_energy = carbonData.sustainability_metrics.renewable_energy_percentage || 0;
    }

    // Carbon neutral progress score
    const totalEmissions = (carbonData.scope1_emissions || 0) +
                          (carbonData.scope2_emissions || 0) +
                          (carbonData.scope3_emissions || 0);
    
    if (totalEmissions > 0) {
      if (scores.emission_reduction >= 80) scores.carbon_neutral_progress = 80;
      else if (scores.emission_reduction >= 60) scores.carbon_neutral_progress = 60;
      else if (scores.emission_reduction >= 40) scores.carbon_neutral_progress = 40;
      else scores.carbon_neutral_progress = 20;
    }

    // Calculate total score
    const total_score = Object.values(scores).reduce((sum, score) => sum + score, 0) / 4;

    return {
      ...scores,
      total_score: Math.round(total_score * 100) / 100
    };
  }

  /**
   * Calculate TNFD score
   * @param {Object} tnfdData - TNFD data
   * @returns {Object} TNFD score breakdown
   */
  calculateTNFDScore(tnfdData) {
    const scores = {
      biodiversity_impact: 0,
      deforestation_risk: 0,
      ecosystem_services: 0,
      nature_related_risks: 0
    };

    // Biodiversity impact score
    if (tnfdData.biodiversity_assessment) {
      const assessment = tnfdData.biodiversity_assessment;
      const impactLevel = assessment.impact_level || 'unknown';
      
      const impactScores = {
        positive: 100,
        neutral: 70,
        low_negative: 40,
        moderate_negative: 20,
        high_negative: 0
      };
      
      scores.biodiversity_impact = impactScores[impactLevel] || 0;
    }

    // Deforestation risk score
    if (tnfdData.deforestation_risk) {
      const risk = tnfdData.deforestation_risk;
      const riskLevel = risk.risk_level || 'unknown';
      
      const riskScores = {
        very_low: 100,
        low: 80,
        medium: 60,
        high: 30,
        very_high: 0
      };
      
      scores.deforestation_risk = riskScores[riskLevel] || 0;
    }

    // Ecosystem services score
    if (tnfdData.ecosystem_services) {
      scores.ecosystem_services = tnfdData.ecosystem_services.protection_level || 0;
    }

    // Nature related risks score
    if (tnfdData.nature_related_risks) {
      scores.nature_related_risks = tnfdData.nature_related_risks.mitigation_level || 0;
    }

    // Calculate total score
    const total_score = Object.values(scores).reduce((sum, score) => sum + score, 0) / 4;

    return {
      ...scores,
      total_score: Math.round(total_score * 100) / 100
    };
  }

  /**
   * Calculate reputation score (simplified)
   * @param {Object} brandData - Brand data
   * @returns {number} Reputation score
   */
  calculateReputationScore(brandData) {
    const metadata = brandData.metadata || {};
    const registrationDate = metadata.registration_date;

    if (registrationDate) {
      try {
        const regDate = new Date(registrationDate);
        const daysSinceRegistration = (Date.now() - regDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceRegistration >= 365 * 5) return 80;
        if (daysSinceRegistration >= 365 * 2) return 60;
        if (daysSinceRegistration >= 365) return 40;
        return 20;
      } catch (error) {
        logger.warn('Invalid registration date format:', error);
      }
    }

    return 50; // Default score
  }

  /**
   * Get score category based on score value
   * @param {number} score - Score value
   * @returns {Object} Score category
   */
  getScoreCategory(score) {
    for (const [key, category] of Object.entries(this.categories)) {
      if (score >= category.min && score <= category.max) {
        return {
          value: key,
          label: category.label,
          description: category.description
        };
      }
    }
    return this.categories.critical;
  }

  /**
   * Generate improvement recommendations
   * @param {Object} brandIdentity - Brand identity scores
   * @param {Object} esg - ESG scores
   * @param {Object} carbon - Carbon scores
   * @param {Object} tnfd - TNFD scores
   * @returns {Array} List of recommendations
   */
  generateRecommendations(brandIdentity, esg, carbon, tnfd) {
    const recommendations = [];

    // Brand identity recommendations
    if (brandIdentity.did_verification < 100) {
      recommendations.push('完善 DID 驗證，確保品牌身份的可信度');
    }
    if (brandIdentity.credential_completeness < 80) {
      recommendations.push('補充必要的品牌憑證，提高完整性');
    }

    // ESG recommendations
    if (esg.environmental_score < 60) {
      recommendations.push('加強環境管理，設定更具雄心的減排目標');
    }
    if (esg.social_score < 60) {
      recommendations.push('提升社會責任表現，改善員工多樣性和福利');
    }
    if (esg.governance_score < 60) {
      recommendations.push('完善公司治理結構，提高董事會獨立性');
    }

    // Carbon recommendations
    if (carbon.emission_reduction < 60) {
      recommendations.push('制定更積極的碳減排策略和時間表');
    }
    if (carbon.carbon_efficiency < 60) {
      recommendations.push('優化廣告投放策略，降低單位曝光的碳排放');
    }
    if (carbon.renewable_energy < 60) {
      recommendations.push('增加可再生能源使用比例');
    }

    // TNFD recommendations
    if (tnfd.biodiversity_impact < 60) {
      recommendations.push('評估並改善對生物多樣性的影響');
    }
    if (tnfd.deforestation_risk < 60) {
      recommendations.push('加強森林保護措施，降低森林砍伐風險');
    }

    return recommendations;
  }

  /**
   * Get benchmark comparison
   * @param {string} industry - Industry name
   * @param {number} brandScore - Brand identity score
   * @param {number} esgScore - ESG score
   * @param {number} carbonScore - Carbon score
   * @param {number} tnfdScore - TNFD score
   * @returns {Object} Benchmark comparison
   */
  getBenchmarkComparison(industry, brandScore, esgScore, carbonScore, tnfdScore) {
    const benchmark = this.benchmarks[industry] || this.benchmarks.technology;

    return {
      brand_identity_vs_benchmark: Math.round((brandScore - benchmark.brand_identity) * 100) / 100,
      esg_vs_benchmark: Math.round((esgScore - benchmark.esg) * 100) / 100,
      carbon_vs_benchmark: Math.round((carbonScore - benchmark.carbon) * 100) / 100,
      tnfd_vs_benchmark: Math.round((tnfdScore - benchmark.tnfd) * 100) / 100,
      overall_vs_benchmark: Math.round(((brandScore + esgScore + carbonScore + tnfdScore) / 4 - 
        Object.values(benchmark).reduce((sum, val) => sum + val, 0) / 4) * 100) / 100
    };
  }

  /**
   * Batch calculate scores for multiple brands
   * @param {Array} requests - Array of scoring requests
   * @param {Object} options - Batch options
   * @returns {Array} Array of scoring results
   */
  async batchCalculateScores(requests, options = {}) {
    const results = [];
    const { parallel = true } = options;

    if (parallel) {
      // Process in parallel
      const promises = requests.map(async (request) => {
        try {
          return await this.calculateBrandScore(
            request.brand,
            request.esg,
            request.carbon,
            request.tnfd,
            request.options || {}
          );
        } catch (error) {
          return {
            success: false,
            brand_id: request.brand?.brand_id || 'unknown',
            error: error.message
          };
        }
      });

      return await Promise.all(promises);
    } else {
      // Process sequentially
      for (const request of requests) {
        try {
          const result = await this.calculateBrandScore(
            request.brand,
            request.esg,
            request.carbon,
            request.tnfd,
            request.options || {}
          );
          results.push({ success: true, ...result });
        } catch (error) {
          results.push({
            success: false,
            brand_id: request.brand?.brand_id || 'unknown',
            error: error.message
          });
        }
      }
      return results;
    }
  }

  /**
   * Get industry benchmarks
   * @returns {Object} Industry benchmarks
   */
  getIndustryBenchmarks() {
    return this.benchmarks;
  }

  /**
   * Get scoring weights
   * @returns {Object} Scoring weights
   */
  getScoringWeights() {
    return this.weights;
  }

  /**
   * Update scoring weights
   * @param {Object} newWeights - New weight configuration
   */
  updateScoringWeights(newWeights) {
    const totalWeight = Object.values(newWeights).reduce((sum, weight) => sum + weight, 0);
    
    if (Math.abs(totalWeight - 1.0) > 0.01) {
      throw new Error(`Weights must sum to 1.0, current sum: ${totalWeight}`);
    }

    this.weights = { ...this.weights, ...newWeights };
    logger.info('Scoring weights updated:', this.weights);
  }
}

module.exports = BrandScoreEngine;
