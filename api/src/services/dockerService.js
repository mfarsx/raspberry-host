const { exec } = require('child_process');
const { promisify } = require('util');
const { logger } = require('../config/logger');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

/**
 * Docker Service - Handles all Docker-related operations
 */
class DockerService {
  constructor() {
    this.logger = logger;
  }

  /**
   * Build a Docker project
   * @param {string} projectPath - Path to the project
   * @param {string} buildCommand - Build command to execute
   * @returns {Promise<void>}
   */
  async buildProject(projectPath, buildCommand) {
    try {
      await execAsync(`cd ${projectPath} && ${buildCommand}`);
      this.logger.info(`Project built successfully: ${projectPath}`);
    } catch (error) {
      this.logger.error('Failed to build project:', error);
      throw new Error(`Build failed: ${error.message}`);
    }
  }

  /**
   * Create Docker Compose file for a project
   * @param {Object} project - Project configuration
   * @param {string} projectPath - Path to the project
   * @returns {Promise<void>}
   */
  async createProjectCompose(project, projectPath) {
    try {
      const composePath = path.join(projectPath, 'compose.yaml');
      const composeContent = this.generateComposeContent(project);
      await fs.writeFile(composePath, composeContent);
      this.logger.info(`Docker Compose file created: ${composePath}`);
    } catch (error) {
      this.logger.error('Failed to create Docker Compose file:', error);
      throw new Error(`Failed to create Docker Compose file: ${error.message}`);
    }
  }

  /**
   * Start a Docker Compose project
   * @param {string} projectPath - Path to the project
   * @returns {Promise<void>}
   */
  async startProject(projectPath) {
    try {
      await execAsync(`cd ${projectPath} && docker compose up -d`);
      this.logger.info(`Project started: ${projectPath}`);
    } catch (error) {
      this.logger.error('Failed to start project:', error);
      throw new Error(`Failed to start project: ${error.message}`);
    }
  }

  /**
   * Stop a Docker Compose project
   * @param {string} projectPath - Path to the project
   * @returns {Promise<void>}
   */
  async stopProject(projectPath) {
    try {
      await execAsync(`cd ${projectPath} && docker compose down`);
      this.logger.info(`Project stopped: ${projectPath}`);
    } catch (error) {
      this.logger.error('Failed to stop project:', error);
      throw new Error(`Failed to stop project: ${error.message}`);
    }
  }

  /**
   * Get project logs
   * @param {string} projectPath - Path to the project
   * @param {number} lines - Number of lines to retrieve
   * @returns {Promise<Array>} Log lines
   */
  async getProjectLogs(projectPath, lines = 100) {
    try {
      const { stdout } = await execAsync(
        `docker compose -f ${path.join(projectPath, 'compose.yaml')} logs --tail=${lines}`
      );
      return stdout.split('\n').filter(line => line.trim());
    } catch (error) {
      this.logger.error('Failed to get project logs:', error);
      throw new Error(`Failed to get project logs: ${error.message}`);
    }
  }

  /**
   * Get project status
   * @param {string} projectPath - Path to the project
   * @returns {Promise<Object>} Project status
   */
  async getProjectStatus(projectPath) {
    try {
      const { stdout } = await execAsync(
        `docker compose -f ${path.join(projectPath, 'compose.yaml')} ps --format json`
      );

      const containers = stdout.split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));

      return {
        containers,
        status: containers.length > 0 ? 'running' : 'stopped'
      };
    } catch (error) {
      this.logger.error('Failed to get project status:', error);
      throw new Error(`Failed to get project status: ${error.message}`);
    }
  }

  /**
   * Generate Docker Compose content for a project
   * @param {Object} project - Project configuration
   * @returns {string} Docker Compose content
   */
  generateComposeContent(project) {
    const environmentVars = Object.entries(project.environment || {})
      .map(([key, value]) => `      - ${key}=${value}`)
      .join('\n');

    return `version: '3.8'

services:
  ${project.name}:
    build:
      context: .
      dockerfile: Dockerfile
      platforms:
        - linux/arm64
    container_name: ${project.name}
    restart: unless-stopped
    ports:
      - "${project.port}:${project.port}"
    environment:
${environmentVars}
    volumes:
      - ./logs:/app/logs
    networks:
      - pi-network

networks:
  pi-network:
    external: true
`;
  }

  /**
   * Check if Docker is available
   * @returns {Promise<boolean>}
   */
  async isDockerAvailable() {
    try {
      await execAsync('docker --version');
      return true;
    } catch (error) {
      this.logger.error('Docker is not available:', error);
      return false;
    }
  }

  /**
   * Check if Docker Compose is available
   * @returns {Promise<boolean>}
   */
  async isDockerComposeAvailable() {
    try {
      await execAsync('docker compose version');
      return true;
    } catch (error) {
      this.logger.error('Docker Compose is not available:', error);
      return false;
    }
  }
}

module.exports = DockerService;
