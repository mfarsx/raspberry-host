const Project = require('../models/Project');
const BaseRepository = require('./baseRepository');
const { logger } = require('../config/logger');
const { DatabaseErrorHandler, NotFoundError, ValidationError } = require('../utils/databaseErrors');

/**
 * Modern Project Repository
 * Extends BaseRepository with project-specific operations
 */
class ModernProjectRepository extends BaseRepository {
  constructor() {
    super(Project, 'Project');
  }

  /**
   * Find projects by user with pagination
   */
  async findByUser(userId, options = {}) {
    return DatabaseErrorHandler.execute(async () => {
      const filter = { createdBy: userId };
      const populateOptions = 'createdBy username email';
      
      return await this.findWithPagination({
        ...options,
        filter,
        populate: populateOptions
      });
    }, 'Finding projects by user');
  }

  /**
   * Find project by domain
   */
  async findByDomain(domain, excludeId = null) {
    return DatabaseErrorHandler.execute(async () => {
      const filter = { domain: domain.toLowerCase() };
      if (excludeId) {
        filter._id = { $ne: excludeId };
      }
      
      return await this.findOne(filter, {
        populate: 'createdBy username email'
      });
    }, 'Finding project by domain');
  }

  /**
   * Find projects by status
   */
  async findByStatus(status, options = {}) {
    return DatabaseErrorHandler.execute(async () => {
      return await this.findMany(
        { status },
        {
          populate: 'createdBy username email',
          sort: { createdAt: -1 },
          ...options
        }
      );
    }, 'Finding projects by status');
  }

  /**
   * Get recent projects
   */
  async getRecent(limit = 5) {
    return DatabaseErrorHandler.execute(async () => {
      return await this.findMany(
        {},
        {
          populate: 'createdBy username email',
          sort: { createdAt: -1 },
          limit
        }
      );
    }, 'Getting recent projects');
  }

  /**
   * Update project status
   */
  async updateStatus(id, status) {
    return DatabaseErrorHandler.execute(async () => {
      const project = await this.findById(id);
      
      if (!project) {
        throw new NotFoundError('Project');
      }
      
      const updateData = { status };
      if (status === 'running') {
        updateData.lastDeployed = new Date();
      }
      
      const updatedProject = await this.updateById(id, updateData, {
        populate: 'createdBy username email'
      });
      
      logger.info(`Project status updated: ${project.name} -> ${status}`);
      return updatedProject;
    }, 'Updating project status');
  }

  /**
   * Set container information
   */
  async setContainerInfo(id, containerId, projectPath) {
    return DatabaseErrorHandler.execute(async () => {
      const updateData = {
        containerId,
        projectPath,
        updatedAt: new Date()
      };
      
      const updatedProject = await this.updateById(id, updateData, {
        populate: 'createdBy username email'
      });
      
      logger.info(`Container info set for project: ${updatedProject.name}`);
      return updatedProject;
    }, 'Setting container info');
  }

  /**
   * Check domain availability
   */
  async isDomainAvailable(domain, excludeId = null) {
    return DatabaseErrorHandler.execute(async () => {
      const filter = { domain: domain.toLowerCase() };
      if (excludeId) {
        filter._id = { $ne: excludeId };
      }
      
      return !(await this.exists(filter));
    }, 'Checking domain availability');
  }

  /**
   * Check project name availability
   */
  async isNameAvailable(name, excludeId = null) {
    return DatabaseErrorHandler.execute(async () => {
      const filter = { name };
      if (excludeId) {
        filter._id = { $ne: excludeId };
      }
      
      return !(await this.exists(filter));
    }, 'Checking name availability');
  }

  /**
   * Check port availability
   */
  async isPortAvailable(port, excludeId = null) {
    return DatabaseErrorHandler.execute(async () => {
      const filter = { port: parseInt(port) };
      if (excludeId) {
        filter._id = { $ne: excludeId };
      }
      
      return !(await this.exists(filter));
    }, 'Checking port availability');
  }

  /**
   * Get all used ports
   */
  async getUsedPorts() {
    return DatabaseErrorHandler.execute(async () => {
      const projects = await this.findMany(
        {},
        { select: 'port assignedPort' }
      );
      
      return projects
        .map(project => project.assignedPort || project.port)
        .filter(port => port !== null);
    }, 'Getting used ports');
  }

  /**
   * Get project statistics with aggregation
   */
  async getStatistics() {
    return DatabaseErrorHandler.execute(async () => {
      const pipeline = [
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: null,
            statusCounts: {
              $push: {
                status: '$_id',
                count: '$count'
              }
            },
            total: { $sum: '$count' }
          }
        },
        {
          $project: {
            _id: 0,
            total: 1,
            byStatus: {
              $arrayToObject: {
                $map: {
                  input: '$statusCounts',
                  as: 'status',
                  in: {
                    k: '$$status.status',
                    v: '$$status.count'
                  }
                }
              }
            }
          }
        }
      ];
      
      const result = await this.aggregate(pipeline);
      return result[0] || { total: 0, byStatus: {} };
    }, 'Getting project statistics');
  }

  /**
   * Search projects with advanced filtering
   */
  async searchProjects(searchCriteria, options = {}) {
    return DatabaseErrorHandler.execute(async () => {
      const {
        query = '',
        status = null,
        userId = null,
        dateRange = null,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = searchCriteria;

      const filter = {};
      
      // Text search
      if (query) {
        filter.$or = [
          { name: { $regex: query, $options: 'i' } },
          { domain: { $regex: query, $options: 'i' } },
          { repository: { $regex: query, $options: 'i' } }
        ];
      }
      
      // Status filter
      if (status) {
        filter.status = status;
      }
      
      // User filter
      if (userId) {
        filter.createdBy = userId;
      }
      
      // Date range filter
      if (dateRange && dateRange.start && dateRange.end) {
        filter.createdAt = {
          $gte: new Date(dateRange.start),
          $lte: new Date(dateRange.end)
        };
      }
      
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
      
      return await this.findWithPagination({
        ...options,
        filter,
        sort,
        populate: 'createdBy username email'
      });
    }, 'Searching projects');
  }

  /**
   * Get projects by port range
   */
  async findByPortRange(minPort, maxPort) {
    return DatabaseErrorHandler.execute(async () => {
      return await this.findMany({
        $or: [
          { port: { $gte: minPort, $lte: maxPort } },
          { assignedPort: { $gte: minPort, $lte: maxPort } }
        ]
      }, {
        populate: 'createdBy username email',
        sort: { port: 1 }
      });
    }, 'Finding projects by port range');
  }

  /**
   * Bulk update project statuses
   */
  async bulkUpdateStatus(projectIds, status) {
    return DatabaseErrorHandler.execute(async () => {
      const operations = projectIds.map(id => ({
        updateOne: {
          filter: { _id: id },
          update: { 
            status,
            updatedAt: new Date(),
            ...(status === 'running' && { lastDeployed: new Date() })
          }
        }
      }));
      
      const result = await this.bulkWrite(operations);
      logger.info(`Bulk updated ${result.modifiedCount} project statuses to ${status}`);
      return result;
    }, 'Bulk updating project statuses');
  }

  /**
   * Get project health metrics
   */
  async getHealthMetrics() {
    return DatabaseErrorHandler.execute(async () => {
      const pipeline = [
        {
          $group: {
            _id: null,
            totalProjects: { $sum: 1 },
            runningProjects: {
              $sum: { $cond: [{ $eq: ['$status', 'running'] }, 1, 0] }
            },
            errorProjects: {
              $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] }
            },
            deployingProjects: {
              $sum: { $cond: [{ $eq: ['$status', 'deploying'] }, 1, 0] }
            },
            stoppedProjects: {
              $sum: { $cond: [{ $eq: ['$status', 'stopped'] }, 1, 0] }
            },
            avgUptime: {
              $avg: {
                $cond: [
                  { $ne: ['$lastDeployed', null] },
                  { $subtract: ['$$NOW', '$lastDeployed'] },
                  null
                ]
              }
            }
          }
        }
      ];
      
      const result = await this.aggregate(pipeline);
      return result[0] || {
        totalProjects: 0,
        runningProjects: 0,
        errorProjects: 0,
        deployingProjects: 0,
        stoppedProjects: 0,
        avgUptime: 0
      };
    }, 'Getting project health metrics');
  }
}

module.exports = ModernProjectRepository;