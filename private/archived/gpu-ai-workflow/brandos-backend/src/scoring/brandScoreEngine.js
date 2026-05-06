/**
 * BrandOS AI Infrastructure - Brand Score Engine
 * Implements the BrandOS scoring algorithm for comprehensive brand evaluation
 */

const crypto = require('crypto');
const logger = require('../utils/logger');

class BrandScoreEngine {
  constructor() {
    /**
     * Scoring weights configuration
     * These weights determine how each component contributes to the final score
     */
    this.weights = {
      brand_perception: 0.30,  // 30% weight for brand perception
      esg: 0.25,              // 25% weight for ESG performance
      carbon: 0.20,           // 20% weight for carbon footprint
      tnfd: 0.25              // 25% weight for TNFD assessment
    };

    /**
     * Grade thresholds for final score classification
     * Based on standard credit rating systems
     */
    this.gradeThresholds = {
      'AAA': 90,    // Excellent - Minimal risk
      'AA': 80,     // Very Good - Low risk
      'A': 70,      // Good - Moderate risk
      'BBB': 60,    // Adequate - Acceptable risk
      'Risk': 0     // Below acceptable - High risk
    };
  }

  /**
   * Calculate Brand Perception Score
   * Formula: (sentiment * 50) + (nps * 0.5)
   * 
   * @param {Object} brandData - Brand perception data
   * @param {number} brandData.sentiment - Sentiment score (-1 to 1)
   * @param {number} brandData.nps - Net Promoter Score (-100 to 100)
   * @param {number} brandData.mentions - Number of mentions (for logging)
   * @returns {number} Brand perception score (0-100)
   */
  calculateBrandPerceptionScore(brandData) {
    const { sentiment, nps, mentions } = brandData;

    // Validate inputs
    if (typeof sentiment !== 'number' || typeof nps !== 'number') {
      throw new Error('Brand sentiment and NPS must be numbers');
    }

    // Normalize sentiment from -1 to 1 range to 0-100 scale
    const normalizedSentiment = Math.max(0, Math.min(100, (sentiment + 1) * 50));
    
    // Normalize NPS from -100 to 100 range to 0-100 scale
    const normalizedNPS = Math.max(0, Math.min(100, (nps + 100) * 0.5));

    // Apply BrandOS formula: (sentiment * 50) + (nps * 0.5)
    // Using normalized values to ensure 0-100 range
    const score = (normalizedSentiment * 0.5) + (normalizedNPS * 0.5);

    logger.debug(`Brand Perception Score: sentiment=${sentiment}, nps=${nps}, score=${score.toFixed(2)}, mentions=${mentions || 0}`);

    return Math.round(score * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate ESG Score
   * Formula: (e + s + g) / 3
   * 
   * @param {Object} esgData - ESG performance data
   * @param {number} esgData.e - Environmental score (0-100)
   * @param {number} esgData.s - Social score (0-100)
   * @param {number} esgData.g - Governance score (0-100)
   * @returns {number} ESG score (0-100)
   */
  calculateESGScore(esgData) {
    const { e, s, g } = esgData;

    // Validate inputs
    [e, s, g].forEach((value, index) => {
      const labels = ['Environmental', 'Social', 'Governance'];
      if (typeof value !== 'number' || value < 0 || value > 100) {
        throw new Error(`${labels[index]} score must be a number between 0 and 100`);
      }
    });

    // Apply BrandOS formula: (e + s + g) / 3
    const score = (e + s + g) / 3;

    logger.debug(`ESG Score: e=${e}, s=${s}, g=${g}, average=${score.toFixed(2)}`);

    return Math.round(score * 100) / 100;
  }

  /**
   * Calculate Carbon Score
   * Formula: 100 - normalized(total_emission)
   * 
   * @param {Object} carbonData - Carbon footprint data
   * @param {number} carbonData.total_emission - Total carbon emission in kg CO2e
   * @returns {number} Carbon score (0-100)
   */
  calculateCarbonScore(carbonData) {
    const { total_emission } = carbonData;

    // Validate input
    if (typeof total_emission !== 'number' || total_emission < 0) {
      throw new Error('Total emission must be a non-negative number');
    }

    // Normalize emission to 0-100 scale
    // Using logarithmic scale for better distribution
    // 0 emissions = 100 score
    // 10,000 kg CO2e = 0 score (baseline)
    // Higher emissions use logarithmic scaling
    let normalizedEmission;
    const baselineEmission = 10000; // kg CO2e

    if (total_emission === 0) {
      normalizedEmission = 0;
    } else if (total_emission <= baselineEmission) {
      // Linear scaling for 0 to baseline
      normalizedEmission = (total_emission / baselineEmission) * 100;
    } else {
      // Logarithmic scaling for emissions above baseline
      normalizedEmission = 100 + Math.log10(total_emission / baselineEmission) * 20;
      normalizedEmission = Math.min(normalizedEmission, 100); // Cap at 100
    }

    // Apply BrandOS formula: 100 - normalized(total_emission)
    const score = Math.max(0, 100 - normalizedEmission);

    logger.debug(`Carbon Score: emission=${total_emission}kg, normalized=${normalizedEmission.toFixed(2)}, score=${score.toFixed(2)}`);

    return Math.round(score * 100) / 100;
  }

  /**
   * Calculate TNFD Score
   * Formula: (1 - risk) * 50 + (1 - impact) * 30 + (1 - dependency) * 20
   * 
   * @param {Object} tnfdData - TNFD assessment data
   * @param {number} tnfdData.dependency - Nature dependency score (0-1)
   * @param {number} tnfdData.impact - Nature impact score (0-1)
   * @param {number} tnfdData.risk - Nature-related risk score (0-1)
   * @returns {number} TNFD score (0-100)
   */
  calculateTNFDScore(tnfdData) {
    const { dependency, impact, risk } = tnfdData;

    // Validate inputs
    [dependency, impact, risk].forEach((value, index) => {
      const labels = ['Dependency', 'Impact', 'Risk'];
      if (typeof value !== 'number' || value < 0 || value > 1) {
        throw new Error(`${labels[index]} score must be a number between 0 and 1`);
      }
    });

    // Apply BrandOS formula: (1 - risk) * 50 + (1 - impact) * 30 + (1 - dependency) * 20
    const riskComponent = (1 - risk) * 50;
    const impactComponent = (1 - impact) * 30;
    const dependencyComponent = (1 - dependency) * 20;

    const score = riskComponent + impactComponent + dependencyComponent;

    logger.debug(`TNFD Score: risk=${risk}, impact=${impact}, dependency=${dependency}, components=[${riskComponent.toFixed(1)}, ${impactComponent.toFixed(1)}, ${dependencyComponent.toFixed(1)}], total=${score.toFixed(2)}`);

    return Math.round(score * 100) / 100;
  }

  /**
   * Calculate Final Brand Score
   * Formula: 0.30 * Brand Perception + 0.25 * ESG + 0.20 * Carbon + 0.25 * TNFD
   * 
   * @param {Object} componentScores - Individual component scores
   * @param {number} componentScores.brand - Brand perception score (0-100)
   * @param {number} componentScores.esg - ESG score (0-100)
   * @param {number} componentScores.carbon - Carbon score (0-100)
   * @param {number} componentScores.tnfd - TNFD score (0-100)
   * @returns {number} Final brand score (0-100)
   */
  calculateFinalScore(componentScores) {
    const { brand, esg, carbon, tnfd } = componentScores;

    // Validate inputs
    Object.entries(componentScores).forEach(([key, value]) => {
      if (typeof value !== 'number' || value < 0 || value > 100) {
        throw new Error(`${key} score must be a number between 0 and 100`);
      }
    });

    // Apply BrandOS formula with configured weights
    const brandComponent = brand * this.weights.brand_perception;
    const esgComponent = esg * this.weights.esg;
    const carbonComponent = carbon * this.weights.carbon;
    const tnfdComponent = tnfd * this.weights.tnfd;

    const finalScore = brandComponent + esgComponent + carbonComponent + tnfdComponent;

    logger.debug(`Final Score: brand=${brandComponent.toFixed(2)}, esg=${esgComponent.toFixed(2)}, carbon=${carbonComponent.toFixed(2)}, tnfd=${tnfdComponent.toFixed(2)}, total=${finalScore.toFixed(2)}`);

    return Math.round(finalScore * 100) / 100;
  }

  /**
   * Determine grade based on final score
   * 
   * @param {number} score - Final brand score (0-100)
   * @returns {string} Grade (AAA, AA, A, BBB, Risk)
   */
  determineGrade(score) {
    // Find the highest grade the score qualifies for
    for (const [grade, threshold] of Object.entries(this.gradeThresholds)) {
      if (score >= threshold) {
        return grade;
      }
    }
    return 'Risk';
  }

  /**
   * Generate SHA-256 hash of input data for verification
   * 
   * @param {Object} inputData - Complete input data object
   * @returns {string} SHA-256 hash as hexadecimal string
   */
  generateHash(inputData) {
    // Create a canonical string representation of the data
    const canonicalData = JSON.stringify(inputData, Object.keys(inputData).sort());
    
    // Generate SHA-256 hash
    const hash = crypto.createHash('sha256').update(canonicalData).digest('hex');
    
    logger.debug(`Generated hash: ${hash.substring(0, 16)}... for ${Object.keys(inputData).length} fields`);
    
    return hash;
  }

  /**
   * Calculate confidence score based on data completeness
   * Range: 0.8 to 0.95 based on available data
   * 
   * @param {Object} inputData - Complete input data object
   * @returns {number} Confidence score (0.8-0.95)
   */
  calculateConfidence(inputData) {
    const requiredFields = [
      'brand.mentions', 'brand.sentiment', 'brand.nps',
      'esg.e', 'esg.s', 'esg.g',
      'carbon.total_emission',
      'tnfd.dependency', 'tnfd.impact', 'tnfd.risk'
    ];

    let availableFields = 0;
    let validFields = 0;

    // Check each required field
    requiredFields.forEach(fieldPath => {
      const value = this.getNestedValue(inputData, fieldPath);
      
      if (value !== undefined && value !== null) {
        availableFields++;
        
        // Additional validation for numeric fields
        if (typeof value === 'number' && !isNaN(value)) {
          validFields++;
        }
      }
    });

    // Base confidence on data completeness
    const completenessRatio = validFields / requiredFields.length;
    
    // Map completeness ratio to confidence score (0.8 to 0.95)
    const confidence = 0.8 + (completenessRatio * 0.15);
    
    logger.debug(`Confidence: ${validFields}/${requiredFields.length} fields valid, confidence=${confidence.toFixed(3)}`);
    
    return Math.round(confidence * 1000) / 1000; // Round to 3 decimal places
  }

  /**
   * Helper function to get nested object values by path
   * 
   * @param {Object} obj - Object to search
   * @param {string} path - Dot-separated path (e.g., 'brand.sentiment')
   * @returns {*} Value at path or undefined
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Comprehensive brand score calculation
   * Main entry point for the scoring engine
   * 
   * @param {Object} inputData - Complete input data with all components
   * @returns {Object} Complete scoring result with all components
   */
  async calculateBrandScore(inputData) {
    const startTime = Date.now();
    
    try {
      logger.info('Starting brand score calculation');

      // Validate input structure
      this.validateInputData(inputData);

      // Calculate individual component scores
      const brandPerceptionScore = this.calculateBrandPerceptionScore(inputData.brand);
      const esgScore = this.calculateESGScore(inputData.esg);
      const carbonScore = this.calculateCarbonScore(inputData.carbon);
      const tnfdScore = this.calculateTNFDScore(inputData.tnfd);

      // Calculate final score
      const finalScore = this.calculateFinalScore({
        brand: brandPerceptionScore,
        esg: esgScore,
        carbon: carbonScore,
        tnfd: tnfdScore
      });

      // Determine grade
      const grade = this.determineGrade(finalScore);

      // Generate verification hash
      const hash = this.generateHash(inputData);

      // Calculate confidence score
      const confidence = this.calculateConfidence(inputData);

      // Prepare result breakdown
      const breakdown = {
        brand: brandPerceptionScore,
        esg: esgScore,
        carbon: carbonScore,
        tnfd: tnfdScore
      };

      const executionTime = Date.now() - startTime;

      const result = {
        brand_score: finalScore,
        grade,
        confidence,
        verified: true,
        hash,
        breakdown,
        execution_time_ms: executionTime,
        timestamp: new Date().toISOString()
      };

      logger.info(`Brand score calculated successfully: ${finalScore} (${grade}), confidence: ${confidence}, time: ${executionTime}ms`);

      return result;

    } catch (error) {
      logger.error('Brand score calculation failed:', error);
      throw error;
    }
  }

  /**
   * Validate input data structure and required fields
   * 
   * @param {Object} inputData - Input data to validate
   * @throws {Error} If validation fails
   */
  validateInputData(inputData) {
    if (!inputData || typeof inputData !== 'object') {
      throw new Error('Input data must be a valid object');
    }

    // Check required top-level components
    const requiredComponents = ['brand', 'esg', 'carbon', 'tnfd'];
    requiredComponents.forEach(component => {
      if (!inputData[component] || typeof inputData[component] !== 'object') {
        throw new Error(`Missing or invalid ${component} component`);
      }
    });

    // Validate brand component
    const brandFields = ['mentions', 'sentiment', 'nps'];
    brandFields.forEach(field => {
      if (typeof inputData.brand[field] !== 'number') {
        throw new Error(`Brand ${field} must be a number`);
      }
    });

    // Validate ESG component
    const esgFields = ['e', 's', 'g'];
    esgFields.forEach(field => {
      if (typeof inputData.esg[field] !== 'number' || 
          inputData.esg[field] < 0 || inputData.esg[field] > 100) {
        throw new Error(`ESG ${field} must be a number between 0 and 100`);
      }
    });

    // Validate carbon component
    if (typeof inputData.carbon.total_emission !== 'number' || 
        inputData.carbon.total_emission < 0) {
      throw new Error('Carbon total_emission must be a non-negative number');
    }

    // Validate TNFD component
    const tnfdFields = ['dependency', 'impact', 'risk'];
    tnfdFields.forEach(field => {
      if (typeof inputData.tnfd[field] !== 'number' || 
          inputData.tnfd[field] < 0 || inputData.tnfd[field] > 1) {
        throw new Error(`TNFD ${field} must be a number between 0 and 1`);
      }
    });

    logger.debug('Input data validation passed');
  }

  /**
   * Get current scoring configuration
   * 
   * @returns {Object} Current weights and thresholds
   */
  getConfiguration() {
    return {
      weights: this.weights,
      gradeThresholds: this.gradeThresholds
    };
  }

  /**
   * Update scoring configuration
   * 
   * @param {Object} config - New configuration
   * @param {Object} config.weights - New weight configuration
   * @param {Object} config.gradeThresholds - New grade thresholds
   */
  updateConfiguration(config) {
    if (config.weights) {
      // Validate weights sum to 1
      const weightSum = Object.values(config.weights).reduce((sum, weight) => sum + weight, 0);
      if (Math.abs(weightSum - 1) > 0.01) {
        throw new Error('Weights must sum to 1.0');
      }
      this.weights = { ...this.weights, ...config.weights };
    }

    if (config.gradeThresholds) {
      this.gradeThresholds = { ...this.gradeThresholds, ...config.gradeThresholds };
    }

    logger.info('Scoring configuration updated');
  }
}

module.exports = BrandScoreEngine;
