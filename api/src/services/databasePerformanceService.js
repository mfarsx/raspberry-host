const mongoose = require('mongoose');
const { logger } = require('../config/logger');

/**
 * Database Performance Monitoring Service
 * Provides comprehensive performance monitoring and optimization
 */
class DatabasePerformanceService {
  constructor() {
    this.metrics = {
      queries: new Map(),
      slowQueries: [],
      connectionStats: {
        total: 0,
        active: 0,
        idle: 0
      },
      operationCounts: {
        find: 0,
        findOne: 0,
        insert: 0,
        update: 0,
        delete: 0,
        aggregate: 0
      }
    };
    
    this.slowQueryThreshold = parseInt(process.env.SLOW_QUERY_THRESHOLD) || 100; // ms
    this.maxSlowQueries = parseInt(process.env.MAX_SLOW_QUERIES) || 1000;
    this.monitoringEnabled = process.env.DB_PERFORMANCE_MONITORING !== 'false';
    
    if (this.monitoringEnabled) {
      this.setupMonitoring();
    }
  }

  /**
   * Setup performance monitoring
   */
  setupMonitoring() {
    // Monitor Mongoose operations
    mongoose.plugin((schema) => {
      schema.pre(/^(find|findOne|insert|update|delete|aggregate)/, function() {
        const startTime = Date.now();
        const operation = this.op;
        const collection = this.collection.name;
        
        this._performanceStart = startTime;
        this._performanceOperation = operation;
        this._performanceCollection = collection;
      });
      
      schema.post(/^(find|findOne|insert|update|delete|aggregate)/, function() {
        const endTime = Date.now();
        const duration = endTime - this._performanceStart;
        
        this.trackOperation(
          this._performanceOperation,
          this._performanceCollection,
          duration,
          this._performanceStart
        );
      });
    });

    // Monitor connection events
    mongoose.connection.on('connected', () => {
      this.metrics.connectionStats.total++;
      this.metrics.connectionStats.active++;
    });

    mongoose.connection.on('disconnected', () => {
      this.metrics.connectionStats.active--;
    });

    logger.info('Database performance monitoring enabled');
  }

  /**
   * Track operation performance
   */
  trackOperation(operation, collection, duration, timestamp) {
    if (!this.monitoringEnabled) return;

    // Update operation counts
    if (this.metrics.operationCounts[operation]) {
      this.metrics.operationCounts[operation]++;
    }

    // Track slow queries
    if (duration > this.slowQueryThreshold) {
      const slowQuery = {
        operation,
        collection,
        duration,
        timestamp: new Date(timestamp),
        stack: this.getStackTrace()
      };

      this.metrics.slowQueries.push(slowQuery);

      // Keep only the most recent slow queries
      if (this.metrics.slowQueries.length > this.maxSlowQueries) {
        this.metrics.slowQueries = this.metrics.slowQueries.slice(-this.maxSlowQueries);
      }

      logger.warn(`Slow query detected: ${operation} on ${collection} took ${duration}ms`);
    }

    // Update query metrics
    const queryKey = `${operation}:${collection}`;
    if (!this.metrics.queries.has(queryKey)) {
      this.metrics.queries.set(queryKey, {
        operation,
        collection,
        count: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        avgDuration: 0
      });
    }

    const queryMetrics = this.metrics.queries.get(queryKey);
    queryMetrics.count++;
    queryMetrics.totalDuration += duration;
    queryMetrics.minDuration = Math.min(queryMetrics.minDuration, duration);
    queryMetrics.maxDuration = Math.max(queryMetrics.maxDuration, duration);
    queryMetrics.avgDuration = queryMetrics.totalDuration / queryMetrics.count;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    const queryMetrics = Array.from(this.metrics.queries.values());
    
    return {
      timestamp: new Date().toISOString(),
      connection: this.metrics.connectionStats,
      operations: this.metrics.operationCounts,
      queries: queryMetrics,
      slowQueries: {
        count: this.metrics.slowQueries.length,
        threshold: this.slowQueryThreshold,
        recent: this.metrics.slowQueries.slice(-10)
      },
      summary: this.calculateSummary(queryMetrics)
    };
  }

  /**
   * Calculate performance summary
   */
  calculateSummary(queryMetrics) {
    const totalQueries = queryMetrics.reduce((sum, q) => sum + q.count, 0);
    const totalDuration = queryMetrics.reduce((sum, q) => sum + q.totalDuration, 0);
    const avgDuration = totalQueries > 0 ? totalDuration / totalQueries : 0;
    
    const slowQueries = queryMetrics.filter(q => q.avgDuration > this.slowQueryThreshold);
    
    return {
      totalQueries,
      totalDuration: `${totalDuration}ms`,
      avgDuration: `${avgDuration.toFixed(2)}ms`,
      slowQueryCollections: slowQueries.map(q => q.collection),
      performanceScore: this.calculatePerformanceScore(queryMetrics)
    };
  }

  /**
   * Calculate performance score (0-100)
   */
  calculatePerformanceScore(queryMetrics) {
    if (queryMetrics.length === 0) return 100;
    
    const avgDuration = queryMetrics.reduce((sum, q) => sum + q.avgDuration, 0) / queryMetrics.length;
    const slowQueries = queryMetrics.filter(q => q.avgDuration > this.slowQueryThreshold).length;
    
    // Score based on average duration and slow query ratio
    let score = 100;
    
    if (avgDuration > 1000) score -= 30; // Very slow
    else if (avgDuration > 500) score -= 20; // Slow
    else if (avgDuration > 100) score -= 10; // Moderate
    
    const slowQueryRatio = slowQueries / queryMetrics.length;
    if (slowQueryRatio > 0.5) score -= 25; // Many slow queries
    else if (slowQueryRatio > 0.2) score -= 15; // Some slow queries
    else if (slowQueryRatio > 0.1) score -= 5; // Few slow queries
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get slow queries
   */
  getSlowQueries(limit = 50) {
    return this.metrics.slowQueries
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Get query performance by collection
   */
  getCollectionPerformance() {
    const collectionMetrics = new Map();
    
    for (const [key, metrics] of this.metrics.queries) {
      const collection = metrics.collection;
      
      if (!collectionMetrics.has(collection)) {
        collectionMetrics.set(collection, {
          collection,
          totalQueries: 0,
          totalDuration: 0,
          avgDuration: 0,
          slowQueries: 0,
          operations: {}
        });
      }
      
      const collectionMetric = collectionMetrics.get(collection);
      collectionMetric.totalQueries += metrics.count;
      collectionMetric.totalDuration += metrics.totalDuration;
      collectionMetric.avgDuration = collectionMetric.totalDuration / collectionMetric.totalQueries;
      
      if (metrics.avgDuration > this.slowQueryThreshold) {
        collectionMetric.slowQueries++;
      }
      
      collectionMetric.operations[metrics.operation] = {
        count: metrics.count,
        avgDuration: metrics.avgDuration
      };
    }
    
    return Array.from(collectionMetrics.values());
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats() {
    try {
      const db = mongoose.connection.db;
      const stats = await db.stats();
      
      return {
        collections: stats.collections,
        documents: stats.objects,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexSize: stats.indexSize,
        avgObjSize: stats.avgObjSize,
        fileSize: stats.fileSize
      };
    } catch (error) {
      logger.error('Failed to get database stats:', error);
      return null;
    }
  }

  /**
   * Get index usage statistics
   */
  async getIndexUsageStats() {
    try {
      const db = mongoose.connection.db;
      const collections = await db.listCollections().toArray();
      
      const indexStats = {};
      
      for (const collection of collections) {
        try {
          const stats = await db.collection(collection.name).aggregate([
            { $indexStats: {} }
          ]).toArray();
          
          indexStats[collection.name] = stats.map(stat => ({
            name: stat.name,
            key: stat.key,
            accesses: stat.accesses?.ops || 0,
            since: stat.accesses?.since || null
          }));
        } catch (error) {
          logger.warn(`Could not get index stats for ${collection.name}:`, error);
          indexStats[collection.name] = [];
        }
      }
      
      return indexStats;
    } catch (error) {
      logger.error('Failed to get index usage stats:', error);
      return {};
    }
  }

  /**
   * Get unused indexes
   */
  async getUnusedIndexes() {
    try {
      const indexStats = await this.getIndexUsageStats();
      const unusedIndexes = [];
      
      for (const [collection, indexes] of Object.entries(indexStats)) {
        for (const index of indexes) {
          if (index.accesses === 0 && index.name !== '_id_') {
            unusedIndexes.push({
              collection,
              name: index.name,
              key: index.key
            });
          }
        }
      }
      
      return unusedIndexes;
    } catch (error) {
      logger.error('Failed to get unused indexes:', error);
      return [];
    }
  }

  /**
   * Get performance recommendations
   */
  async getPerformanceRecommendations() {
    const recommendations = [];
    
    // Check for slow queries
    const slowQueries = this.getSlowQueries(10);
    if (slowQueries.length > 0) {
      recommendations.push({
        type: 'slow_queries',
        severity: 'high',
        message: `${slowQueries.length} slow queries detected`,
        details: slowQueries.slice(0, 5)
      });
    }
    
    // Check for unused indexes
    const unusedIndexes = await this.getUnusedIndexes();
    if (unusedIndexes.length > 0) {
      recommendations.push({
        type: 'unused_indexes',
        severity: 'medium',
        message: `${unusedIndexes.length} unused indexes found`,
        details: unusedIndexes.slice(0, 5)
      });
    }
    
    // Check connection pool usage
    const connectionStats = this.metrics.connectionStats;
    if (connectionStats.active > connectionStats.total * 0.8) {
      recommendations.push({
        type: 'connection_pool',
        severity: 'medium',
        message: 'High connection pool usage',
        details: connectionStats
      });
    }
    
    // Check query patterns
    const queryMetrics = Array.from(this.metrics.queries.values());
    const frequentQueries = queryMetrics.filter(q => q.count > 1000);
    if (frequentQueries.length > 0) {
      recommendations.push({
        type: 'frequent_queries',
        severity: 'low',
        message: `${frequentQueries.length} frequently executed queries`,
        details: frequentQueries.slice(0, 5)
      });
    }
    
    return recommendations;
  }

  /**
   * Reset performance metrics
   */
  resetMetrics() {
    this.metrics.queries.clear();
    this.metrics.slowQueries = [];
    this.metrics.operationCounts = {
      find: 0,
      findOne: 0,
      insert: 0,
      update: 0,
      delete: 0,
      aggregate: 0
    };
    
    logger.info('Performance metrics reset');
  }

  /**
   * Get stack trace for slow queries
   */
  getStackTrace() {
    const stack = new Error().stack;
    return stack.split('\n').slice(2, 5).join('\n');
  }

  /**
   * Export performance data
   */
  exportPerformanceData() {
    return {
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      performanceScore: this.calculatePerformanceScore(Array.from(this.metrics.queries.values())),
      recommendations: this.getPerformanceRecommendations()
    };
  }

  /**
   * Get real-time performance monitoring
   */
  startRealTimeMonitoring(interval = 5000) {
    if (this.realTimeInterval) {
      return; // Already running
    }
    
    this.realTimeInterval = setInterval(() => {
      const metrics = this.getPerformanceMetrics();
      
      // Log performance summary
      logger.info('Performance Summary:', {
        totalQueries: metrics.summary.totalQueries,
        avgDuration: metrics.summary.avgDuration,
        performanceScore: metrics.summary.performanceScore,
        slowQueries: metrics.slowQueries.count
      });
      
      // Alert on performance issues
      if (metrics.summary.performanceScore < 70) {
        logger.warn('Database performance degraded', {
          score: metrics.summary.performanceScore,
          slowQueries: metrics.slowQueries.count
        });
      }
    }, interval);
    
    logger.info('Real-time performance monitoring started');
  }

  /**
   * Stop real-time monitoring
   */
  stopRealTimeMonitoring() {
    if (this.realTimeInterval) {
      clearInterval(this.realTimeInterval);
      this.realTimeInterval = null;
      logger.info('Real-time performance monitoring stopped');
    }
  }
}

// Create singleton instance
const databasePerformanceService = new DatabasePerformanceService();

module.exports = {
  DatabasePerformanceService,
  databasePerformanceService
};