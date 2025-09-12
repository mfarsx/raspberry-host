const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const { logger } = require('../config/logger');
const fs = require('fs').promises;
const path = require('path');
const BaseService = require('../utils/baseService');
const { ErrorFactory, CommandExecutionError, ValidationError } = require('../utils/serviceErrors');

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
 * Enhanced with BaseService patterns for better error handling and metrics
 */
class DockerService extends BaseService {
  constructor(dependencies = {}) {
    super('DockerService', dependencies);
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
      
      this.logger.info(`Starting build for project: ${sanitizedPath}`);
      
      // Use spawn instead of exec for better security
      const { spawn } = require('child_process');
      
      return new Promise((resolve, reject) => {
        const child = spawn('sh', ['-c', `cd "${sanitizedPath}" && ${sanitizedCommand}`], {
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 300000 // 5 minutes timeout
        });
        
        let stdout = '';
        let stderr = '';
        let isResolved = false;
        
        child.stdout.on('data', (data) => {
          stdout += data.toString();
          // Log build progress in debug mode
          this.logger.debug(`Build output: ${data.toString().trim()}`);
        });
        
        child.stderr.on('data', (data) => {
          stderr += data.toString();
          // Log build warnings/errors
          this.logger.warn(`Build warning: ${data.toString().trim()}`);
        });
        
        child.on('close', (code) => {
          if (isResolved) return;
          isResolved = true;
          
          if (code === 0) {
            this.logger.info(`Project built successfully: ${sanitizedPath}`);
            resolve();
          } else {
            const error = new Error(`Build failed with exit code ${code}`);
            error.exitCode = code;
            error.stdout = stdout;
            error.stderr = stderr;
            error.projectPath = sanitizedPath;
            error.buildCommand = sanitizedCommand;
            
            this.logger.error('Build failed:', {
              projectPath: sanitizedPath,
              exitCode: code,
              stderr: stderr.trim(),
              stdout: stdout.trim()
            });
            
            reject(error);
          }
        });
        
        child.on('error', (error) => {
          if (isResolved) return;
          isResolved = true;
          
          this.logger.error('Build process error:', {
            projectPath: sanitizedPath,
            error: error.message,
            code: error.code
          });
          
          reject(new Error(`Build process failed: ${error.message}`));
        });
        
        // Handle timeout
        child.on('timeout', () => {
          if (isResolved) return;
          isResolved = true;
          
          child.kill('SIGTERM');
          this.logger.error('Build timeout:', {
            projectPath: sanitizedPath,
            timeout: '5 minutes'
          });
          
          reject(new Error('Build timeout after 5 minutes'));
        });
      });
    } catch (error) {
      this.logger.error('Build setup failed:', {
        projectPath,
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Build setup failed: ${error.message}`);
    }
  }

  /**
   * Create Docker Compose file for a project
   * @param {Object} project - Project configuration
   * @param {string} projectPath - Path to the project
   * @returns {Promise<void>}
   */
  async createProjectCompose(project, projectPath) {
    return this.executeOperation('createProjectCompose', async () => {
      // Validate inputs
      this.validateRequiredParams({ project, projectPath }, ['project', 'projectPath']);
      this.validateParamTypes({ project, projectPath }, { project: 'object', projectPath: 'string' });
      
      try {
        const sanitizedPath = validateFilePath(projectPath, process.cwd());
        const composePath = path.join(sanitizedPath, 'compose.yaml');
        const composeContent = this.generateComposeContent(project);
        
        await fs.writeFile(composePath, composeContent);
        return { composePath, success: true };
      } catch (error) {
        if (error.code === 'ENOENT') {
          throw ErrorFactory.notFound('Project directory', projectPath);
        }
        if (error.code === 'EACCES') {
          throw ErrorFactory.validation('Permission denied writing compose file', 'projectPath', projectPath);
        }
        throw ErrorFactory.fromError(error, { operation: 'createProjectCompose', projectPath });
      }
    }, { projectId: project.id, projectPath });
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
      
      this.logger.info(`Starting Docker project: ${sanitizedPath}`);
      
      // Verify compose file exists
      try {
        await fs.access(composeFile);
      } catch (error) {
        this.logger.error('Compose file not found:', {
          projectPath: sanitizedPath,
          composeFile,
          error: error.message
        });
        throw new Error(`Docker Compose file not found: ${composeFile}`);
      }
      
      // Check if Docker is available
      const dockerAvailable = await this.isDockerAvailable();
      if (!dockerAvailable) {
        this.logger.error('Docker not available');
        throw new Error('Docker is not available or not running');
      }
      
      const { spawn } = require('child_process');
      
      return new Promise((resolve, reject) => {
        const child = spawn('docker-compose', ['up', '-d'], {
          cwd: sanitizedPath,
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 300000 // 5 minutes timeout
        });
        
        let stdout = '';
        let stderr = '';
        let isResolved = false;
        
        child.stdout.on('data', (data) => {
          stdout += data.toString();
          this.logger.debug(`Docker start output: ${data.toString().trim()}`);
        });
        
        child.stderr.on('data', (data) => {
          stderr += data.toString();
          this.logger.warn(`Docker start warning: ${data.toString().trim()}`);
        });
        
        child.on('close', (code) => {
          if (isResolved) return;
          isResolved = true;
          
          if (code === 0) {
            this.logger.info(`Project started successfully: ${sanitizedPath}`);
            resolve();
          } else {
            const error = new Error(`Failed to start project with exit code ${code}`);
            error.exitCode = code;
            error.stdout = stdout;
            error.stderr = stderr;
            error.projectPath = sanitizedPath;
            
            this.logger.error('Failed to start project:', {
              projectPath: sanitizedPath,
              exitCode: code,
              stderr: stderr.trim(),
              stdout: stdout.trim()
            });
            
            reject(error);
          }
        });
        
        child.on('error', (error) => {
          if (isResolved) return;
          isResolved = true;
          
          this.logger.error('Docker start process error:', {
            projectPath: sanitizedPath,
            error: error.message,
            code: error.code
          });
          
          reject(new Error(`Docker start process failed: ${error.message}`));
        });
        
        // Handle timeout
        child.on('timeout', () => {
          if (isResolved) return;
          isResolved = true;
          
          child.kill('SIGTERM');
          this.logger.error('Docker start timeout:', {
            projectPath: sanitizedPath,
            timeout: '5 minutes'
          });
          
          reject(new Error('Docker start timeout after 5 minutes'));
        });
      });
    } catch (error) {
      this.logger.error('Start project setup failed:', {
        projectPath,
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Start project setup failed: ${error.message}`);
    }
  }

  /**
   * Stop a Docker Compose project
   * @param {string} projectPath - Path to the project
   * @returns {Promise<void>}
   */
  async stopProject(projectPath) {
    return this.executeOperation('stopProject', async () => {
      // Validate inputs
      this.validateRequiredParams({ projectPath }, ['projectPath']);
      this.validateParamTypes({ projectPath }, { projectPath: 'string' });
      
      const sanitizedPath = validateFilePath(projectPath, process.cwd());
      
      const { spawn } = require('child_process');
      
      return new Promise((resolve, reject) => {
        const child = spawn('docker-compose', ['down'], {
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
    });
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
        const child = spawn('docker-compose', ['-f', composeFile, 'logs', '--tail', sanitizedLines.toString()], {
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
        const child = spawn('docker-compose', ['-f', composeFile, 'ps', '--format', 'json'], {
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

    // Only include environment section if there are variables
    const environmentSection = environmentVars ? `    environment:
${environmentVars}` : '';

    return `services:
  ${project.name}:
    build:
      context: .
      dockerfile: Dockerfile
      platforms:
        - linux/arm64
    container_name: ${project.name}
    restart: unless-stopped
    ports:
      - "${project.port}:80"
${environmentSection}
    volumes:
      - ${project.name}_logs:/app/logs
    networks:
      - pi-network

networks:
  pi-network:
    external: true
    name: raspberry-host_pi-network

volumes:
  ${project.name}_logs:
    driver: local
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
        const child = spawn('docker-compose', ['version'], {
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

  /**
   * Get all Docker containers
   * @returns {Promise<Array>} List of containers
   */
  async getAllContainers() {
    try {
      return new Promise((resolve, reject) => {
        const child = spawn('docker', ['ps', '-a', '--format', 'json'], {
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
              resolve(containers);
            } catch (parseError) {
              this.logger.error('Failed to parse containers:', parseError);
              reject(new Error(`Failed to parse containers: ${parseError.message}`));
            }
          } else {
            const error = new Error(`Failed to get containers with exit code ${code}: ${stderr}`);
            this.logger.error('Failed to get containers:', error);
            reject(error);
          }
        });
        
        child.on('error', (error) => {
          this.logger.error('Failed to get containers:', error);
          reject(new Error(`Failed to get containers: ${error.message}`));
        });
      });
    } catch (error) {
      this.logger.error('Failed to get containers:', error);
      throw new Error(`Failed to get containers: ${error.message}`);
    }
  }

  /**
   * Get all Docker images
   * @returns {Promise<Array>} List of images
   */
  async getAllImages() {
    try {
      return new Promise((resolve, reject) => {
        const child = spawn('docker', ['images', '--format', 'json'], {
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
              const images = stdout.split('\n')
                .filter(line => line.trim())
                .map(line => JSON.parse(line));
              resolve(images);
            } catch (parseError) {
              this.logger.error('Failed to parse images:', parseError);
              reject(new Error(`Failed to parse images: ${parseError.message}`));
            }
          } else {
            const error = new Error(`Failed to get images with exit code ${code}: ${stderr}`);
            this.logger.error('Failed to get images:', error);
            reject(error);
          }
        });
        
        child.on('error', (error) => {
          this.logger.error('Failed to get images:', error);
          reject(new Error(`Failed to get images: ${error.message}`));
        });
      });
    } catch (error) {
      this.logger.error('Failed to get images:', error);
      throw new Error(`Failed to get images: ${error.message}`);
    }
  }

  /**
   * Get all Docker networks
   * @returns {Promise<Array>} List of networks
   */
  async getAllNetworks() {
    try {
      return new Promise((resolve, reject) => {
        const child = spawn('docker', ['network', 'ls', '--format', 'json'], {
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
              const networks = stdout.split('\n')
                .filter(line => line.trim())
                .map(line => JSON.parse(line));
              resolve(networks);
            } catch (parseError) {
              this.logger.error('Failed to parse networks:', parseError);
              reject(new Error(`Failed to parse networks: ${parseError.message}`));
            }
          } else {
            const error = new Error(`Failed to get networks with exit code ${code}: ${stderr}`);
            this.logger.error('Failed to get networks:', error);
            reject(error);
          }
        });
        
        child.on('error', (error) => {
          this.logger.error('Failed to get networks:', error);
          reject(new Error(`Failed to get networks: ${error.message}`));
        });
      });
    } catch (error) {
      this.logger.error('Failed to get networks:', error);
      throw new Error(`Failed to get networks: ${error.message}`);
    }
  }

  /**
   * Get all Docker volumes
   * @returns {Promise<Array>} List of volumes
   */
  async getAllVolumes() {
    try {
      return new Promise((resolve, reject) => {
        const child = spawn('docker', ['volume', 'ls', '--format', 'json'], {
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
              const volumes = stdout.split('\n')
                .filter(line => line.trim())
                .map(line => JSON.parse(line));
              resolve(volumes);
            } catch (parseError) {
              this.logger.error('Failed to parse volumes:', parseError);
              reject(new Error(`Failed to parse volumes: ${parseError.message}`));
            }
          } else {
            const error = new Error(`Failed to get volumes with exit code ${code}: ${stderr}`);
            this.logger.error('Failed to get volumes:', error);
            reject(error);
          }
        });
        
        child.on('error', (error) => {
          this.logger.error('Failed to get volumes:', error);
          reject(new Error(`Failed to get volumes: ${error.message}`));
        });
      });
    } catch (error) {
      this.logger.error('Failed to get volumes:', error);
      throw new Error(`Failed to get volumes: ${error.message}`);
    }
  }

  /**
   * Get Docker system information
   * @returns {Promise<Object>} System information
   */
  async getSystemInfo() {
    try {
      return new Promise((resolve, reject) => {
        const child = spawn('docker', ['system', 'info', '--format', 'json'], {
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
              const info = JSON.parse(stdout);
              resolve(info);
            } catch (parseError) {
              this.logger.error('Failed to parse system info:', parseError);
              reject(new Error(`Failed to parse system info: ${parseError.message}`));
            }
          } else {
            const error = new Error(`Failed to get system info with exit code ${code}: ${stderr}`);
            this.logger.error('Failed to get system info:', error);
            reject(error);
          }
        });
        
        child.on('error', (error) => {
          this.logger.error('Failed to get system info:', error);
          reject(new Error(`Failed to get system info: ${error.message}`));
        });
      });
    } catch (error) {
      this.logger.error('Failed to get system info:', error);
      throw new Error(`Failed to get system info: ${error.message}`);
    }
  }

  /**
   * Remove Docker image
   * @param {string} imageId - Image ID or name
   * @returns {Promise<void>}
   */
  async removeImage(imageId) {
    try {
      const sanitizedId = sanitizeCommandInput(imageId);
      
      return new Promise((resolve, reject) => {
        const child = spawn('docker', ['rmi', sanitizedId], {
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
            this.logger.info(`Docker image removed: ${sanitizedId}`);
            resolve();
          } else {
            const error = new Error(`Failed to remove image with exit code ${code}: ${stderr}`);
            this.logger.error('Failed to remove image:', error);
            reject(error);
          }
        });
        
        child.on('error', (error) => {
          this.logger.error('Failed to remove image:', error);
          reject(new Error(`Failed to remove image: ${error.message}`));
        });
      });
    } catch (error) {
      this.logger.error('Failed to remove image:', error);
      throw new Error(`Failed to remove image: ${error.message}`);
    }
  }

  /**
   * Get project logs stream for real-time streaming
   * @param {string} projectPath - Path to the project
   * @param {Object} options - Stream options
   * @returns {Promise<Object>} Stream object with data events
   */
  async getProjectLogsStream(projectPath, options = {}) {
    try {
      const sanitizedPath = validateFilePath(projectPath, process.cwd());
      const composeFile = path.join(sanitizedPath, 'compose.yaml');
      
      // Default options
      const streamOptions = {
        follow: true,
        tail: options.tail || 100,
        timestamps: true,
        ...options
      };

      // Build docker-compose logs command
      const args = ['-f', composeFile, 'logs'];
      
      if (streamOptions.follow) {
        args.push('--follow');
      }
      
      if (streamOptions.tail) {
        args.push('--tail', streamOptions.tail.toString());
      }
      
      if (streamOptions.timestamps) {
        args.push('--timestamps');
      }

      return new Promise((resolve, reject) => {
        const child = spawn('docker-compose', args, {
          cwd: sanitizedPath,
          stdio: ['pipe', 'pipe', 'pipe']
        });

        const stream = {
          on: (event, callback) => {
            if (event === 'data') {
              child.stdout.on('data', callback);
            } else if (event === 'error') {
              child.on('error', callback);
            } else if (event === 'end') {
              child.on('close', (code) => {
                if (code === 0) {
                  callback();
                } else {
                  callback(new Error(`Log stream ended with code ${code}`));
                }
              });
            }
          },
          close: () => {
            child.kill('SIGTERM');
          }
        };

        child.on('error', (error) => {
          this.logger.error('Log stream error:', error);
          reject(error);
        });

        resolve(stream);
      });
    } catch (error) {
      this.logger.error('Failed to create log stream:', error);
      throw new Error(`Failed to create log stream: ${error.message}`);
    }
  }

  /**
   * Parse Docker log entry
   * @param {string} logLine - Raw log line
   * @returns {Object} Parsed log entry
   */
  parseLogEntry(logLine) {
    // Docker Compose log format: [timestamp] [container] [stream] message
    const match = logLine.match(/^\[([^\]]+)\] \[([^\]]+)\] \[([^\]]+)\] (.+)$/);
    
    if (match) {
      return {
        timestamp: match[1],
        container: match[2],
        stream: match[3], // stdout/stderr
        message: match[4],
        raw: logLine
      };
    }
    
    // Fallback for non-standard format
    return {
      timestamp: new Date().toISOString(),
      container: 'unknown',
      stream: 'unknown',
      message: logLine,
      raw: logLine
    };
  }

  /**
   * Create Docker exec session for console access
   * @param {string} containerName - Container name
   * @param {Object} options - Exec options
   * @returns {Promise<string>} Exec session ID
   */
  async createExecSession(containerName, options = {}) {
    try {
      const sanitizedContainer = sanitizeCommandInput(containerName);
      
      const execOptions = {
        Cmd: options.cmd || ['/bin/sh'],
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: true,
        ...options
      };

      return new Promise((resolve, reject) => {
        const child = spawn('docker', ['exec', '-it', sanitizedContainer, ...execOptions.Cmd], {
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 30000
        });

        const execSession = {
          id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          containerName: sanitizedContainer,
          child: child,
          createdAt: new Date(),
          options: execOptions
        };

        child.on('error', (error) => {
          this.logger.error('Docker exec session error:', error);
          reject(error);
        });

        child.on('spawn', () => {
          this.logger.info(`Docker exec session created: ${execSession.id}`);
          resolve(execSession);
        });
      });
    } catch (error) {
      this.logger.error('Failed to create exec session:', error);
      throw new Error(`Failed to create exec session: ${error.message}`);
    }
  }

  /**
   * Send input to Docker exec session
   * @param {Object} execSession - Exec session object
   * @param {string} input - Input data
   * @returns {Promise<void>}
   */
  async sendToExecSession(execSession, input) {
    try {
      if (execSession.child && execSession.child.stdin) {
        execSession.child.stdin.write(input);
      }
    } catch (error) {
      this.logger.error('Failed to send input to exec session:', error);
      throw new Error(`Failed to send input: ${error.message}`);
    }
  }

  /**
   * Resize Docker exec session terminal
   * @param {Object} execSession - Exec session object
   * @param {number} cols - Terminal columns
   * @param {number} rows - Terminal rows
   * @returns {Promise<void>}
   */
  async resizeExecSession(execSession, cols, rows) {
    try {
      if (execSession.child && execSession.child.stdout) {
        // Send resize signal (this is a simplified approach)
        // In a real implementation, you might need to use docker exec with resize
        this.logger.debug(`Resizing exec session ${execSession.id} to ${cols}x${rows}`);
      }
    } catch (error) {
      this.logger.error('Failed to resize exec session:', error);
      throw new Error(`Failed to resize session: ${error.message}`);
    }
  }

  /**
   * Get exec session stream for real-time communication
   * @param {Object} execSession - Exec session object
   * @returns {Object} Stream object with data events
   */
  getExecSessionStream(execSession) {
    try {
      const stream = {
        on: (event, callback) => {
          if (event === 'data') {
            execSession.child.stdout.on('data', callback);
          } else if (event === 'error') {
            execSession.child.stderr.on('data', callback);
          } else if (event === 'end') {
            execSession.child.on('close', (code) => {
              callback(code === 0 ? null : new Error(`Exec session ended with code ${code}`));
            });
          }
        },
        close: () => {
          if (execSession.child) {
            execSession.child.kill('SIGTERM');
          }
        },
        write: (data) => {
          if (execSession.child && execSession.child.stdin) {
            execSession.child.stdin.write(data);
          }
        }
      };

      return stream;
    } catch (error) {
      this.logger.error('Failed to get exec session stream:', error);
      throw new Error(`Failed to get stream: ${error.message}`);
    }
  }

  /**
   * Close Docker exec session
   * @param {Object} execSession - Exec session object
   * @returns {Promise<void>}
   */
  async closeExecSession(execSession) {
    try {
      if (execSession.child) {
        execSession.child.kill('SIGTERM');
        this.logger.info(`Docker exec session closed: ${execSession.id}`);
      }
    } catch (error) {
      this.logger.error('Failed to close exec session:', error);
      throw new Error(`Failed to close session: ${error.message}`);
    }
  }
}

module.exports = DockerService;
