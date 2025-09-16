const mongoose = require('mongoose');
const { logger } = require('../config/logger');
const { databaseManager } = require('../config/database');

/**
 * Database Health Monitoring Service
 * Provides comprehensive database health monitoring and metrics
 */
class DatabaseHealthService {
  constructor() {
    this.healthCheckInterval = 30000; // 30 seconds
    this.healthCheckTimer = null;
    this.lastHealthCheck = null;
    this.healthHistory = [];
    this.maxHistorySize = 100;
  }

  /**
   * Get comprehensive database health status
   */
  async getDatabaseHealth() {
    try {
      const startTime = Date.now();
      
      // Get connection status
      const connectionStatus = databaseManager.getStatus();
      
      // Get database stats
      const dbStats = await this.getDatabaseStats();
      
      // Get collection stats
      const collectionStats = await this.getCollectionStats();
      
      // Get index stats
      const indexStats = await this.getIndexStats();
      
      // Get connection pool stats
      const poolStats = await this.getConnectionPoolStats();
      
      // Get performance metrics
      const performanceMetrics = await this.getPerformanceMetrics();
      
      const responseTime = Date.now() - startTime;
      
      const healthStatus = {
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`,
        connection: connectionStatus,
        database: dbStats,
        collections: collectionStats,
        indexes: indexStats,
        connectionPool: poolStats,
        performance: performanceMetrics,
        overall: this.calculateOverallHealth({
          connection: connectionStatus.isConnected,
          database: dbStats,
          collections: collectionStats,
          performance: performanceMetrics
        })
      };

      // Store health check in history
      this.storeHealthCheck(healthStatus);
      
      return healthStatus;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return {
        timestamp: new Date().toISOString(),
        overall: 'unhealthy',
        error: error.message,
        connection: { isConnected: false }
      };
    }
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats() {
    try {
      const db = mongoose.connection.db;
      const stats = await db.stats();
      
      return {
        name: db.databaseName,
        collections: stats.collections || 0,
        documents: stats.objects || 0,
        dataSize: stats.dataSize || 0,
        storageSize: stats.storageSize || 0,
        indexSize: stats.indexSize || 0,
        avgObjSize: stats.avgObjSize || 0,
        fileSize: stats.fileSize || 0
      };
    } catch (error) {
      logger.error('Failed to get database stats:', error);
      return { error: error.message };
    }
  }

  /**
   * Get collection statistics
   */
  async getCollectionStats() {
    try {
      const db = mongoose.connection.db;
      const collections = await db.listCollections().toArray();
      
      const collectionStats = {};
      let totalDocuments = 0;
      let totalIndexes = 0;
      
      for (const collection of collections) {
        try {
          const count = await db.collection(collection.name).countDocuments();
          const indexes = await db.collection(collection.name).indexes();
          
          collectionStats[collection.name] = {
            documents: count,
            indexes: indexes.length,
            size: collection.size || 0
          };
          
          totalDocuments += count;
          totalIndexes += indexes.length;
        } catch (error) {
          logger.warn(`Could not get stats for collection ${collection.name}:`, error);
          collectionStats[collection.name] = { error: error.message };
        }
      }
      
      return {
        collections: collections.length,
        totalDocuments,
        totalIndexes,
        details: collectionStats
      };
    } catch (error) {
      logger.error('Failed to get collection stats:', error);
      return { error: error.message };
    }
  }

  /**
   * Get index statistics
   */
  async getIndexStats() {
    try {
      const db = mongoose.connection.db;
      const collections = await db.listCollections().toArray();
      
      const indexStats = {};
      let totalIndexes = 0;
      let totalIndexSize = 0;
      
      for (const collection of collections) {
        try {
          const indexes = await db.collection(collection.name).indexes();
          const indexStatsCollection = await db.collection(collection.name).aggregate([
            { $indexStats: {} }
          ]).toArray();
          
          indexStats[collection.name] = {
            count: indexes.length,
            indexes: indexes.map(index => ({
              name: index.name,
              key: index.key,
              unique: index.unique || false,
              sparse: index.sparse || false
            })),
            stats: indexStatsCollection
          };
          
          totalIndexes += indexes.length;
        } catch (error) {
          logger.warn(`Could not get index stats for collection ${collection.name}:`, error);
          indexStats[collection.name] = { error: error.message };
        }
      }
      
      return {
        totalIndexes,
        totalIndexSize,
        details: indexStats
      };
    } catch (error) {
      logger.error('Failed to get index stats:', error);
      return { error: error.message };
    }
  }

  /**
   * Get connection pool statistics
   */
  async getConnectionPoolStats() {
    try {
      const connection = mongoose.connection;
      const serverConfig = connection.db.serverConfig;
      
      if (serverConfig && serverConfig.s && serverConfig.s.pool) {
        const pool = serverConfig.s.pool;
        return {
          totalConnections: pool.totalConnectionCount || 0,
          availableConnections: pool.availableConnectionCount || 0,
          checkedOutConnections: pool.checkedOutConnectionCount || 0,
          maxPoolSize: pool.options?.maxPoolSize || 0,
          minPoolSize: pool.options?.minPoolSize || 0,
          currentWaitQueueSize: pool.currentWaitQueueSize || 0
        };
      }
      
      return { error: 'Connection pool stats not available' };
    } catch (error) {
      logger.error('Failed to get connection pool stats:', error);
      return { error: error.message };
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics() {
    try {
      const db = mongoose.connection.db;
      
      // Get server status
      const serverStatus = await db.admin().serverStatus();
      
      return {
        uptime: serverStatus.uptime || 0,
        connections: {
          current: serverStatus.connections?.current || 0,
          available: serverStatus.connections?.available || 0,
          totalCreated: serverStatus.connections?.totalCreated || 0
        },
        operations: {
          insert: serverStatus.opcounters?.insert || 0,
          query: serverStatus.opcounters?.query || 0,
          update: serverStatus.opcounters?.update || 0,
          delete: serverStatus.opcounters?.delete || 0,
          getmore: serverStatus.opcounters?.getmore || 0,
          command: serverStatus.opcounters?.command || 0
        },
        memory: {
          resident: serverStatus.mem?.resident || 0,
          virtual: serverStatus.mem?.virtual || 0,
          mapped: serverStatus.mem?.mapped || 0
        },
        network: {
          bytesIn: serverStatus.network?.bytesIn || 0,
          bytesOut: serverStatus.network?.bytesOut || 0,
          numRequests: serverStatus.network?.numRequests || 0
        }
      };
    } catch (error) {
      logger.error('Failed to get performance metrics:', error);
      return { error: error.message };
    }
  }

  /**
   * Calculate overall health status
   */
  calculateOverallHealth(components) {
    const { connection, database, collections, performance } = components;
    
    if (!connection) {
      return 'unhealthy';
    }
    
    if (database.error || collections.error || performance.error) {
      return 'degraded';
    }
    
    // Check for potential issues
    const issues = [];
    
    if (database.documents === 0) {
      issues.push('No documents in database');
    }
    
    if (collections.collections === 0) {
      issues.push('No collections found');
    }
    
    if (performance.connections?.current > (performance.connections?.available * 0.8)) {
      issues.push('High connection usage');
    }
    
    if (issues.length > 0) {
      return 'degraded';
    }
    
    return 'healthy';
  }

  /**
   * Store health check in history
   */
  storeHealthCheck(healthStatus) {
    this.healthHistory.push(healthStatus);
    this.lastHealthCheck = healthStatus;
    
    // Keep only the last N health checks
    if (this.healthHistory.length > this.maxHistorySize) {
      this.healthHistory = this.healthHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get health history
   */
  getHealthHistory(limit = 10) {
    return this.healthHistory.slice(-limit);
  }

  /**
   * Get health trends
   */
  getHealthTrends() {
    if (this.healthHistory.length < 2) {
      return { trend: 'insufficient_data' };
    }
    
    const recent = this.healthHistory.slice(-5);
    const healthy = recent.filter(h => h.overall === 'healthy').length;
    const degraded = recent.filter(h => h.overall === 'degraded').length;
    const unhealthy = recent.filter(h => h.overall === 'unhealthy').length;
    
    if (unhealthy > 0) {
      return { trend: 'declining', healthy, degraded, unhealthy };
    } else if (degraded > healthy) {
      return { trend: 'degrading', healthy, degraded, unhealthy };
    } else {
      return { trend: 'stable', healthy, degraded, unhealthy };
    }
  }

  /**
   * Start continuous health monitoring
   */
  startHealthMonitoring() {
    if (this.healthCheckTimer) {
      return; // Already running
    }
    
    this.healthCheckTimer = setInterval(async () => {
      try {
        await this.getDatabaseHealth();
      } catch (error) {
        logger.error('Health monitoring error:', error);
      }
    }, this.healthCheckInterval);
    
    logger.info('Database health monitoring started');
  }

  /**
   * Stop continuous health monitoring
   */
  stopHealthMonitoring() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
      logger.info('Database health monitoring stopped');
    }
  }

  /**
   * Get database connection info
   */
  getConnectionInfo() {
    const connection = mongoose.connection;
    return {
      host: connection.host,
      port: connection.port,
      name: connection.name,
      readyState: connection.readyState,
      readyStateText: this.getReadyStateText(connection.readyState)
    };
  }

  /**
   * Get ready state text
   */
  getReadyStateText(readyState) {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    return states[readyState] || 'unknown';
  }

  /**
   * Test database connectivity
   */
  async testConnectivity() {
    try {
      const startTime = Date.now();
      await mongoose.connection.db.admin().ping();
      const responseTime = Date.now() - startTime;
      
      return {
        success: true,
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Create singleton instance
const databaseHealthService = new DatabaseHealthService();

module.exports = {
  DatabaseHealthService,
  databaseHealthService
};