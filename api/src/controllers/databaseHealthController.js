const { logger } = require("../config/logger");
const ResponseHelper = require("../utils/responseHelper");
const BaseController = require("../utils/baseController");
const { databaseHealthService } = require("../services/databaseHealthService");
const { databasePerformanceService } = require("../services/databasePerformanceService");
const DatabaseBackup = require("../utils/databaseBackup");
const { DatabaseErrorHandler } = require("../utils/databaseErrors");

/**
 * Database Health Controller
 * Provides comprehensive database health monitoring and management endpoints
 */
class DatabaseHealthController extends BaseController {
  constructor() {
    super('DatabaseHealthController');
    this.backupService = new DatabaseBackup();
  }

  /**
   * Get comprehensive database health status
   */
  async getDatabaseHealth(req, res) {
    try {
      const healthStatus = await databaseHealthService.getDatabaseHealth();
      
      const statusCode = healthStatus.overall === 'healthy' ? 200 : 
                        healthStatus.overall === 'degraded' ? 200 : 503;
      
      return ResponseHelper.success(res, healthStatus, 'Database health retrieved successfully', statusCode);
    } catch (error) {
      logger.error('Get database health error:', error);
      return ResponseHelper.error(res, error);
    }
  }

  /**
   * Get database connection info
   */
  async getConnectionInfo(req, res) {
    try {
      const connectionInfo = databaseHealthService.getConnectionInfo();
      
      return ResponseHelper.success(res, connectionInfo, 'Connection info retrieved successfully');
    } catch (error) {
      logger.error('Get connection info error:', error);
      return ResponseHelper.error(res, error);
    }
  }

  /**
   * Test database connectivity
   */
  async testConnectivity(req, res) {
    try {
      const connectivityTest = await databaseHealthService.testConnectivity();
      
      const statusCode = connectivityTest.success ? 200 : 503;
      
      return ResponseHelper.success(res, connectivityTest, 'Connectivity test completed', statusCode);
    } catch (error) {
      logger.error('Test connectivity error:', error);
      return ResponseHelper.error(res, error);
    }
  }

  /**
   * Get database performance metrics
   */
  async getPerformanceMetrics(req, res) {
    try {
      const metrics = databasePerformanceService.getPerformanceMetrics();
      
      return ResponseHelper.success(res, metrics, 'Performance metrics retrieved successfully');
    } catch (error) {
      logger.error('Get performance metrics error:', error);
      return ResponseHelper.error(res, error);
    }
  }

  /**
   * Get slow queries
   */
  async getSlowQueries(req, res) {
    try {
      const { limit = 50 } = req.query;
      
      const slowQueries = databasePerformanceService.getSlowQueries(parseInt(limit));
      
      return ResponseHelper.success(res, { 
        slowQueries,
        count: slowQueries.length 
      }, 'Slow queries retrieved successfully');
    } catch (error) {
      logger.error('Get slow queries error:', error);
      return ResponseHelper.error(res, error);
    }
  }

  /**
   * Get collection performance
   */
  async getCollectionPerformance(req, res) {
    try {
      const performance = databasePerformanceService.getCollectionPerformance();
      
      return ResponseHelper.success(res, performance, 'Collection performance retrieved successfully');
    } catch (error) {
      logger.error('Get collection performance error:', error);
      return ResponseHelper.error(res, error);
    }
  }

  /**
   * Get unused indexes
   */
  async getUnusedIndexes(req, res) {
    try {
      const unusedIndexes = await databasePerformanceService.getUnusedIndexes();
      
      return ResponseHelper.success(res, { 
        unusedIndexes,
        count: unusedIndexes.length 
      }, 'Unused indexes retrieved successfully');
    } catch (error) {
      logger.error('Get unused indexes error:', error);
      return ResponseHelper.error(res, error);
    }
  }

  /**
   * Get performance recommendations
   */
  async getPerformanceRecommendations(req, res) {
    try {
      const recommendations = await databasePerformanceService.getPerformanceRecommendations();
      
      return ResponseHelper.success(res, { 
        recommendations,
        count: recommendations.length 
      }, 'Performance recommendations retrieved successfully');
    } catch (error) {
      logger.error('Get performance recommendations error:', error);
      return ResponseHelper.error(res, error);
    }
  }

  /**
   * Reset performance metrics
   */
  async resetPerformanceMetrics(req, res) {
    try {
      databasePerformanceService.resetMetrics();
      
      return ResponseHelper.success(res, {}, 'Performance metrics reset successfully');
    } catch (error) {
      logger.error('Reset performance metrics error:', error);
      return ResponseHelper.error(res, error);
    }
  }

  /**
   * Export performance data
   */
  async exportPerformanceData(req, res) {
    try {
      const performanceData = databasePerformanceService.exportPerformanceData();
      
      return ResponseHelper.success(res, performanceData, 'Performance data exported successfully');
    } catch (error) {
      logger.error('Export performance data error:', error);
      return ResponseHelper.error(res, error);
    }
  }

  /**
   * Get health history
   */
  async getHealthHistory(req, res) {
    try {
      const { limit = 10 } = req.query;
      
      const history = databaseHealthService.getHealthHistory(parseInt(limit));
      
      return ResponseHelper.success(res, { 
        history,
        count: history.length 
      }, 'Health history retrieved successfully');
    } catch (error) {
      logger.error('Get health history error:', error);
      return ResponseHelper.error(res, error);
    }
  }

  /**
   * Get health trends
   */
  async getHealthTrends(req, res) {
    try {
      const trends = databaseHealthService.getHealthTrends();
      
      return ResponseHelper.success(res, trends, 'Health trends retrieved successfully');
    } catch (error) {
      logger.error('Get health trends error:', error);
      return ResponseHelper.error(res, error);
    }
  }

  /**
   * Start real-time monitoring
   */
  async startRealTimeMonitoring(req, res) {
    try {
      const { interval = 5000 } = req.body;
      
      databasePerformanceService.startRealTimeMonitoring(parseInt(interval));
      
      return ResponseHelper.success(res, { 
        interval: parseInt(interval),
        status: 'started' 
      }, 'Real-time monitoring started successfully');
    } catch (error) {
      logger.error('Start real-time monitoring error:', error);
      return ResponseHelper.error(res, error);
    }
  }

  /**
   * Stop real-time monitoring
   */
  async stopRealTimeMonitoring(req, res) {
    try {
      databasePerformanceService.stopRealTimeMonitoring();
      
      return ResponseHelper.success(res, { 
        status: 'stopped' 
      }, 'Real-time monitoring stopped successfully');
    } catch (error) {
      logger.error('Stop real-time monitoring error:', error);
      return ResponseHelper.error(res, error);
    }
  }

  /**
   * Create database backup
   */
  async createBackup(req, res) {
    try {
      const { name, description, includeIndexes = true, compression = true } = req.body;
      
      const backup = await this.backupService.createBackup({
        name,
        description,
        includeIndexes,
        compression
      });
      
      return ResponseHelper.success(res, backup, 'Database backup created successfully');
    } catch (error) {
      logger.error('Create backup error:', error);
      return ResponseHelper.error(res, error);
    }
  }

  /**
   * List available backups
   */
  async listBackups(req, res) {
    try {
      const backups = await this.backupService.listBackups();
      
      return ResponseHelper.success(res, { 
        backups,
        count: backups.length 
      }, 'Backups listed successfully');
    } catch (error) {
      logger.error('List backups error:', error);
      return ResponseHelper.error(res, error);
    }
  }

  /**
   * Restore database from backup
   */
  async restoreBackup(req, res) {
    try {
      const { backupName } = req.params;
      const { dropExisting = false, preserveIndexes = true, collections = null } = req.body;
      
      const restore = await this.backupService.restoreBackup(backupName, {
        dropExisting,
        preserveIndexes,
        collections
      });
      
      return ResponseHelper.success(res, restore, 'Database restored successfully');
    } catch (error) {
      logger.error('Restore backup error:', error);
      return ResponseHelper.error(res, error);
    }
  }

  /**
   * Delete backup
   */
  async deleteBackup(req, res) {
    try {
      const { backupName } = req.params;
      
      const result = await this.backupService.deleteBackup(backupName);
      
      return ResponseHelper.success(res, result, 'Backup deleted successfully');
    } catch (error) {
      logger.error('Delete backup error:', error);
      return ResponseHelper.error(res, error);
    }
  }

  /**
   * Validate backup integrity
   */
  async validateBackup(req, res) {
    try {
      const { backupName } = req.params;
      
      const validation = await this.backupService.validateBackup(backupName);
      
      return ResponseHelper.success(res, validation, 'Backup validation completed');
    } catch (error) {
      logger.error('Validate backup error:', error);
      return ResponseHelper.error(res, error);
    }
  }

  /**
   * Schedule automatic backups
   */
  async scheduleAutomaticBackups(req, res) {
    try {
      const { interval = 'daily' } = req.body;
      
      this.backupService.scheduleAutomaticBackups(interval);
      
      return ResponseHelper.success(res, { 
        interval,
        status: 'scheduled' 
      }, 'Automatic backups scheduled successfully');
    } catch (error) {
      logger.error('Schedule automatic backups error:', error);
      return ResponseHelper.error(res, error);
    }
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(req, res) {
    try {
      const stats = await databasePerformanceService.getDatabaseStats();
      
      return ResponseHelper.success(res, stats, 'Database statistics retrieved successfully');
    } catch (error) {
      logger.error('Get database stats error:', error);
      return ResponseHelper.error(res, error);
    }
  }

  /**
   * Get index usage statistics
   */
  async getIndexUsageStats(req, res) {
    try {
      const indexStats = await databasePerformanceService.getIndexUsageStats();
      
      return ResponseHelper.success(res, indexStats, 'Index usage statistics retrieved successfully');
    } catch (error) {
      logger.error('Get index usage stats error:', error);
      return ResponseHelper.error(res, error);
    }
  }
}

module.exports = DatabaseHealthController;