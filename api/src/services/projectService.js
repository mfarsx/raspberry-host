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
const ProjectRepository = require("./projectRepository");
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
    this.projectRepository = dependencies.projectRepository || null;
    this.cacheService = dependencies.cacheService || getCacheService();

    this.ensureProjectsDirectory();
  }

  /**
   * Initialize project repository if not provided
   * @returns {ProjectRepository} Project repository instance
   */
  getProjectRepository() {
    if (!this.projectRepository) {
      try {
        const { getRedisClient } = require("../config/redis");
        const redisClient = getRedisClient();
        this.projectRepository = new ProjectRepository(redisClient);
      } catch (error) {
        this.logger.warn(
          "Redis not available, using in-memory project storage"
        );
        this.projectRepository = new InMemoryProjectRepository();
      }
    }
    return this.projectRepository;
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

      // Get from repository
      const projects = await this.getProjectRepository().getAllProjects();

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
      return await this.getProjectRepository().getProjectById(id);
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
    const id = this.generateProjectId(projectData.name);
    const project = {
      ...projectData,
      id,
      status: "deploying",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastDeployed: new Date(),
    };

    try {
      // Validate repository before starting deployment
      const isValidRepo = await this.gitService.validateRepository(
        project.repository
      );
      if (!isValidRepo) {
        throw new Error(
          `Invalid or inaccessible repository: ${project.repository}`
        );
      }

      // Store project in repository
      await this.getProjectRepository().saveProject(id, project);

      // Clone repository
      const projectPath = path.join(this.projectsDir, project.name);
      await this.gitService.cloneRepository(
        project.repository,
        project.branch,
        projectPath
      );

      // Build project if build command exists
      if (project.buildCommand) {
        await this.dockerService.buildProject(
          projectPath,
          project.buildCommand
        );
      }

      // Create Docker Compose file for the project
      await this.dockerService.createProjectCompose(project, projectPath);

      // Start the project
      await this.dockerService.startProject(projectPath);

      // Update project status
      project.status = "running";
      project.updatedAt = new Date();
      await this.getProjectRepository().saveProject(id, project);

      // Invalidate cache
      await this.cacheService.delete("projects:all");
      await this.cacheService.delete(`project:${id}`);

      this.logger.info(`Project deployed successfully: ${project.name}`);
      return project;
    } catch (error) {
      this.logger.error("Failed to deploy project:", error);
      project.status = "error";
      project.updatedAt = new Date();
      project.error = error.message;
      await this.getProjectRepository().saveProject(id, project);
      throw error;
    }
  }

  /**
   * Update project configuration
   * @param {string} id - Project ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object|null>} Updated project or null
   */
  async updateProject(id, updates) {
    try {
      return await this.getProjectRepository().updateProject(id, updates);
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

      // Remove from repository
      await this.getProjectRepository().deleteProject(id);

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
      await this.getProjectRepository().updateProject(id, {
        status: "running",
        lastDeployed: new Date(),
      });

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
      return await this.getProjectRepository().searchProjects(criteria);
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
      await this.getProjectRepository().updateProject(id, {
        status: "running",
        updatedAt: new Date(),
      });

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
      await this.getProjectRepository().updateProject(id, {
        status: "stopped",
        updatedAt: new Date(),
      });

      this.logger.info(`Project stopped: ${project.name}`);
      return true;
    } catch (error) {
      this.logger.error("Failed to stop project:", error);
      return false;
    }
  }
}

module.exports = {
  ProjectService,
};
