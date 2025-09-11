const { logger } = require("../config/logger");
const ResponseHelper = require("../utils/responseHelper");
const { ProjectService } = require("../services/projectService");

class ProjectController {
  constructor() {
    this.projectService = new ProjectService();
  }

  /**
   * Get all hosted projects
   */
  async getAllProjects(req, res) {
    const projects = await this.projectService.getAllProjects();
    return ResponseHelper.successWithCount(res, projects);
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
    const { id } = req.params;
    const project = await this.projectService.getProjectById(id);

    if (!project) {
      return ResponseHelper.notFound(res, "Project not found");
    }

    return ResponseHelper.success(res, project);
  }

  /**
   * Deploy new project
   */
  async deployProject(req, res) {
    const project = await this.projectService.deployProject(req.body);

    logger.info(`Project deployed: ${req.body.name} at ${req.body.domain}`);

    return ResponseHelper.created(res, project, "Project deployed successfully");
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
}

module.exports = ProjectController;