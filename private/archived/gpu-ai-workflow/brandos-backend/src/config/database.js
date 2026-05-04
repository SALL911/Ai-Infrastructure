/**
 * BrandOS AI Infrastructure - Database Configuration
 * MongoDB connection and configuration management
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

class Database {
  constructor() {
    this.connection = null;
    this.isConnected = false;
    this.connectionString = process.env.MONGODB_URI || 'mongodb://localhost:27017/brandos';
    this.options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferMaxEntries: 0, // Disable mongoose buffering
      bufferCommands: false, // Disable mongoose buffering
    };
  }

  /**
   * Connect to MongoDB database
   */
  async connect() {
    try {
      logger.info('Connecting to MongoDB...');
      
      this.connection = await mongoose.connect(this.connectionString, this.options);
      this.isConnected = true;

      logger.info('MongoDB connected successfully', {
        host: this.connection.connection.host,
        port: this.connection.connection.port,
        database: this.connection.connection.name
      });

      // Set up event listeners
      this.setupEventListeners();

      return this.connection;

    } catch (error) {
      logger.error('MongoDB connection failed:', error);
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  /**
   * Disconnect from MongoDB database
   */
  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.disconnect();
        this.isConnected = false;
        this.connection = null;
        logger.info('MongoDB disconnected successfully');
      }
    } catch (error) {
      logger.error('MongoDB disconnection failed:', error);
      throw error;
    }
  }

  /**
   * Set up MongoDB event listeners
   */
  setupEventListeners() {
    mongoose.connection.on('connected', () => {
      logger.info('MongoDB connected');
    });

    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error:', error);
      this.isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
      this.isConnected = false;
    });

    // Handle process termination
    process.on('SIGINT', async () => {
      await this.disconnect();
      process.exit(0);
    });
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      connectionString: this.connectionString.replace(/\/\/.*@/, '//***:***@'), // Hide credentials
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      database: mongoose.connection.name
    };
  }

  /**
   * Health check for database
   */
  async healthCheck() {
    try {
      if (!this.isConnected) {
        throw new Error('Database not connected');
      }

      // Ping the database
      await mongoose.connection.db.admin().ping();
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: mongoose.connection.name,
        collections: await mongoose.connection.db.listCollections().toArray()
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  /**
   * Create database indexes for performance
   */
  async createIndexes() {
    try {
      logger.info('Creating database indexes...');

      // BrandScore indexes
      const BrandScore = mongoose.model('BrandScore');
      await BrandScore.createIndexes();

      // HistoricalScore indexes
      const HistoricalScore = mongoose.model('HistoricalScore');
      await HistoricalScore.createIndexes();

      // ComplianceTag indexes
      const ComplianceTag = mongoose.model('ComplianceTag');
      await ComplianceTag.createIndexes();

      logger.info('Database indexes created successfully');

    } catch (error) {
      logger.error('Failed to create database indexes:', error);
      throw error;
    }
  }

  /**
   * Drop all collections (for testing)
   */
  async dropDatabase() {
    try {
      if (process.env.NODE_ENV !== 'test') {
        throw new Error('Drop database only allowed in test environment');
      }

      await mongoose.connection.db.dropDatabase();
      logger.info('Database dropped successfully');

    } catch (error) {
      logger.error('Failed to drop database:', error);
      throw error;
    }
  }
}

// Create singleton instance
const database = new Database();

module.exports = database;
