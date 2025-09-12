const Project = require('../models/Project');
const { logger } = require('../config/logger');

class ProjectRepository {
  /**
   * Create a new project
   */
  async create(projectData) {
    try {
      const project = new Project(projectData);
      await project.save();
      logger.info(`Project created: ${project.name} (${project.domain})`);
      return project;
    } catch (error) {
      logger.error('Error creating project:', error);
      throw error;
    }
  }

  /**
   * Find project by ID
   */
  async findById(id) {
    try {
      return await Project.findById(id).populate('createdBy', 'username email');
    } catch (error) {
      logger.error('Error finding project by ID:', error);
      throw error;
    }
  }

  /**
   * Find project by domain
   */
  async findByDomain(domain) {
    try {
      return await Project.findByDomain(domain);
    } catch (error) {
      logger.error('Error finding project by domain:', error);
      throw error;
    }
  }

  /**
   * Find projects by user
   */
  async findByUser(userId) {
    try {
      return await Project.findByUser(userId);
    } catch (error) {
      logger.error('Error finding projects by user:', error);
      throw error;
    }
  }

  /**
   * Get all projects with pagination
   */
  async findAll(page = 1, limit = 10, filters = {}) {
    try {
      const skip = (page - 1) * limit;
      const query = {};
      
      // Apply filters
      if (filters.status) {
        query.status = filters.status;
      }
      if (filters.search) {
        query.$or = [
          { name: { $regex: filters.search, $options: 'i' } },
          { domain: { $regex: filters.search, $options: 'i' } }
        ];
      }

      const projects = await Project.find(query)
        .populate('createdBy', 'username email')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });
      
      const total = await Project.countDocuments(query);
      
      return {
        projects,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error finding all projects:', error);
      throw error;
    }
  }

  /**
   * Update project
   */
  async update(id, updateData) {
    try {
      const project = await Project.findByIdAndUpdate(
        id,
        { ...updateData, updatedAt: new Date() },
        { new: true, runValidators: true }
      ).populate('createdBy', 'username email');
      
      if (project) {
        logger.info(`Project updated: ${project.name}`);
      }
      return project;
    } catch (error) {
      logger.error('Error updating project:', error);
      throw error;
    }
  }

  /**
   * Update project status
   */
  async updateStatus(id, status) {
    try {
      const project = await Project.findById(id);
      if (!project) return null;
      
      await project.updateStatus(status);
      logger.info(`Project status updated: ${project.name} -> ${status}`);
      return project;
    } catch (error) {
      logger.error('Error updating project status:', error);
      throw error;
    }
  }

  /**
   * Set container info
   */
  async setContainerInfo(id, containerId, projectPath) {
    try {
      const project = await Project.findById(id);
      if (!project) return null;
      
      await project.setContainerInfo(containerId, projectPath);
      logger.info(`Container info set for project: ${project.name}`);
      return project;
    } catch (error) {
      logger.error('Error setting container info:', error);
      throw error;
    }
  }

  /**
   * Delete project
   */
  async delete(id) {
    try {
      const project = await Project.findByIdAndDelete(id);
      if (project) {
        logger.info(`Project deleted: ${project.name}`);
      }
      return project;
    } catch (error) {
      logger.error('Error deleting project:', error);
      throw error;
    }
  }

  /**
   * Get project statistics
   */
  async getStatistics() {
    try {
      const stats = await Project.getStatistics();
      const total = await Project.countDocuments();
      
      // Convert array to object
      const statusCounts = stats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {});
      
      return {
        total,
        byStatus: statusCounts
      };
    } catch (error) {
      logger.error('Error getting project statistics:', error);
      throw error;
    }
  }

  /**
   * Check if domain is available
   */
  async isDomainAvailable(domain, excludeId = null) {
    try {
      const query = { domain: domain.toLowerCase() };
      if (excludeId) {
        query._id = { $ne: excludeId };
      }
      
      const count = await Project.countDocuments(query);
      return count === 0;
    } catch (error) {
      logger.error('Error checking domain availability:', error);
      throw error;
    }
  }

  /**
   * Check if project name is available
   */
  async isNameAvailable(name, excludeId = null) {
    try {
      const query = { name };
      if (excludeId) {
        query._id = { $ne: excludeId };
      }
      
      const count = await Project.countDocuments(query);
      return count === 0;
    } catch (error) {
      logger.error('Error checking name availability:', error);
      throw error;
    }
  }

  /**
   * Get projects by status
   */
  async findByStatus(status) {
    try {
      return await Project.find({ status }).populate('createdBy', 'username email');
    } catch (error) {
      logger.error('Error finding projects by status:', error);
      throw error;
    }
  }

  /**
   * Get recent projects
   */
  async getRecent(limit = 5) {
    try {
      return await Project.find()
        .populate('createdBy', 'username email')
        .sort({ createdAt: -1 })
        .limit(limit);
    } catch (error) {
      logger.error('Error getting recent projects:', error);
      throw error;
    }
  }

  /**
   * Check if port is available
   */
  async isPortAvailable(port, excludeId = null) {
    try {
      const query = { port: parseInt(port) };
      if (excludeId) {
        query._id = { $ne: excludeId };
      }
      
      const count = await Project.countDocuments(query);
      return count === 0;
    } catch (error) {
      logger.error('Error checking port availability:', error);
      throw error;
    }
  }

  /**
   * Get all used ports
   */
  async getUsedPorts() {
    try {
      const projects = await Project.find({}, 'port');
      return projects.map(project => project.port);
    } catch (error) {
      logger.error('Error getting used ports:', error);
      throw error;
    }
  }
}

module.exports = new ProjectRepository();