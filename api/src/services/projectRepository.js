const { logger } = require('../config/logger');

/**
 * Project Repository - Handles project data persistence
 */
class ProjectRepository {
  constructor(redisClient) {
    this.redis = redisClient;
    this.logger = logger;
    this.PROJECTS_KEY = 'projects';
  }

  /**
   * Get all projects
   * @returns {Promise<Array>} Array of projects
   */
  async getAllProjects() {
    try {
      const projects = await this.redis.hGetAll(this.PROJECTS_KEY);
      return Object.values(projects).map(project => JSON.parse(project));
    } catch (error) {
      this.logger.error('Failed to get all projects:', error);
      throw new Error(`Failed to get all projects: ${error.message}`);
    }
  }

  /**
   * Get project by ID
   * @param {string} id - Project ID
   * @returns {Promise<Object|null>} Project data or null
   */
  async getProjectById(id) {
    try {
      const projectData = await this.redis.hGet(this.PROJECTS_KEY, id);
      return projectData ? JSON.parse(projectData) : null;
    } catch (error) {
      this.logger.error('Failed to get project by ID:', error);
      throw new Error(`Failed to get project by ID: ${error.message}`);
    }
  }

  /**
   * Save project data
   * @param {string} id - Project ID
   * @param {Object} project - Project data
   * @returns {Promise<void>}
   */
  async saveProject(id, project) {
    try {
      await this.redis.hSet(this.PROJECTS_KEY, id, JSON.stringify(project));
      this.logger.info(`Project saved: ${id}`);
    } catch (error) {
      this.logger.error('Failed to save project:', error);
      throw new Error(`Failed to save project: ${error.message}`);
    }
  }

  /**
   * Update project data
   * @param {string} id - Project ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object|null>} Updated project or null
   */
  async updateProject(id, updates) {
    try {
      const existingProject = await this.getProjectById(id);
      if (!existingProject) {
        return null;
      }

      const updatedProject = {
        ...existingProject,
        ...updates,
        updatedAt: new Date()
      };

      await this.saveProject(id, updatedProject);
      return updatedProject;
    } catch (error) {
      this.logger.error('Failed to update project:', error);
      throw new Error(`Failed to update project: ${error.message}`);
    }
  }

  /**
   * Delete project
   * @param {string} id - Project ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteProject(id) {
    try {
      const result = await this.redis.hDel(this.PROJECTS_KEY, id);
      this.logger.info(`Project deleted: ${id}`);
      return result > 0;
    } catch (error) {
      this.logger.error('Failed to delete project:', error);
      throw new Error(`Failed to delete project: ${error.message}`);
    }
  }

  /**
   * Check if project exists
   * @param {string} id - Project ID
   * @returns {Promise<boolean>} Existence status
   */
  async projectExists(id) {
    try {
      return await this.redis.hExists(this.PROJECTS_KEY, id);
    } catch (error) {
      this.logger.error('Failed to check project existence:', error);
      throw new Error(`Failed to check project existence: ${error.message}`);
    }
  }

  /**
   * Get project count
   * @returns {Promise<number>} Number of projects
   */
  async getProjectCount() {
    try {
      return await this.redis.hLen(this.PROJECTS_KEY);
    } catch (error) {
      this.logger.error('Failed to get project count:', error);
      throw new Error(`Failed to get project count: ${error.message}`);
    }
  }

  /**
   * Search projects by criteria
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Array>} Matching projects
   */
  async searchProjects(criteria) {
    try {
      const allProjects = await this.getAllProjects();
      
      return allProjects.filter(project => {
        return Object.entries(criteria).every(([key, value]) => {
          if (typeof value === 'string') {
            return project[key] && project[key].toLowerCase().includes(value.toLowerCase());
          }
          return project[key] === value;
        });
      });
    } catch (error) {
      this.logger.error('Failed to search projects:', error);
      throw new Error(`Failed to search projects: ${error.message}`);
    }
  }
}

module.exports = ProjectRepository;
