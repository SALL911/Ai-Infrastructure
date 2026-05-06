/**
 * BrandOS AI Infrastructure - Storage Utility
 * Simple JSON-based storage system for brand score results
 * Designed for production use with file-based persistence
 */

const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');

class Storage {
  constructor() {
    this.dataDir = path.join(__dirname, '../../data');
    this.resultsFile = path.join(this.dataDir, 'results.json');
    this.statsFile = path.join(this.dataDir, 'stats.json');
    this.data = new Map(); // In-memory cache
    this.stats = {
      total: 0,
      averageScore: 0,
      gradeDistribution: { 'AAA': 0, 'AA': 0, 'A': 0, 'BBB': 0, 'Risk': 0 },
      confidenceDistribution: { '0.8-0.85': 0, '0.85-0.9': 0, '0.9-0.95': 0 },
      averageExecutionTime: 0,
      calculationsToday: 0,
      calculationsThisWeek: 0,
      calculationsThisMonth: 0,
      lastCalculation: null
    };
    this.initialized = false;
  }

  /**
   * Initialize storage system
   * Create data directory and load existing data
   */
  async initialize() {
    try {
      // Create data directory if it doesn't exist
      await fs.mkdir(this.dataDir, { recursive: true });

      // Load existing results
      await this.loadResults();
      
      // Load statistics
      await this.loadStats();

      // Calculate statistics if needed
      if (this.stats.total === 0 && this.data.size > 0) {
        await this.calculateStatistics();
      }

      this.initialized = true;
      logger.info(`Storage initialized: ${this.data.size} results loaded`);

    } catch (error) {
      logger.error('Storage initialization failed:', error);
      throw error;
    }
  }

  /**
   * Load existing results from file
   */
  async loadResults() {
    try {
      const data = await fs.readFile(this.resultsFile, 'utf8');
      const results = JSON.parse(data);
      
      // Convert array to Map for efficient lookup
      this.data = new Map(results.map(item => [item.id, item]));
      
      logger.debug(`Loaded ${this.data.size} results from storage`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, start with empty data
        this.data = new Map();
        logger.debug('No existing results file found, starting fresh');
      } else {
        throw error;
      }
    }
  }

  /**
   * Load statistics from file
   */
  async loadStats() {
    try {
      const data = await fs.readFile(this.statsFile, 'utf8');
      this.stats = JSON.parse(data);
      logger.debug('Statistics loaded from storage');
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, start with default stats
        logger.debug('No existing stats file found, starting fresh');
      } else {
        throw error;
      }
    }
  }

  /**
   * Save results to file
   */
  async saveResults() {
    try {
      const results = Array.from(this.data.values());
      await fs.writeFile(this.resultsFile, JSON.stringify(results, null, 2));
      logger.debug(`Saved ${results.length} results to storage`);
    } catch (error) {
      logger.error('Failed to save results:', error);
      throw error;
    }
  }

  /**
   * Save statistics to file
   */
  async saveStats() {
    try {
      await fs.writeFile(this.statsFile, JSON.stringify(this.stats, null, 2));
      logger.debug('Statistics saved to storage');
    } catch (error) {
      logger.error('Failed to save statistics:', error);
      throw error;
    }
  }

  /**
   * Generate unique ID for new results
   */
  generateId() {
    return uuidv4();
  }

  /**
   * Store a new result
   */
  async store(id, result) {
    if (!this.initialized) {
      throw new Error('Storage not initialized');
    }

    try {
      // Add to in-memory cache
      this.data.set(id, result);

      // Save to file
      await this.saveResults();

      // Update statistics
      await this.updateStatistics(result);

      logger.debug(`Result stored: ID=${id}`);
      return id;

    } catch (error) {
      logger.error('Failed to store result:', error);
      throw error;
    }
  }

  /**
   * Retrieve a result by ID
   */
  async retrieve(id, includeInputData = false) {
    if (!this.initialized) {
      throw new Error('Storage not initialized');
    }

    try {
      const result = this.data.get(id);
      
      if (!result) {
        return null;
      }

      // Return copy without input data by default (for privacy)
      if (!includeInputData) {
        const { input_data, ...resultWithoutInput } = result;
        return resultWithoutInput;
      }

      // Return deep copy to prevent modification
      return JSON.parse(JSON.stringify(result));

    } catch (error) {
      logger.error('Failed to retrieve result:', error);
      throw error;
    }
  }

  /**
   * List results with optional filtering and pagination
   */
  async list(options = {}) {
    if (!this.initialized) {
      throw new Error('Storage not initialized');
    }

    const { limit = 50, offset = 0, grade } = options;

    try {
      let results = Array.from(this.data.values());

      // Filter by grade if specified
      if (grade) {
        results = results.filter(result => result.grade === grade);
      }

      // Sort by creation date (newest first)
      results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      // Apply pagination
      const paginatedResults = results.slice(offset, offset + limit);

      // Return results without input data
      return paginatedResults.map(result => {
        const { input_data, ...resultWithoutInput } = result;
        return resultWithoutInput;
      });

    } catch (error) {
      logger.error('Failed to list results:', error);
      throw error;
    }
  }

  /**
   * Count total results with optional grade filtering
   */
  async count(grade = null) {
    if (!this.initialized) {
      throw new Error('Storage not initialized');
    }

    try {
      if (grade) {
        return Array.from(this.data.values()).filter(result => result.grade === grade).length;
      }
      return this.data.size;

    } catch (error) {
      logger.error('Failed to count results:', error);
      throw error;
    }
  }

  /**
   * Remove a result by ID
   */
  async remove(id) {
    if (!this.initialized) {
      throw new Error('Storage not initialized');
    }

    try {
      const result = this.data.get(id);
      
      if (!result) {
        return false;
      }

      // Remove from in-memory cache
      this.data.delete(id);

      // Save to file
      await this.saveResults();

      // Recalculate statistics
      await this.calculateStatistics();

      logger.debug(`Result removed: ID=${id}`);
      return true;

    } catch (error) {
      logger.error('Failed to remove result:', error);
      throw error;
    }
  }

  /**
   * Update statistics after adding a new result
   */
  async updateStatistics(newResult) {
    try {
      // Update total count
      this.stats.total = this.data.size;

      // Update average score
      const scores = Array.from(this.data.values()).map(r => r.brand_score);
      this.stats.averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

      // Update grade distribution
      this.stats.gradeDistribution[newResult.grade] = 
        (this.stats.gradeDistribution[newResult.grade] || 0) + 1;

      // Update confidence distribution
      const confidenceRange = this.getConfidenceRange(newResult.confidence);
      this.stats.confidenceDistribution[confidenceRange] = 
        (this.stats.confidenceDistribution[confidenceRange] || 0) + 1;

      // Update average execution time
      const executionTimes = Array.from(this.data.values()).map(r => r.execution_time_ms);
      this.stats.averageExecutionTime = executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length;

      // Update time-based statistics
      await this.updateTimeBasedStatistics();

      // Update last calculation
      this.stats.lastCalculation = newResult.created_at;

      // Save statistics
      await this.saveStats();

    } catch (error) {
      logger.error('Failed to update statistics:', error);
      throw error;
    }
  }

  /**
   * Recalculate all statistics from scratch
   */
  async calculateStatistics() {
    try {
      const results = Array.from(this.data.values());
      
      if (results.length === 0) {
        // Reset to defaults
        this.stats = {
          total: 0,
          averageScore: 0,
          gradeDistribution: { 'AAA': 0, 'AA': 0, 'A': 0, 'BBB': 0, 'Risk': 0 },
          confidenceDistribution: { '0.8-0.85': 0, '0.85-0.9': 0, '0.9-0.95': 0 },
          averageExecutionTime: 0,
          calculationsToday: 0,
          calculationsThisWeek: 0,
          calculationsThisMonth: 0,
          lastCalculation: null
        };
        await this.saveStats();
        return;
      }

      // Calculate basic statistics
      const scores = results.map(r => r.brand_score);
      const executionTimes = results.map(r => r.execution_time_ms);

      this.stats.total = results.length;
      this.stats.averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      this.stats.averageExecutionTime = executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length;

      // Calculate grade distribution
      this.stats.gradeDistribution = { 'AAA': 0, 'AA': 0, 'A': 0, 'BBB': 0, 'Risk': 0 };
      results.forEach(result => {
        this.stats.gradeDistribution[result.grade]++;
      });

      // Calculate confidence distribution
      this.stats.confidenceDistribution = { '0.8-0.85': 0, '0.85-0.9': 0, '0.9-0.95': 0 };
      results.forEach(result => {
        const range = this.getConfidenceRange(result.confidence);
        this.stats.confidenceDistribution[range]++;
      });

      // Update time-based statistics
      await this.updateTimeBasedStatistics();

      // Set last calculation
      this.stats.lastCalculation = results[results.length - 1].created_at;

      // Save statistics
      await this.saveStats();

      logger.debug('Statistics recalculated successfully');

    } catch (error) {
      logger.error('Failed to calculate statistics:', error);
      throw error;
    }
  }

  /**
   * Update time-based statistics (today, this week, this month)
   */
  async updateTimeBasedStatistics() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const results = Array.from(this.data.values());

    this.stats.calculationsToday = results.filter(r => 
      new Date(r.created_at) >= today
    ).length;

    this.stats.calculationsThisWeek = results.filter(r => 
      new Date(r.created_at) >= weekAgo
    ).length;

    this.stats.calculationsThisMonth = results.filter(r => 
      new Date(r.created_at) >= monthAgo
    ).length;
  }

  /**
   * Get confidence range for distribution
   */
  getConfidenceRange(confidence) {
    if (confidence >= 0.8 && confidence < 0.85) return '0.8-0.85';
    if (confidence >= 0.85 && confidence < 0.9) return '0.85-0.9';
    if (confidence >= 0.9 && confidence <= 0.95) return '0.9-0.95';
    return '0.8-0.85'; // default
  }

  /**
   * Get current statistics
   */
  async getStatistics() {
    if (!this.initialized) {
      throw new Error('Storage not initialized');
    }

    // Return copy to prevent modification
    return JSON.parse(JSON.stringify(this.stats));
  }

  /**
   * Get storage status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      total_results: this.data.size,
      data_directory: this.dataDir,
      results_file: this.resultsFile,
      stats_file: this.statsFile
    };
  }

  /**
   * Clear all data (for testing purposes)
   */
  async clear() {
    if (!this.initialized) {
      throw new Error('Storage not initialized');
    }

    try {
      // Clear in-memory cache
      this.data.clear();

      // Reset statistics
      this.stats = {
        total: 0,
        averageScore: 0,
        gradeDistribution: { 'AAA': 0, 'AA': 0, 'A': 0, 'BBB': 0, 'Risk': 0 },
        confidenceDistribution: { '0.8-0.85': 0, '0.85-0.9': 0, '0.9-0.95': 0 },
        averageExecutionTime: 0,
        calculationsToday: 0,
        calculationsThisWeek: 0,
        calculationsThisMonth: 0,
        lastCalculation: null
      };

      // Save empty files
      await this.saveResults();
      await this.saveStats();

      logger.info('All storage data cleared');

    } catch (error) {
      logger.error('Failed to clear storage:', error);
      throw error;
    }
  }
}

// Create singleton instance
const storage = new Storage();

module.exports = storage;
