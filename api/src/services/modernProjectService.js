const ModernProjectRepository = require('../repositories/modernProjectRepository');
const ModernUserRepository = require('../repositories/modernUserRepository');
const DatabaseValidator = require('../utils/databaseValidator');
const { DatabaseErrorHandler, NotFoundError, ValidationError } = require('../utils/databaseErrors');
const { logger } = require('../config/logger');

/**
 * Modern Project Service
 * Uses repository pattern and modern error handling
 */
class ModernProjectService {
  constructor() {
    this.projectRepository = new ModernProjectRepository();
    this.userRepository = new ModernUserRepository();
  }

  /**
   * Create a new project
   */
  async createProject(projectData, userId) {
    return DatabaseErrorHandler.execute(async () => {
      // Validate and sanitize input data
      const sanitizedData = DatabaseValidator.sanitizeProjectData(projectData);
      
      // Check if user exists
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new NotFoundError('User');
      }

      // Check domain availability
      const isDomainAvailable = await this.projectRepository.isDomainAvailable(sanitizedData.domain);
      if (!isDomainAvailable) {
        throw new ValidationError('Domain is already in use');
      }

      // Check name availability
      const isNameAvailable = await this.projectRepository.isNameAvailable(sanitizedData.name);
      if (!isNameAvailable) {
        throw new ValidationError('Project name is already in use');
      }

      // Check port availability if not auto-assigned
      if (!sanitizedData.autoPort) {
        const isPortAvailable = await this.projectRepository.isPortAvailable(sanitizedData.port);
        if (!isPortAvailable) {
          throw new ValidationError('Port is already in use');
        }
      }

      // Create project
      const projectDataWithUser = {
        ...sanitizedData,
        createdBy: userId,
        status: 'stopped'
      };

      const project = await this.projectRepository.create(projectDataWithUser);
      
      logger.info(`Project created: ${project.name} by user ${user.username}`);
      return project;
    }, 'Creating project');
  }

  /**
   * Get project by ID
   */
  async getProjectById(projectId, userId = null) {
    return DatabaseErrorHandler.execute(async () => {
      const project = await this.projectRepository.findById(projectId, {
        populate: 'createdBy username email'
      });

      if (!project) {
        throw new NotFoundError('Project');
      }

      // Check if user has access to this project
      if (userId && project.createdBy._id.toString() !== userId) {
        throw new ValidationError('Access denied to this project');
      }

      return project;
    }, 'Getting project by ID');
  }

  /**
   * Get projects by user with pagination
   */
  async getProjectsByUser(userId, options = {}) {
    return DatabaseErrorHandler.execute(async () => {
      const sanitizedOptions = {
        page: DatabaseValidator.sanitizePagination(options.page, options.limit).page,
        limit: DatabaseValidator.sanitizePagination(options.page, options.limit).limit,
        sort: DatabaseValidator.sanitizeSort(options.sortBy, options.sortOrder, [
          'createdAt', 'updatedAt', 'name', 'status', 'domain'
        ])
      };

      return await this.projectRepository.findByUser(userId, sanitizedOptions);
    }, 'Getting projects by user');
  }

  /**
   * Update project
   */
  async updateProject(projectId, updateData, userId) {
    return DatabaseErrorHandler.execute(async () => {
      // Get existing project
      const existingProject = await this.projectRepository.findById(projectId);
      if (!existingProject) {
        throw new NotFoundError('Project');
      }

      // Check if user has access
      if (existingProject.createdBy.toString() !== userId) {
        throw new ValidationError('Access denied to this project');
      }

      // Validate and sanitize update data
      const sanitizedData = DatabaseValidator.sanitizeProjectData(updateData);

      // Check domain availability if domain is being changed
      if (sanitizedData.domain && sanitizedData.domain !== existingProject.domain) {
        const isDomainAvailable = await this.projectRepository.isDomainAvailable(
          sanitizedData.domain, 
          projectId
        );
        if (!isDomainAvailable) {
          throw new ValidationError('Domain is already in use');
        }
      }

      // Check name availability if name is being changed
      if (sanitizedData.name && sanitizedData.name !== existingProject.name) {
        const isNameAvailable = await this.projectRepository.isNameAvailable(
          sanitizedData.name, 
          projectId
        );
        if (!isNameAvailable) {
          throw new ValidationError('Project name is already in use');
        }
      }

      // Check port availability if port is being changed
      if (sanitizedData.port && sanitizedData.port !== existingProject.port) {
        const isPortAvailable = await this.projectRepository.isPortAvailable(
          sanitizedData.port, 
          projectId
        );
        if (!isPortAvailable) {
          throw new ValidationError('Port is already in use');
        }
      }

      // Update project
      const updatedProject = await this.projectRepository.updateById(projectId, sanitizedData, {
        populate: 'createdBy username email'
      });

      logger.info(`Project updated: ${updatedProject.name}`);
      return updatedProject;
    }, 'Updating project');
  }

  /**
   * Delete project (soft delete)
   */
  async deleteProject(projectId, userId) {
    return DatabaseErrorHandler.execute(async () => {
      // Get existing project
      const existingProject = await this.projectRepository.findById(projectId);
      if (!existingProject) {
        throw new NotFoundError('Project');
      }

      // Check if user has access
      if (existingProject.createdBy.toString() !== userId) {
        throw new ValidationError('Access denied to this project');
      }

      // Soft delete
      const deletedProject = await this.projectRepository.updateById(projectId, {
        isDeleted: true,
        deletedAt: new Date(),
        status: 'stopped'
      });

      logger.info(`Project soft deleted: ${deletedProject.name}`);
      return deletedProject;
    }, 'Deleting project');
  }

  /**
   * Update project status
   */
  async updateProjectStatus(projectId, status, userId = null) {
    return DatabaseErrorHandler.execute(async () => {
      const project = await this.projectRepository.findById(projectId);
      if (!project) {
        throw new NotFoundError('Project');
      }

      // Check if user has access (if userId provided)
      if (userId && project.createdBy.toString() !== userId) {
        throw new ValidationError('Access denied to this project');
      }

      const updatedProject = await this.projectRepository.updateStatus(projectId, status);
      
      logger.info(`Project status updated: ${project.name} -> ${status}`);
      return updatedProject;
    }, 'Updating project status');
  }

  /**
   * Set container information
   */
  async setContainerInfo(projectId, containerId, projectPath) {
    return DatabaseErrorHandler.execute(async () => {
      const project = await this.projectRepository.findById(projectId);
      if (!project) {
        throw new NotFoundError('Project');
      }

      const updatedProject = await this.projectRepository.setContainerInfo(
        projectId, 
        containerId, 
        projectPath
      );

      logger.info(`Container info set for project: ${updatedProject.name}`);
      return updatedProject;
    }, 'Setting container info');
  }

  /**
   * Search projects with advanced filtering
   */
  async searchProjects(searchCriteria, userId = null) {
    return DatabaseErrorHandler.execute(async () => {
      const sanitizedCriteria = {
        query: DatabaseValidator.sanitizeSearchQuery(searchCriteria.query),
        status: searchCriteria.status,
        userId: userId,
        dateRange: searchCriteria.dateRange ? 
          DatabaseValidator.sanitizeDateRange(searchCriteria.dateRange.start, searchCriteria.dateRange.end) : 
          null,
        sortBy: searchCriteria.sortBy || 'createdAt',
        sortOrder: searchCriteria.sortOrder || 'desc'
      };

      const sanitizedOptions = {
        page: DatabaseValidator.sanitizePagination(searchCriteria.page, searchCriteria.limit).page,
        limit: DatabaseValidator.sanitizePagination(searchCriteria.page, searchCriteria.limit).limit
      };

      return await this.projectRepository.searchProjects(sanitizedCriteria, sanitizedOptions);
    }, 'Searching projects');
  }

  /**
   * Get project statistics
   */
  async getProjectStatistics(userId = null) {
    return DatabaseErrorHandler.execute(async () => {
      if (userId) {
        // Get user-specific statistics
        const userProjects = await this.projectRepository.findByUser(userId);
        const stats = await this.projectRepository.getStatistics();
        
        return {
          ...stats,
          userProjects: userProjects.documents.length
        };
      } else {
        // Get global statistics
        return await this.projectRepository.getStatistics();
      }
    }, 'Getting project statistics');
  }

  /**
   * Get project health metrics
   */
  async getProjectHealthMetrics() {
    return DatabaseErrorHandler.execute(async () => {
      return await this.projectRepository.getHealthMetrics();
    }, 'Getting project health metrics');
  }

  /**
   * Get recent projects
   */
  async getRecentProjects(limit = 5) {
    return DatabaseErrorHandler.execute(async () => {
      const sanitizedLimit = Math.min(Math.max(1, parseInt(limit) || 5), 20);
      return await this.projectRepository.getRecent(sanitizedLimit);
    }, 'Getting recent projects');
  }

  /**
   * Bulk update project statuses
   */
  async bulkUpdateProjectStatuses(projectIds, status, userId = null) {
    return DatabaseErrorHandler.execute(async () => {
      // Validate project IDs
      const sanitizedIds = projectIds.map(id => DatabaseValidator.sanitizeObjectId(id));

      // Check if user has access to all projects (if userId provided)
      if (userId) {
        for (const projectId of sanitizedIds) {
          const project = await this.projectRepository.findById(projectId);
          if (!project || project.createdBy.toString() !== userId) {
            throw new ValidationError(`Access denied to project ${projectId}`);
          }
        }
      }

      return await this.projectRepository.bulkUpdateStatus(sanitizedIds, status);
    }, 'Bulk updating project statuses');
  }

  /**
   * Get projects by port range
   */
  async getProjectsByPortRange(minPort, maxPort) {
    return DatabaseErrorHandler.execute(async () => {
      const sanitizedMinPort = DatabaseValidator.sanitizePort(minPort);
      const sanitizedMaxPort = DatabaseValidator.sanitizePort(maxPort);

      if (sanitizedMinPort > sanitizedMaxPort) {
        throw new ValidationError('Minimum port cannot be greater than maximum port');
      }

      return await this.projectRepository.findByPortRange(sanitizedMinPort, sanitizedMaxPort);
    }, 'Getting projects by port range');
  }

  /**
   * Check domain availability
   */
  async checkDomainAvailability(domain, excludeProjectId = null) {
    return DatabaseErrorHandler.execute(async () => {
      const sanitizedDomain = DatabaseValidator.sanitizeDomain(domain);
      const sanitizedExcludeId = excludeProjectId ? 
        DatabaseValidator.sanitizeObjectId(excludeProjectId) : null;

      return await this.projectRepository.isDomainAvailable(sanitizedDomain, sanitizedExcludeId);
    }, 'Checking domain availability');
  }

  /**
   * Check port availability
   */
  async checkPortAvailability(port, excludeProjectId = null) {
    return DatabaseErrorHandler.execute(async () => {
      const sanitizedPort = DatabaseValidator.sanitizePort(port);
      const sanitizedExcludeId = excludeProjectId ? 
        DatabaseValidator.sanitizeObjectId(excludeProjectId) : null;

      return await this.projectRepository.isPortAvailable(sanitizedPort, sanitizedExcludeId);
    }, 'Checking port availability');
  }

  /**
   * Get all used ports
   */
  async getUsedPorts() {
    return DatabaseErrorHandler.execute(async () => {
      return await this.projectRepository.getUsedPorts();
    }, 'Getting used ports');
  }
}

module.exports = ModernProjectService;