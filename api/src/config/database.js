const mongoose = require('mongoose');
const { logger } = require('./logger');
const config = require('./environment');
const { initializeMigrations } = require('../utils/databaseMigration');

/**
 * Modern Database Connection Manager
 * Implements connection pooling, retry logic, and health monitoring
 */
class DatabaseManager {
  constructor() {
    this.connection = null;
    this.isConnected = false;
    this.retryCount = 0;
    this.maxRetries = 5;
    this.retryDelay = 5000;
    this.healthCheckInterval = 30000; // 30 seconds
    this.healthCheckTimer = null;
  }

  /**
   * Connect to MongoDB with modern configuration
   */
  async connect() {
    try {
      const options = {
        // Connection Pool Settings
        maxPoolSize: config.mongoMaxPoolSize,
        minPoolSize: 2,
        maxIdleTimeMS: config.mongoMaxIdleTime,
        
        // Timeout Settings
        serverSelectionTimeoutMS: config.mongoServerSelectionTimeout,
        socketTimeoutMS: config.mongoSocketTimeout,
        connectTimeoutMS: config.mongoConnectTimeout,
        
        // Modern MongoDB Settings
        bufferCommands: false,
        
        // Retry Settings
        retryWrites: true,
        retryReads: true,
        
        // Compression
        compressors: ['zstd', 'zlib'],
        
        // Write Concern
        writeConcern: {
          w: 'majority',
          j: true,
          wtimeout: 10000
        },
        
        // Read Preference
        readPreference: 'primaryPreferred',
        
        // Heartbeat
        heartbeatFrequencyMS: 10000,
        
        // App Name for monitoring
        appName: 'raspberry-host-api'
      };

      this.connection = await mongoose.connect(config.mongoUrl, options);
      this.isConnected = true;
      this.retryCount = 0;
      
      logger.info('✅ Connected to MongoDB successfully', {
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        database: mongoose.connection.name,
        poolSize: mongoose.connection.db.serverConfig.s.pool.size
      });
      
      this.setupEventHandlers();
      this.startHealthCheck();
      
      // Run database migrations
      await this.runMigrations();
      
      return this.connection;
    } catch (error) {
      this.isConnected = false;
      logger.error('Failed to connect to MongoDB:', error);
      
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        logger.info(`Retrying connection (${this.retryCount}/${this.maxRetries}) in ${this.retryDelay}ms`);
        setTimeout(() => this.connect(), this.retryDelay);
      } else {
        throw new Error(`Failed to connect to MongoDB after ${this.maxRetries} retries`);
      }
    }
  }

  /**
   * Setup MongoDB connection event handlers
   */
  setupEventHandlers() {
    const connection = mongoose.connection;

    connection.on('error', (error) => {
      this.isConnected = false;
      logger.error('MongoDB connection error:', {
        error: error.message,
        code: error.code,
        name: error.name
      });
    });

    connection.on('disconnected', () => {
      this.isConnected = false;
      logger.warn('MongoDB disconnected');
    });

    connection.on('reconnected', () => {
      this.isConnected = true;
      logger.info('MongoDB reconnected');
    });

    connection.on('close', () => {
      this.isConnected = false;
      logger.warn('MongoDB connection closed');
    });

    // Handle process termination
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
  }

  /**
   * Start health check monitoring
   */
  startHealthCheck() {
    this.healthCheckTimer = setInterval(async () => {
      try {
        if (this.isConnected) {
          await mongoose.connection.db.admin().ping();
          logger.debug('MongoDB health check: OK');
        }
      } catch (error) {
        logger.error('MongoDB health check failed:', error);
        this.isConnected = false;
      }
    }, this.healthCheckInterval);
  }

  /**
   * Stop health check monitoring
   */
  stopHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      database: mongoose.connection.name,
      retryCount: this.retryCount
    };
  }

  /**
   * Graceful shutdown
   */
  async gracefulShutdown(signal) {
    logger.info(`${signal} received, shutting down database connection gracefully`);
    
    this.stopHealthCheck();
    
    try {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed gracefully');
    } catch (error) {
      logger.error('Error closing MongoDB connection:', error);
    }
  }

  /**
   * Run database migrations
   */
  async runMigrations() {
    try {
      const migrationSystem = await initializeMigrations();
      await migrationSystem.runMigrations();
      logger.info('Database migrations completed successfully');
    } catch (error) {
      logger.error('Database migrations failed:', error);
      throw error;
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect() {
    this.stopHealthCheck();
    
    try {
      await mongoose.connection.close();
      this.isConnected = false;
      logger.info('MongoDB connection closed');
    } catch (error) {
      logger.error('Error closing MongoDB connection:', error);
      throw error;
    }
  }
}

// Create singleton instance
const databaseManager = new DatabaseManager();

// Legacy compatibility functions
const connectDatabase = () => databaseManager.connect();
const disconnectDatabase = () => databaseManager.disconnect();

module.exports = {
  connectDatabase,
  disconnectDatabase,
  databaseManager,
  getConnectionStatus: () => databaseManager.getStatus()
};