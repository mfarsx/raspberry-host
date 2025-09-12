const { logger } = require("../config/logger");
const ResponseHelper = require("../utils/responseHelper");
const { ProjectService } = require("../services/projectService");
const projectRepository = require("../repositories/projectRepository");

class ProjectController {
  constructor() {
    this.projectService = new ProjectService();
  }

  /**
   * Get all hosted projects
   */
  async getAllProjects(req, res) {
    try {
      const { page = 1, limit = 10, status, search } = req.query;
      const filters = {};
      
      if (status) filters.status = status;
      if (search) filters.search = search;
      
      const result = await projectRepository.findAll(page, limit, filters);
      return ResponseHelper.successWithPagination(res, result.projects, result.pagination);
    } catch (error) {
      logger.error('Get all projects error:', error);
      return ResponseHelper.internalError(res, "Failed to get projects");
    }
  }

  /**
   * Search projects
   */
  async searchProjects(req, res) {
    const { q, status, page = 1, limit = 10 } = req.query;

    const criteria = {};
    if (q) criteria.search = q;
    if (status) criteria.status = status;

    const projects = await this.projectService.searchProjects(criteria);

    // Simple pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedProjects = projects.slice(startIndex, endIndex);

    return ResponseHelper.successWithPagination(res, paginatedProjects, {
      page: parseInt(page),
      limit: parseInt(limit),
      total: projects.length,
      pages: Math.ceil(projects.length / limit),
    });
  }

  /**
   * Get project by ID
   */
  async getProjectById(req, res) {
    try {
      const { id } = req.params;
      const project = await projectRepository.findById(id);

      if (!project) {
        return ResponseHelper.notFound(res, "Project not found");
      }

      return ResponseHelper.success(res, project);
    } catch (error) {
      logger.error('Get project by ID error:', error);
      return ResponseHelper.internalError(res, "Failed to get project");
    }
  }

  /**
   * Deploy new project
   */
  async deployProject(req, res) {
    try {
      const projectData = {
        ...req.body,
        createdBy: req.user.id
      };

      // Check if domain is available
      const domainAvailable = await projectRepository.isDomainAvailable(projectData.domain);
      if (!domainAvailable) {
        return ResponseHelper.conflict(res, "Domain already in use");
      }

      // Check if project name is available
      const nameAvailable = await projectRepository.isNameAvailable(projectData.name);
      if (!nameAvailable) {
        return ResponseHelper.conflict(res, "Project name already exists");
      }

      // Deploy project using service (which handles database creation)
      try {
        const deployedProject = await this.projectService.deployProject(projectData);
        logger.info(`Project deployed: ${deployedProject.name} at ${deployedProject.domain}`);
        return ResponseHelper.created(res, deployedProject, "Project deployed successfully");
      } catch (deployError) {
        logger.error('Deployment failed:', deployError);
        // The project service already handles error status updates
        return ResponseHelper.serverError(res, deployError.message);
      }
    } catch (error) {
      logger.error('Deploy project error:', error);
      return ResponseHelper.serverError(res, "Failed to deploy project");
    }
  }

  /**
   * Update project
   */
  async updateProject(req, res) {
    const { id } = req.params;
    const project = await this.projectService.updateProject(id, req.body);

    if (!project) {
      return ResponseHelper.notFound(res, "Project not found");
    }

    return ResponseHelper.success(res, project, {
      message: "Project updated successfully",
    });
  }

  /**
   * Delete project
   */
  async deleteProject(req, res) {
    const { id } = req.params;
    const success = await this.projectService.deleteProject(id);

    if (!success) {
      return ResponseHelper.notFound(res, "Project not found");
    }

    logger.info(`Project deleted: ${id}`);

    return ResponseHelper.success(res, null, {
      message: "Project deleted successfully",
    });
  }

  /**
   * Restart project
   */
  async restartProject(req, res) {
    const { id } = req.params;
    const success = await this.projectService.restartProject(id);

    if (!success) {
      return ResponseHelper.notFound(res, "Project not found");
    }

    logger.info(`Project restarted: ${id}`);

    return ResponseHelper.success(res, null, {
      message: "Project restarted successfully",
    });
  }

  /**
   * Get project logs
   */
  async getProjectLogs(req, res) {
    const { id } = req.params;
    const { lines } = req.query;

    const logs = await this.projectService.getProjectLogs(id, lines);

    if (!logs) {
      return ResponseHelper.notFound(res, "Project not found");
    }

    return ResponseHelper.success(res, logs);
  }

  /**
   * Get project status
   */
  async getProjectStatus(req, res) {
    const { id } = req.params;
    const status = await this.projectService.getProjectStatus(id);

    if (!status) {
      return ResponseHelper.notFound(res, "Project not found");
    }

    return ResponseHelper.success(res, status);
  }

  /**
   * Get project statistics
   */
  async getProjectStatistics(req, res) {
    const stats = await this.projectService.getProjectStatistics();
    return ResponseHelper.success(res, stats);
  }

  /**
   * Start project
   */
  async startProject(req, res) {
    const { id } = req.params;
    const success = await this.projectService.startProject(id);

    if (!success) {
      return ResponseHelper.notFound(res, "Project not found");
    }

    logger.info(`Project started: ${id}`);

    return ResponseHelper.success(res, null, {
      message: "Project started successfully",
    });
  }

  /**
   * Stop project
   */
  async stopProject(req, res) {
    const { id } = req.params;
    const success = await this.projectService.stopProject(id);

    if (!success) {
      return ResponseHelper.notFound(res, "Project not found");
    }

    logger.info(`Project stopped: ${id}`);

    return ResponseHelper.success(res, null, {
      message: "Project stopped successfully",
    });
  }

  /**
   * Update project port
   */
  async updateProjectPort(req, res) {
    try {
      const { id } = req.params;
      const { port } = req.body;

      // Validate port in request body
      if (!port || typeof port !== 'number') {
        return ResponseHelper.badRequest(res, "Port number is required and must be a number");
      }

      const updatedProject = await this.projectService.updateProjectPort(id, port);

      logger.info(`Project port updated: ${id} -> ${port}`);

      return ResponseHelper.success(res, updatedProject, {
        message: "Project port updated successfully",
      });

    } catch (error) {
      logger.error('Update project port error:', error);
      
      if (error.message.includes('not found')) {
        return ResponseHelper.notFound(res, "Project not found");
      }
      
      if (error.message.includes('already in use')) {
        return ResponseHelper.conflict(res, error.message);
      }
      
      if (error.message.includes('Invalid port')) {
        return ResponseHelper.badRequest(res, error.message);
      }

      return ResponseHelper.serverError(res, "Failed to update project port");
    }
  }
}

module.exports = ProjectController;