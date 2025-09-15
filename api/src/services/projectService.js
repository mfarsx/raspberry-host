const { logger } = require("../config/logger");
const config = require("../config/environment");
const fs = require("fs").promises;
const path = require("path");
const BaseService = require("../utils/baseService");
const {
  ErrorFactory,
  NotFoundError,
  ValidationError,
} = require("../utils/serviceErrors");
const GitService = require("./gitService");
const DockerService = require("./dockerService");
const PortService = require("./portService");
const projectRepository = require("../repositories/projectRepository");
const { getCacheService } = require("./cacheService");

/**
 * In-memory project repository fallback when Redis is unavailable
 */
class InMemoryProjectRepository {
  constructor() {
    this.projects = new Map();
    this.logger = logger;
  }

  async getAllProjects() {
    return Array.from(this.projects.values());
  }

  async getProjectById(id) {
    return this.projects.get(id) || null;
  }

  async saveProject(id, project) {
    this.projects.set(id, project);
    this.logger.info(`Project saved in memory: ${id}`);
  }

  async updateProject(id, updates) {
    const existingProject = this.projects.get(id);
    if (!existingProject) {
      return null;
    }

    const updatedProject = {
      ...existingProject,
      ...updates,
      updatedAt: new Date(),
    };

    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  async deleteProject(id) {
    const existed = this.projects.has(id);
    this.projects.delete(id);
    this.logger.info(`Project deleted from memory: ${id}`);
    return existed;
  }

  async projectExists(id) {
    return this.projects.has(id);
  }

  async getProjectCount() {
    return this.projects.size;
  }

  async searchProjects(criteria) {
    const allProjects = Array.from(this.projects.values());

    return allProjects.filter((project) => {
      return Object.entries(criteria).every(([key, value]) => {
        if (typeof value === "string") {
          return (
            project[key] &&
            project[key].toLowerCase().includes(value.toLowerCase())
          );
        }
        return project[key] === value;
      });
    });
  }
}

/**
 * Project Service - Main service for project management
 * Enhanced with BaseService patterns and better error handling
 */
class ProjectService extends BaseService {
  constructor(dependencies = {}) {
    super("ProjectService", dependencies);

    this.projectsDir = config.projectsDir;
    this.maxConcurrentDeployments = config.maxConcurrentDeployments;
    this.deploymentTimeout = config.deploymentTimeout;

    // Dependency injection
    this.gitService = dependencies.gitService || new GitService();
    this.dockerService = dependencies.dockerService || new DockerService();
    this.portService = dependencies.portService || new PortService();
    this.projectRepository = dependencies.projectRepository || null;
    this.cacheService = dependencies.cacheService || getCacheService();

    this.ensureProjectsDirectory();
  }

  /**
   * Get project repository (MongoDB-based)
   * @returns {Object} Project repository instance
   */
  getProjectRepository() {
    return projectRepository;
  }

  async ensureProjectsDirectory() {
    try {
      await fs.mkdir(this.projectsDir, { recursive: true });
    } catch (error) {
      logger.error("Failed to create projects directory:", error);
    }
  }

  /**
   * Get all projects
   * @returns {Promise<Array>} Array of projects
   */
  async getAllProjects() {
    try {
      const cacheKey = "projects:all";

      // Try to get from cache first
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        this.logger.debug("Projects retrieved from cache");
        return cached;
      }

      // Get from MongoDB repository
      const result = await this.getProjectRepository().findAll(1, 1000); // Get all projects
      const projects = result.projects || [];

      // Cache the result
      await this.cacheService.set(cacheKey, projects, 60); // Cache for 1 minute

      return projects;
    } catch (error) {
      this.logger.error("Failed to get all projects:", error);
      return [];
    }
  }

  /**
   * Get project by ID
   * @param {string} id - Project ID
   * @returns {Promise<Object|null>} Project data or null
   */
  async getProjectById(id) {
    try {
      return await this.getProjectRepository().findById(id);
    } catch (error) {
      this.logger.error("Failed to get project by ID:", error);
      return null;
    }
  }

  /**
   * Deploy a new project
   * @param {Object} projectData - Project configuration
   * @returns {Promise<Object>} Deployed project data
   */
  async deployProject(projectData) {
    const project = this._initializeProject(projectData);
    let savedProject = null;

    try {
      // Handle port assignment
      await this._handlePortAssignment(project);

      // Validate and prepare project
      await this._validateAndPrepareProject(project);

      // Store project in database
      savedProject = await this.getProjectRepository().create(project);
      project._id = savedProject._id;

      // Deploy project infrastructure
      await this._deployProjectInfrastructure(project);

      // Update project status and cache
      await this._finalizeDeployment(savedProject, project.id);

      this.logger.info(`Project deployed successfully: ${project.name}`);
      return savedProject;
    } catch (error) {
      this.logger.error("Failed to deploy project:", error);
      await this._handleDeploymentError(savedProject);
      throw error;
    }
  }

  /**
   * Initialize project object with default values
   * @private
   */
  _initializeProject(projectData) {
    return {
      ...projectData,
      id: this.generateProjectId(projectData.name),
      status: "deploying",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastDeployed: new Date(),
    };
  }

  /**
   * Handle port assignment logic
   * @private
   */
  async _handlePortAssignment(project) {
    if (project.autoPort) {
      this.logger.info(`Auto-assigning port for project: ${project.name}`);
      const assignedPort = await this.portService.autoAssignPort(project, {
        preferredPort: project.port,
        projectType: 'web',
        allowReserved: false
      });
      project.assignedPort = assignedPort;
      this.logger.info(`Assigned port ${assignedPort} to project: ${project.name}`);
    } else {
      await this._handlePortConflict(project);
    }
  }

  /**
   * Handle port conflicts for manual port assignment
   * @private
   */
  async _handlePortConflict(project) {
    const isPortInUse = await this.portService.isPortInUse(project.port);
    if (isPortInUse) {
      this.logger.warn(`Port ${project.port} is already in use for project: ${project.name}`);
      const alternativePort = await this.portService.findAvailablePort({
        preferredPort: project.port + 1,
        minPort: project.port,
        maxPort: project.port + 100,
        allowReserved: false
      });
      project.assignedPort = alternativePort;
      this.logger.info(`Using alternative port ${alternativePort} for project: ${project.name}`);
    }
  }

  /**
   * Validate repository and prepare project for deployment
   * @private
   */
  async _validateAndPrepareProject(project) {
    const isValidRepo = await this.gitService.validateRepository(project.repository);
    if (!isValidRepo) {
      throw new Error(`Invalid or inaccessible repository: ${project.repository}`);
    }
  }

  /**
   * Deploy project infrastructure (clone, build, compose, start)
   * @private
   */
  async _deployProjectInfrastructure(project) {
    const projectPath = path.join(this.projectsDir, project.name);

    // Clone repository
    await this.gitService.cloneRepository(project.repository, project.branch, projectPath);

    // Build project if needed
    if (project.buildCommand) {
      await this.dockerService.buildProject(projectPath, project.buildCommand);
    }

    // Create and start Docker Compose
    await this.dockerService.createProjectCompose(project, projectPath);
    await this.dockerService.startProject(projectPath);
  }

  /**
   * Finalize deployment by updating status and cache
   * @private
   */
  async _finalizeDeployment(savedProject, projectId) {
    try {
      // Verify the project is actually running before marking as running
      const projectPath = path.join(this.projectsDir, savedProject.name);
      const dockerStatus = await this.dockerService.getProjectStatus(projectPath);
      
      if (dockerStatus.status === 'running') {
        await this.getProjectRepository().updateStatus(savedProject._id, "running");
        this.logger.info(`Project ${savedProject.name} successfully deployed and running`);
      } else {
        await this.getProjectRepository().updateStatus(savedProject._id, "error");
        this.logger.error(`Project ${savedProject.name} deployment completed but not running`);
      }
      
      await this._invalidateProjectCache(projectId);
    } catch (error) {
      this.logger.error(`Failed to finalize deployment for project ${savedProject.name}:`, error);
      await this.getProjectRepository().updateStatus(savedProject._id, "error");
      await this._invalidateProjectCache(projectId);
    }
  }

  /**
   * Handle deployment errors
   * @private
   */
  async _handleDeploymentError(savedProject) {
    if (savedProject) {
      await this.getProjectRepository().updateStatus(savedProject._id, "error");
    }
  }

  /**
   * Invalidate project-related cache entries
   * @private
   */
  async _invalidateProjectCache(projectId) {
    await Promise.all([
      this.cacheService.delete("projects:all"),
      this.cacheService.delete(`project:${projectId}`)
    ]);
  }

  /**
   * Update project configuration
   * @param {string} id - Project ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object|null>} Updated project or null
   */
  async updateProject(id, updates) {
    try {
      return await this.getProjectRepository().update(id, updates);
    } catch (error) {
      this.logger.error("Failed to update project:", error);
      return null;
    }
  }

  /**
   * Delete a project
   * @param {string} id - Project ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteProject(id) {
    try {
      const project = await this.getProjectById(id);
      if (!project) return false;

      // Stop the project
      const projectPath = path.join(this.projectsDir, project.name);
      await this.dockerService.stopProject(projectPath);

      // Remove project directory
      await fs.rm(projectPath, { recursive: true, force: true });

      // Remove from MongoDB repository
      await this.getProjectRepository().delete(id);

      this.logger.info(`Project deleted: ${project.name}`);
      return true;
    } catch (error) {
      this.logger.error("Failed to delete project:", error);
      return false;
    }
  }

  /**
   * Restart a project
   * @param {string} id - Project ID
   * @returns {Promise<boolean>} Success status
   */
  async restartProject(id) {
    try {
      const project = await this.getProjectById(id);
      if (!project) return false;

      const projectPath = path.join(this.projectsDir, project.name);
      await this.dockerService.stopProject(projectPath);
      await this.dockerService.startProject(projectPath);

      // Update project status
      await this.getProjectRepository().updateStatus(id, "running");

      return true;
    } catch (error) {
      this.logger.error("Failed to restart project:", error);
      return false;
    }
  }

  /**
   * Get project logs
   * @param {string} id - Project ID
   * @param {number} lines - Number of lines to retrieve
   * @returns {Promise<Array|null>} Log lines or null
   */
  async getProjectLogs(id, lines = 100) {
    try {
      const project = await this.getProjectById(id);
      if (!project) return null;

      const projectPath = path.join(this.projectsDir, project.name);
      return await this.dockerService.getProjectLogs(projectPath, lines);
    } catch (error) {
      this.logger.error("Failed to get project logs:", error);
      return null;
    }
  }

  /**
   * Get project status
   * @param {string} id - Project ID
   * @returns {Promise<Object|null>} Project status or null
   */
  async getProjectStatus(id) {
    try {
      const project = await this.getProjectById(id);
      if (!project) return null;

      const projectPath = path.join(this.projectsDir, project.name);
      const dockerStatus = await this.dockerService.getProjectStatus(
        projectPath
      );

      return {
        project,
        containers: dockerStatus.containers,
        status: project.status,
        uptime: project.lastDeployed
          ? Date.now() - project.lastDeployed.getTime()
          : 0,
      };
    } catch (error) {
      this.logger.error("Failed to get project status:", error);
      return null;
    }
  }

  /**
   * Generate a unique project ID
   * @param {string} name - Project name
   * @returns {string} Generated project ID
   */
  generateProjectId(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, "-") + "-" + Date.now();
  }

  /**
   * Get project statistics
   * @returns {Promise<Object>} Project statistics
   */
  async getProjectStatistics() {
    try {
      const projects = await this.getAllProjects();
      const stats = {
        total: projects.length,
        running: projects.filter((p) => p.status === "running").length,
        stopped: projects.filter((p) => p.status === "stopped").length,
        deploying: projects.filter((p) => p.status === "deploying").length,
        error: projects.filter((p) => p.status === "error").length,
      };
      return stats;
    } catch (error) {
      this.logger.error("Failed to get project statistics:", error);
      return { total: 0, running: 0, stopped: 0, deploying: 0, error: 0 };
    }
  }

  /**
   * Search projects by criteria
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Array>} Matching projects
   */
  async searchProjects(criteria) {
    try {
      const result = await this.getProjectRepository().findAll(1, 1000, criteria);
      return result.projects || [];
    } catch (error) {
      this.logger.error("Failed to search projects:", error);
      return [];
    }
  }

  /**
   * Start a project
   * @param {string} id - Project ID
   * @returns {Promise<boolean>} Success status
   */
  async startProject(id) {
    try {
      const project = await this.getProjectById(id);
      if (!project) return false;

      const projectPath = path.join(this.projectsDir, project.name);
      await this.dockerService.startProject(projectPath);

      // Update project status
      await this.getProjectRepository().updateStatus(id, "running");

      this.logger.info(`Project started: ${project.name}`);
      return true;
    } catch (error) {
      this.logger.error("Failed to start project:", error);
      return false;
    }
  }

  /**
   * Stop a project
   * @param {string} id - Project ID
   * @returns {Promise<boolean>} Success status
   */
  async stopProject(id) {
    try {
      const project = await this.getProjectById(id);
      if (!project) return false;

      const projectPath = path.join(this.projectsDir, project.name);
      await this.dockerService.stopProject(projectPath);

      // Update project status
      await this.getProjectRepository().updateStatus(id, "stopped");

      this.logger.info(`Project stopped: ${project.name}`);
      return true;
    } catch (error) {
      this.logger.error("Failed to stop project:", error);
      return false;
    }
  }

  /**
   * Update project port
   * @param {string} id - Project ID
   * @param {number} newPort - New port number
   * @returns {Promise<Object|null>} Updated project or null
   */
  async updateProjectPort(id, newPort) {
    try {
      // Validate port number
      if (!this.isValidPort(newPort)) {
        throw new Error('Invalid port number. Port must be between 1 and 65535');
      }

      // Get current project
      const project = await this.getProjectById(id);
      if (!project) {
        throw new Error('Project not found');
      }

      // Check if port is already in use by another project
      const portAvailable = await this.getProjectRepository().isPortAvailable(newPort, id);
      if (!portAvailable) {
        throw new Error(`Port ${newPort} is already in use by another project`);
      }

      // If project is running, stop it first
      const wasRunning = project.status === 'running';
      if (wasRunning) {
        this.logger.info(`Stopping project ${project.name} for port change`);
        await this.stopProject(id);
      }

      // Update project port in database
      const updatedProject = await this.getProjectRepository().update(id, { 
        port: newPort,
        updatedAt: new Date()
      });

      if (!updatedProject) {
        throw new Error('Failed to update project port in database');
      }

      // Regenerate Docker Compose file with new port
      const projectPath = path.join(this.projectsDir, project.name);
      const projectWithNewPort = { ...project, port: newPort };
      await this.dockerService.createProjectCompose(projectWithNewPort, projectPath);

      // If project was running, start it again with new port
      if (wasRunning) {
        this.logger.info(`Starting project ${project.name} with new port ${newPort}`);
        await this.startProject(id);
      }

      this.logger.info(`Project port updated: ${project.name} -> ${newPort}`);
      return updatedProject;

    } catch (error) {
      this.logger.error("Failed to update project port:", error);
      throw error;
    }
  }

  /**
   * Validate port number
   * @param {number} port - Port number to validate
   * @returns {boolean} True if valid
   */
  isValidPort(port) {
    const portNum = parseInt(port);
    return !isNaN(portNum) && portNum >= 1 && portNum <= 65535;
  }
}

module.exports = {
  ProjectService,
};
