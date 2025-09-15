const { logger } = require("../config/logger");
const ResponseHelper = require("../utils/responseHelper");
const BaseController = require("../utils/baseController");
const { ProjectService } = require("../services/projectService");
const PortService = require("../services/portService");
const projectRepository = require("../repositories/projectRepository");

class ProjectController extends BaseController {
  constructor() {
    super('ProjectController');
    this.projectService = new ProjectService();
    this.portService = new PortService();
  }

  /**
   * Get all hosted projects
   */
  async getAllProjects(req, res) {
    return this.handlePaginatedList(req, res, async (req, res) => {
      const { page, limit } = this.extractPaginationParams(req);
      const filters = this.extractFilterParams(req, ['status', 'search']);
      
      const result = await projectRepository.findAll(page, limit, filters);
      return {
        data: result.projects,
        pagination: result.pagination
      };
    }, 'Projects');
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
    return this.handleSingleResource(req, res, async (req, res) => {
      const { id } = req.params;
      return await projectRepository.findById(id);
    }, 'Project');
  }

  /**
   * Deploy new project
   */
  async deployProject(req, res) {
    return this.handleCreate(req, res, async (req, res) => {
      const projectData = {
        ...req.body,
        createdBy: req.user.id
      };

      // Check if domain is available
      const domainAvailable = await projectRepository.isDomainAvailable(projectData.domain);
      if (!domainAvailable) {
        const error = new Error("Domain already in use");
        error.name = 'ConflictError';
        throw error;
      }

      // Check if project name is available
      const nameAvailable = await projectRepository.isNameAvailable(projectData.name);
      if (!nameAvailable) {
        const error = new Error("Project name already exists");
        error.name = 'ConflictError';
        throw error;
      }

      // Deploy project using service (which handles database creation)
      const deployedProject = await this.projectService.deployProject(projectData);
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
      return await this.projectService.updateProject(id, req.body);
    }, 'Project', 'Project updated successfully');
  }

  /**
   * Delete project
   */
  async deleteProject(req, res) {
    return this.handleDelete(req, res, async (req, res) => {
      const { id } = req.params;
      const success = await this.projectService.deleteProject(id);
      
      if (success) {
        this.logger.info(`Project deleted: ${id}`);
      }
      
      return success;
    }, 'Project', 'Project deleted successfully');
  }

  /**
   * Restart project
   */
  async restartProject(req, res) {
    return this.handleAction(req, res, async (req, res) => {
      const { id } = req.params;
      const success = await this.projectService.restartProject(id);
      
      if (success) {
        this.logger.info(`Project restarted: ${id}`);
      }
      
      return success;
    }, 'Project restart', 'Project restarted successfully');
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

  /**
   * Get port statistics and available ports
   */
  async getPortStatistics(req, res) {
    try {
      const statistics = await this.portService.getPortStatistics();
      return ResponseHelper.success(res, statistics, "Port statistics retrieved successfully");
    } catch (error) {
      logger.error('Get port statistics error:', error);
      return ResponseHelper.internalError(res, "Failed to get port statistics");
    }
  }

  /**
   * Check if a specific port is available
   */
  async checkPortAvailability(req, res) {
    try {
      const { port } = req.params;
      const portNumber = parseInt(port);
      
      if (isNaN(portNumber) || portNumber < 1 || portNumber > 65535) {
        return ResponseHelper.badRequest(res, "Invalid port number");
      }

      const isAvailable = !(await this.portService.isPortInUse(portNumber));
      const statistics = await this.portService.getPortStatistics();
      
      return ResponseHelper.success(res, {
        port: portNumber,
        available: isAvailable,
        statistics
      }, `Port ${portNumber} is ${isAvailable ? 'available' : 'in use'}`);
    } catch (error) {
      logger.error('Check port availability error:', error);
      return ResponseHelper.internalError(res, "Failed to check port availability");
    }
  }

  /**
   * Find available ports in a range
   */
  async findAvailablePorts(req, res) {
    try {
      const { min = 3000, max = 9999, count = 10 } = req.query;
      const minPort = parseInt(min);
      const maxPort = parseInt(max);
      const portCount = parseInt(count);
      
      if (isNaN(minPort) || isNaN(maxPort) || isNaN(portCount)) {
        return ResponseHelper.badRequest(res, "Invalid parameters");
      }

      if (minPort < 1 || maxPort > 65535 || minPort > maxPort) {
        return ResponseHelper.badRequest(res, "Invalid port range");
      }

      const availablePorts = await this.portService.findAvailablePorts({
        min: minPort,
        max: maxPort,
        count: portCount
      });

      return ResponseHelper.success(res, {
        availablePorts,
        range: { min: minPort, max: maxPort },
        count: availablePorts.length,
        requested: portCount
      }, `Found ${availablePorts.length} available ports`);
    } catch (error) {
      logger.error('Find available ports error:', error);
      return ResponseHelper.internalError(res, "Failed to find available ports");
    }
  }
}

module.exports = ProjectController;