const { logger } = require("../config/logger");
const ResponseHelper = require("../utils/responseHelper");
const BaseController = require("../utils/baseController");
const ModernProjectService = require("../services/modernProjectService");
const PortService = require("../services/portService");
const StatusSyncService = require("../services/statusSyncService");
const { DatabaseErrorHandler } = require("../utils/databaseErrors");

/**
 * Modern Project Controller
 * Uses the new repository pattern and modern error handling
 */
class ModernProjectController extends BaseController {
  constructor() {
    super('ModernProjectController');
    this.projectService = new ModernProjectService();
    this.portService = new PortService();
    this.statusSyncService = new StatusSyncService();
  }

  /**
   * Get all hosted projects with advanced filtering and pagination
   */
  async getAllProjects(req, res) {
    return this.handlePaginatedList(req, res, async (req, res) => {
      const { page, limit } = this.extractPaginationParams(req);
      const filters = this.extractFilterParams(req, ['status', 'search', 'userId']);
      
      const searchCriteria = {
        query: filters.search,
        status: filters.status,
        userId: filters.userId,
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder || 'desc'
      };

      const result = await this.projectService.searchProjects(searchCriteria);
      
      return {
        data: result.documents,
        pagination: result.pagination
      };
    }, 'Projects');
  }

  /**
   * Search projects with advanced filtering
   */
  async searchProjects(req, res) {
    try {
      const {
        q: query,
        status,
        userId,
        dateRange,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 10
      } = req.query;

      const searchCriteria = {
        query,
        status,
        userId,
        dateRange: dateRange ? JSON.parse(dateRange) : null,
        sortBy,
        sortOrder,
        page: parseInt(page),
        limit: parseInt(limit)
      };

      const result = await this.projectService.searchProjects(searchCriteria);

      return ResponseHelper.successWithPagination(res, result.documents, result.pagination);
    } catch (error) {
      logger.error('Search projects error:', error);
      return ResponseHelper.error(res, error);
    }
  }

  /**
   * Get project by ID
   */
  async getProjectById(req, res) {
    return this.handleSingleResource(req, res, async (req, res) => {
      const { id } = req.params;
      const userId = req.user?.id; // Optional user context for access control
      
      return await this.projectService.getProjectById(id, userId);
    }, 'Project');
  }

  /**
   * Deploy new project
   */
  async deployProject(req, res) {
    return this.handleCreate(req, res, async (req, res) => {
      const projectData = req.body;
      const userId = req.user.id;

      // Deploy project using modern service
      const deployedProject = await this.projectService.createProject(projectData, userId);
      
      this.logger.info(`Project deployed: ${deployedProject.name} at ${deployedProject.domain}`);
      return deployedProject;
    }, 'Project', 'Project deployed successfully');
  }

  /**
   * Update project
   */
  async updateProject(req, res) {
    return this.handleUpdate(req, res, async (req, res) => {
      const { id } = req.params;
      const updateData = req.body;
      const userId = req.user.id;
      
      return await this.projectService.updateProject(id, updateData, userId);
    }, 'Project', 'Project updated successfully');
  }

  /**
   * Delete project (soft delete)
   */
  async deleteProject(req, res) {
    return this.handleDelete(req, res, async (req, res) => {
      const { id } = req.params;
      const userId = req.user.id;
      
      const deletedProject = await this.projectService.deleteProject(id, userId);
      
      this.logger.info(`Project soft deleted: ${deletedProject.name}`);
      return deletedProject;
    }, 'Project', 'Project deleted successfully');
  }

  /**
   * Update project status
   */
  async updateProjectStatus(req, res) {
    return this.handleAction(req, res, async (req, res) => {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user?.id; // Optional for admin operations
      
      const updatedProject = await this.projectService.updateProjectStatus(id, status, userId);
      
      this.logger.info(`Project status updated: ${updatedProject.name} -> ${status}`);
      return updatedProject;
    }, 'Project status update', 'Project status updated successfully');
  }

  /**
   * Set container information
   */
  async setContainerInfo(req, res) {
    return this.handleAction(req, res, async (req, res) => {
      const { id } = req.params;
      const { containerId, projectPath } = req.body;
      
      const updatedProject = await this.projectService.setContainerInfo(id, containerId, projectPath);
      
      this.logger.info(`Container info set for project: ${updatedProject.name}`);
      return updatedProject;
    }, 'Container info', 'Container information updated successfully');
  }

  /**
   * Get projects by user
   */
  async getProjectsByUser(req, res) {
    return this.handlePaginatedList(req, res, async (req, res) => {
      const { page, limit } = this.extractPaginationParams(req);
      const userId = req.user.id;
      
      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder || 'desc'
      };

      const result = await this.projectService.getProjectsByUser(userId, options);
      
      return {
        data: result.documents,
        pagination: result.pagination
      };
    }, 'User Projects');
  }

  /**
   * Get project statistics
   */
  async getProjectStatistics(req, res) {
    try {
      const userId = req.user?.id; // Optional - if provided, returns user-specific stats
      
      const statistics = await this.projectService.getProjectStatistics(userId);
      
      return ResponseHelper.success(res, statistics, 'Project statistics retrieved successfully');
    } catch (error) {
      logger.error('Get project statistics error:', error);
      return ResponseHelper.error(res, error);
    }
  }

  /**
   * Get project health metrics
   */
  async getProjectHealthMetrics(req, res) {
    try {
      const metrics = await this.projectService.getProjectHealthMetrics();
      
      return ResponseHelper.success(res, metrics, 'Project health metrics retrieved successfully');
    } catch (error) {
      logger.error('Get project health metrics error:', error);
      return ResponseHelper.error(res, error);
    }
  }

  /**
   * Get recent projects
   */
  async getRecentProjects(req, res) {
    try {
      const { limit = 5 } = req.query;
      
      const projects = await this.projectService.getRecentProjects(parseInt(limit));
      
      return ResponseHelper.success(res, projects, 'Recent projects retrieved successfully');
    } catch (error) {
      logger.error('Get recent projects error:', error);
      return ResponseHelper.error(res, error);
    }
  }

  /**
   * Bulk update project statuses
   */
  async bulkUpdateProjectStatuses(req, res) {
    try {
      const { projectIds, status } = req.body;
      const userId = req.user?.id; // Optional for admin operations
      
      if (!Array.isArray(projectIds) || projectIds.length === 0) {
        return ResponseHelper.badRequest(res, 'Project IDs array is required');
      }
      
      if (!status) {
        return ResponseHelper.badRequest(res, 'Status is required');
      }
      
      const result = await this.projectService.bulkUpdateProjectStatuses(projectIds, status, userId);
      
      return ResponseHelper.success(res, result, 'Project statuses updated successfully');
    } catch (error) {
      logger.error('Bulk update project statuses error:', error);
      return ResponseHelper.error(res, error);
    }
  }

  /**
   * Get projects by port range
   */
  async getProjectsByPortRange(req, res) {
    try {
      const { minPort, maxPort } = req.query;
      
      if (!minPort || !maxPort) {
        return ResponseHelper.badRequest(res, 'minPort and maxPort are required');
      }
      
      const projects = await this.projectService.getProjectsByPortRange(minPort, maxPort);
      
      return ResponseHelper.success(res, projects, 'Projects by port range retrieved successfully');
    } catch (error) {
      logger.error('Get projects by port range error:', error);
      return ResponseHelper.error(res, error);
    }
  }

  /**
   * Check domain availability
   */
  async checkDomainAvailability(req, res) {
    try {
      const { domain } = req.query;
      const { id: excludeProjectId } = req.params;
      
      if (!domain) {
        return ResponseHelper.badRequest(res, 'Domain is required');
      }
      
      const isAvailable = await this.projectService.checkDomainAvailability(domain, excludeProjectId);
      
      return ResponseHelper.success(res, { 
        domain, 
        available: isAvailable 
      }, 'Domain availability checked successfully');
    } catch (error) {
      logger.error('Check domain availability error:', error);
      return ResponseHelper.error(res, error);
    }
  }

  /**
   * Check port availability
   */
  async checkPortAvailability(req, res) {
    try {
      const { port } = req.query;
      const { id: excludeProjectId } = req.params;
      
      if (!port) {
        return ResponseHelper.badRequest(res, 'Port is required');
      }
      
      const isAvailable = await this.projectService.checkPortAvailability(port, excludeProjectId);
      
      return ResponseHelper.success(res, { 
        port, 
        available: isAvailable 
      }, 'Port availability checked successfully');
    } catch (error) {
      logger.error('Check port availability error:', error);
      return ResponseHelper.error(res, error);
    }
  }

  /**
   * Get all used ports
   */
  async getUsedPorts(req, res) {
    try {
      const usedPorts = await this.projectService.getUsedPorts();
      
      return ResponseHelper.success(res, { usedPorts }, 'Used ports retrieved successfully');
    } catch (error) {
      logger.error('Get used ports error:', error);
      return ResponseHelper.error(res, error);
    }
  }

  /**
   * Restart project (legacy method - kept for compatibility)
   */
  async restartProject(req, res) {
    return this.handleAction(req, res, async (req, res) => {
      const { id } = req.params;
      const userId = req.user.id;
      
      // Update status to deploying, then the deployment service will handle the restart
      const updatedProject = await this.projectService.updateProjectStatus(id, 'deploying', userId);
      
      this.logger.info(`Project restart initiated: ${updatedProject.name}`);
      return updatedProject;
    }, 'Project restart', 'Project restart initiated successfully');
  }

  /**
   * Get project logs (legacy method - kept for compatibility)
   */
  async getProjectLogs(req, res) {
    try {
      const { id } = req.params;
      const { lines = 100 } = req.query;
      
      // This would need to be implemented with the actual logging service
      // For now, return a placeholder response
      const logs = {
        projectId: id,
        lines: parseInt(lines),
        logs: [],
        message: 'Log retrieval not yet implemented with modern service'
      };
      
      return ResponseHelper.success(res, logs, 'Project logs retrieved successfully');
    } catch (error) {
      logger.error('Get project logs error:', error);
      return ResponseHelper.error(res, error);
    }
  }

  /**
   * Get project by domain
   */
  async getProjectByDomain(req, res) {
    try {
      const { domain } = req.params;
      
      if (!domain) {
        return ResponseHelper.badRequest(res, 'Domain is required');
      }
      
      // This would need to be added to the modern service
      // For now, return a placeholder response
      return ResponseHelper.success(res, { 
        domain,
        message: 'Domain-based project lookup not yet implemented with modern service'
      }, 'Project by domain retrieved successfully');
    } catch (error) {
      logger.error('Get project by domain error:', error);
      return ResponseHelper.error(res, error);
    }
  }
}

module.exports = ModernProjectController;