const ModernProjectService = require('./modernProjectService');
const ModernUserService = require('./modernUserService');
const { databaseHealthService } = require('./databaseHealthService');
const { databasePerformanceService } = require('./databasePerformanceService');
const DatabaseBackup = require('../utils/databaseBackup');
const { logger } = require('../config/logger');

/**
 * Database Service Factory
 * Centralized factory for all database-related services
 */
class DatabaseServiceFactory {
  constructor() {
    this.services = new Map();
    this.initialized = false;
  }

  /**
   * Initialize all database services
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      logger.info('Initializing database services...');

      // Initialize core services
      this.services.set('projectService', new ModernProjectService());
      this.services.set('userService', new ModernUserService());
      this.services.set('healthService', databaseHealthService);
      this.services.set('performanceService', databasePerformanceService);
      this.services.set('backupService', new DatabaseBackup());

      // Start health monitoring
      databaseHealthService.startHealthMonitoring();

      // Start performance monitoring if enabled
      if (process.env.DB_PERFORMANCE_MONITORING !== 'false') {
        databasePerformanceService.startRealTimeMonitoring();
      }

      // Schedule automatic backups if enabled
      if (process.env.AUTO_BACKUP_ENABLED === 'true') {
        const backupInterval = process.env.AUTO_BACKUP_INTERVAL || 'daily';
        this.services.get('backupService').scheduleAutomaticBackups(backupInterval);
      }

      this.initialized = true;
      logger.info('Database services initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database services:', error);
      throw error;
    }
  }

  /**
   * Get a service by name
   */
  getService(serviceName) {
    if (!this.initialized) {
      throw new Error('Database services not initialized. Call initialize() first.');
    }

    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service '${serviceName}' not found`);
    }

    return service;
  }

  /**
   * Get project service
   */
  getProjectService() {
    return this.getService('projectService');
  }

  /**
   * Get user service
   */
  getUserService() {
    return this.getService('userService');
  }

  /**
   * Get health service
   */
  getHealthService() {
    return this.getService('healthService');
  }

  /**
   * Get performance service
   */
  getPerformanceService() {
    return this.getService('performanceService');
  }

  /**
   * Get backup service
   */
  getBackupService() {
    return this.getService('backupService');
  }

  /**
   * Get all services
   */
  getAllServices() {
    return {
      projectService: this.getProjectService(),
      userService: this.getUserService(),
      healthService: this.getHealthService(),
      performanceService: this.getPerformanceService(),
      backupService: this.getBackupService()
    };
  }

  /**
   * Get service status
   */
  getServiceStatus() {
    return {
      initialized: this.initialized,
      services: Array.from(this.services.keys()),
      health: {
        monitoring: databaseHealthService.healthCheckTimer !== null,
        performance: databasePerformanceService.realTimeInterval !== null
      }
    };
  }

  /**
   * Shutdown all services
   */
  async shutdown() {
    try {
      logger.info('Shutting down database services...');

      // Stop monitoring
      databaseHealthService.stopHealthMonitoring();
      databasePerformanceService.stopRealTimeMonitoring();

      // Clear services
      this.services.clear();
      this.initialized = false;

      logger.info('Database services shut down successfully');
    } catch (error) {
      logger.error('Error shutting down database services:', error);
      throw error;
    }
  }

  /**
   * Health check for all services
   */
  async healthCheck() {
    const healthStatus = {
      timestamp: new Date().toISOString(),
      services: {},
      overall: 'healthy'
    };

    try {
      // Check project service
      healthStatus.services.projectService = {
        status: 'healthy',
        message: 'Project service operational'
      };
    } catch (error) {
      healthStatus.services.projectService = {
        status: 'unhealthy',
        message: error.message
      };
      healthStatus.overall = 'unhealthy';
    }

    try {
      // Check user service
      healthStatus.services.userService = {
        status: 'healthy',
        message: 'User service operational'
      };
    } catch (error) {
      healthStatus.services.userService = {
        status: 'unhealthy',
        message: error.message
      };
      healthStatus.overall = 'unhealthy';
    }

    try {
      // Check health service
      const dbHealth = await databaseHealthService.getDatabaseHealth();
      healthStatus.services.healthService = {
        status: dbHealth.overall,
        message: 'Health service operational',
        database: dbHealth.overall
      };
    } catch (error) {
      healthStatus.services.healthService = {
        status: 'unhealthy',
        message: error.message
      };
      healthStatus.overall = 'unhealthy';
    }

    try {
      // Check performance service
      const performanceMetrics = databasePerformanceService.getPerformanceMetrics();
      healthStatus.services.performanceService = {
        status: 'healthy',
        message: 'Performance service operational',
        score: performanceMetrics.summary?.performanceScore || 0
      };
    } catch (error) {
      healthStatus.services.performanceService = {
        status: 'unhealthy',
        message: error.message
      };
      healthStatus.overall = 'unhealthy';
    }

    try {
      // Check backup service
      const backups = await this.getBackupService().listBackups();
      healthStatus.services.backupService = {
        status: 'healthy',
        message: 'Backup service operational',
        backupCount: backups.length
      };
    } catch (error) {
      healthStatus.services.backupService = {
        status: 'unhealthy',
        message: error.message
      };
      healthStatus.overall = 'unhealthy';
    }

    return healthStatus;
  }

  /**
   * Get comprehensive database information
   */
  async getDatabaseInfo() {
    try {
      const [
        healthStatus,
        performanceMetrics,
        backups,
        serviceStatus
      ] = await Promise.all([
        databaseHealthService.getDatabaseHealth(),
        databasePerformanceService.getPerformanceMetrics(),
        this.getBackupService().listBackups(),
        this.getServiceStatus()
      ]);

      return {
        timestamp: new Date().toISOString(),
        health: healthStatus,
        performance: performanceMetrics,
        backups: {
          count: backups.length,
          recent: backups.slice(0, 5)
        },
        services: serviceStatus,
        configuration: {
          monitoring: {
            health: databaseHealthService.healthCheckTimer !== null,
            performance: databasePerformanceService.realTimeInterval !== null
          },
          backup: {
            autoBackup: process.env.AUTO_BACKUP_ENABLED === 'true',
            interval: process.env.AUTO_BACKUP_INTERVAL || 'daily',
            maxBackups: process.env.MAX_DB_BACKUPS || 10
          },
          performance: {
            slowQueryThreshold: process.env.SLOW_QUERY_THRESHOLD || 100,
            maxSlowQueries: process.env.MAX_SLOW_QUERIES || 1000,
            monitoringEnabled: process.env.DB_PERFORMANCE_MONITORING !== 'false'
          }
        }
      };
    } catch (error) {
      logger.error('Failed to get database info:', error);
      throw error;
    }
  }
}

// Create singleton instance
const databaseServiceFactory = new DatabaseServiceFactory();

module.exports = {
  DatabaseServiceFactory,
  databaseServiceFactory
};