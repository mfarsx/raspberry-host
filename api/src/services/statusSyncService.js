const { logger } = require('../config/logger');
const BaseService = require('../utils/baseService');
const DockerService = require('./dockerService');
const projectRepository = require('../repositories/projectRepository');
const { getCacheService } = require('./cacheService');

/**
 * Status Synchronization Service
 * Ensures project status in database matches actual Docker container status
 */
class StatusSyncService extends BaseService {
  constructor(dependencies = {}) {
    super('StatusSyncService', dependencies);
    
    this.dockerService = dependencies.dockerService || new DockerService();
    this.cacheService = dependencies.cacheService || getCacheService();
    this.syncInterval = 30000; // 30 seconds
    this.isRunning = false;
    this.syncTimeout = null;
  }

  /**
   * Start the status synchronization process
   */
  start() {
    if (this.isRunning) {
      this.logger.warn('Status sync is already running');
      return;
    }

    this.isRunning = true;
    this.logger.info('Starting project status synchronization');
    
    // Run initial sync
    this.syncProjectStatuses();
    
    // Schedule periodic sync
    this.scheduleNextSync();
  }

  /**
   * Stop the status synchronization process
   */
  stop() {
    if (!this.isRunning) {
      this.logger.warn('Status sync is not running');
      return;
    }

    this.isRunning = false;
    
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
      this.syncTimeout = null;
    }

    this.logger.info('Stopped project status synchronization');
  }

  /**
   * Schedule the next synchronization
   * @private
   */
  scheduleNextSync() {
    if (!this.isRunning) return;

    this.syncTimeout = setTimeout(() => {
      this.syncProjectStatuses();
      this.scheduleNextSync();
    }, this.syncInterval);
  }

  /**
   * Synchronize all project statuses
   */
  async syncProjectStatuses() {
    try {
      this.logger.debug('Starting project status synchronization');
      
      // Get all projects from database
      const result = await projectRepository.findAll(1, 1000); // Get all projects
      const projects = result.projects || [];

      if (projects.length === 0) {
        this.logger.debug('No projects found for status sync');
        return;
      }

      this.logger.debug(`Syncing status for ${projects.length} projects`);

      // Process each project
      const syncPromises = projects.map(project => this.syncProjectStatus(project));
      const results = await Promise.allSettled(syncPromises);

      // Count successful and failed syncs
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      this.logger.debug(`Status sync completed: ${successful} successful, ${failed} failed`);

      // Invalidate cache after sync
      await this.cacheService.delete('projects:all');

    } catch (error) {
      this.logger.error('Failed to sync project statuses:', error);
    }
  }

  /**
   * Synchronize status for a single project
   * @param {Object} project - Project from database
   * @private
   */
  async syncProjectStatus(project) {
    try {
      const projectPath = `/app/projects/${project.name}`;
      
      // Get actual Docker container status
      const dockerStatus = await this.dockerService.getProjectStatus(projectPath);
      const actualStatus = dockerStatus.status; // 'running' or 'stopped'
      
      // Determine expected database status
      let expectedStatus;
      if (actualStatus === 'running') {
        expectedStatus = 'running';
      } else {
        // Check if project was recently deployed
        const timeSinceDeployment = Date.now() - new Date(project.updatedAt).getTime();
        const deploymentTimeout = 5 * 60 * 1000; // 5 minutes
        
        if (project.status === 'deploying' && timeSinceDeployment > deploymentTimeout) {
          expectedStatus = 'error'; // Deployment likely failed
        } else if (project.status === 'deploying' && timeSinceDeployment <= deploymentTimeout) {
          expectedStatus = 'deploying'; // Still within deployment timeout
        } else {
          expectedStatus = 'stopped';
        }
      }

      // Update database if status differs
      if (project.status !== expectedStatus) {
        this.logger.info(`Updating project ${project.name} status: ${project.status} -> ${expectedStatus}`);
        
        await projectRepository.updateStatus(project._id, expectedStatus);
        
        // Invalidate project-specific cache
        await this.cacheService.delete(`project:${project._id}`);
      }

    } catch (error) {
      this.logger.error(`Failed to sync status for project ${project.name}:`, error);
      
      // If we can't check Docker status, mark as error if it's been deploying too long
      if (project.status === 'deploying') {
        const timeSinceDeployment = Date.now() - new Date(project.updatedAt).getTime();
        const deploymentTimeout = 10 * 60 * 1000; // 10 minutes
        
        if (timeSinceDeployment > deploymentTimeout) {
          this.logger.warn(`Marking project ${project.name} as error due to sync failure`);
          try {
            await projectRepository.updateStatus(project._id, 'error');
          } catch (updateError) {
            this.logger.error(`Failed to update project ${project.name} to error status:`, updateError);
          }
        }
      }
    }
  }

  /**
   * Force sync a specific project
   * @param {string} projectId - Project ID
   */
  async syncProject(projectId) {
    try {
      const project = await projectRepository.findById(projectId);
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      await this.syncProjectStatus(project);
      this.logger.info(`Force synced project ${project.name}`);
      
    } catch (error) {
      this.logger.error(`Failed to force sync project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Get sync status information
   */
  getSyncStatus() {
    return {
      isRunning: this.isRunning,
      syncInterval: this.syncInterval,
      nextSyncIn: this.syncTimeout ? this.syncInterval : null
    };
  }

  /**
   * Update sync interval
   * @param {number} interval - New interval in milliseconds
   */
  setSyncInterval(interval) {
    if (interval < 10000) { // Minimum 10 seconds
      throw new Error('Sync interval must be at least 10 seconds');
    }

    this.syncInterval = interval;
    this.logger.info(`Updated sync interval to ${interval}ms`);

    // Restart sync if running
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }
}

module.exports = StatusSyncService;