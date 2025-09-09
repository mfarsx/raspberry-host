const { exec } = require('child_process');
const { promisify } = require('util');
const { logger } = require('../config/logger');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

/**
 * Sanitize command input to prevent injection attacks
 * @param {string} input - Input string to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeCommandInput(input) {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }
  
  // Remove potentially dangerous characters
  return input
    .replace(/[;&|`$(){}[\]\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Validate file path to prevent directory traversal
 * @param {string} filePath - Path to validate
 * @param {string} basePath - Base path to restrict to
 * @returns {string} Validated path
 */
function validateFilePath(filePath, basePath) {
  const resolvedPath = path.resolve(basePath, filePath);
  const resolvedBase = path.resolve(basePath);
  
  if (!resolvedPath.startsWith(resolvedBase)) {
    throw new Error('Path traversal detected');
  }
  
  return resolvedPath;
}

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
      // Validate and sanitize inputs
      const sanitizedPath = validateFilePath(projectPath, process.cwd());
      const sanitizedCommand = sanitizeCommandInput(buildCommand);
      
      // Use spawn instead of exec for better security
      const { spawn } = require('child_process');
      
      return new Promise((resolve, reject) => {
        const child = spawn('sh', ['-c', `cd "${sanitizedPath}" && ${sanitizedCommand}`], {
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 300000 // 5 minutes timeout
        });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        child.on('close', (code) => {
          if (code === 0) {
            this.logger.info(`Project built successfully: ${sanitizedPath}`);
            resolve();
          } else {
            const error = new Error(`Build failed with exit code ${code}: ${stderr}`);
            this.logger.error('Failed to build project:', error);
            reject(error);
          }
        });
        
        child.on('error', (error) => {
          this.logger.error('Failed to build project:', error);
          reject(new Error(`Build failed: ${error.message}`));
        });
      });
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
      const sanitizedPath = validateFilePath(projectPath, process.cwd());
      const composeFile = path.join(sanitizedPath, 'compose.yaml');
      
      // Verify compose file exists
      await fs.access(composeFile);
      
      const { spawn } = require('child_process');
      
      return new Promise((resolve, reject) => {
        const child = spawn('docker', ['compose', 'up', '-d'], {
          cwd: sanitizedPath,
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 300000 // 5 minutes timeout
        });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        child.on('close', (code) => {
          if (code === 0) {
            this.logger.info(`Project started: ${sanitizedPath}`);
            resolve();
          } else {
            const error = new Error(`Failed to start project with exit code ${code}: ${stderr}`);
            this.logger.error('Failed to start project:', error);
            reject(error);
          }
        });
        
        child.on('error', (error) => {
          this.logger.error('Failed to start project:', error);
          reject(new Error(`Failed to start project: ${error.message}`));
        });
      });
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
      const sanitizedPath = validateFilePath(projectPath, process.cwd());
      
      const { spawn } = require('child_process');
      
      return new Promise((resolve, reject) => {
        const child = spawn('docker', ['compose', 'down'], {
          cwd: sanitizedPath,
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 120000 // 2 minutes timeout
        });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        child.on('close', (code) => {
          if (code === 0) {
            this.logger.info(`Project stopped: ${sanitizedPath}`);
            resolve();
          } else {
            const error = new Error(`Failed to stop project with exit code ${code}: ${stderr}`);
            this.logger.error('Failed to stop project:', error);
            reject(error);
          }
        });
        
        child.on('error', (error) => {
          this.logger.error('Failed to stop project:', error);
          reject(new Error(`Failed to stop project: ${error.message}`));
        });
      });
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
      const sanitizedPath = validateFilePath(projectPath, process.cwd());
      const composeFile = path.join(sanitizedPath, 'compose.yaml');
      
      // Validate lines parameter
      const sanitizedLines = Math.max(1, Math.min(10000, parseInt(lines) || 100));
      
      return new Promise((resolve, reject) => {
        const child = spawn('docker', ['compose', '-f', composeFile, 'logs', '--tail', sanitizedLines.toString()], {
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 60000 // 1 minute timeout
        });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        child.on('close', (code) => {
          if (code === 0) {
            resolve(stdout.split('\n').filter(line => line.trim()));
          } else {
            const error = new Error(`Failed to get project logs with exit code ${code}: ${stderr}`);
            this.logger.error('Failed to get project logs:', error);
            reject(error);
          }
        });
        
        child.on('error', (error) => {
          this.logger.error('Failed to get project logs:', error);
          reject(new Error(`Failed to get project logs: ${error.message}`));
        });
      });
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
      const sanitizedPath = validateFilePath(projectPath, process.cwd());
      const composeFile = path.join(sanitizedPath, 'compose.yaml');
      
      return new Promise((resolve, reject) => {
        const child = spawn('docker', ['compose', '-f', composeFile, 'ps', '--format', 'json'], {
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 30000 // 30 seconds timeout
        });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        child.on('close', (code) => {
          if (code === 0) {
            try {
              const containers = stdout.split('\n')
                .filter(line => line.trim())
                .map(line => JSON.parse(line));

              resolve({
                containers,
                status: containers.length > 0 ? 'running' : 'stopped'
              });
            } catch (parseError) {
              this.logger.error('Failed to parse project status:', parseError);
              reject(new Error(`Failed to parse project status: ${parseError.message}`));
            }
          } else {
            const error = new Error(`Failed to get project status with exit code ${code}: ${stderr}`);
            this.logger.error('Failed to get project status:', error);
            reject(error);
          }
        });
        
        child.on('error', (error) => {
          this.logger.error('Failed to get project status:', error);
          reject(new Error(`Failed to get project status: ${error.message}`));
        });
      });
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
      return new Promise((resolve) => {
        const child = spawn('docker', ['--version'], {
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 5000 // 5 seconds timeout
        });
        
        child.on('close', (code) => {
          resolve(code === 0);
        });
        
        child.on('error', () => {
          resolve(false);
        });
      });
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
      return new Promise((resolve) => {
        const child = spawn('docker', ['compose', 'version'], {
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 5000 // 5 seconds timeout
        });
        
        child.on('close', (code) => {
          resolve(code === 0);
        });
        
        child.on('error', () => {
          resolve(false);
        });
      });
    } catch (error) {
      this.logger.error('Docker Compose is not available:', error);
      return false;
    }
  }
}

module.exports = DockerService;
