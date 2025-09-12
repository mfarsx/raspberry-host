const { logger } = require('../config/logger');
const DockerService = require('./dockerService');
const projectRepository = require('../repositories/projectRepository');
const path = require('path');

/**
 * Console Manager - Handles interactive console access via WebSocket
 */
class ConsoleManager {
  constructor() {
    this.activeConsoles = new Map(); // projectId -> console info
    this.dockerService = new DockerService();
    this.projectsDir = process.env.PROJECTS_DIR || './projects';
  }

  /**
   * Handle console connection for a project
   * @param {Object} ws - WebSocket connection
   * @param {string} projectId - Project ID
   * @param {string} userId - User ID
   * @param {Object} options - Console options
   */
  async handleConsoleConnection(ws, projectId, userId, options = {}) {
    try {
      // Validate user permissions
      const hasAccess = await this.checkConsoleAccess(userId, projectId);
      if (!hasAccess) {
        ws.send(JSON.stringify({ type: 'error', message: 'Access denied' }));
        ws.close();
        return;
      }

      // Get project and container info
      const project = await projectRepository.findById(projectId);
      if (!project) {
        ws.send(JSON.stringify({ type: 'error', message: 'Project not found' }));
        ws.close();
        return;
      }

      if (project.status !== 'running') {
        ws.send(JSON.stringify({ type: 'error', message: 'Project must be running to access console' }));
        ws.close();
        return;
      }

      // Get container name (use project name as container name)
      const containerName = project.name;

      // Create Docker exec session
      const execSession = await this.dockerService.createExecSession(containerName, {
        cmd: options.shell || ['/bin/sh'],
        tty: true,
        stdin: true,
        stdout: true,
        stderr: true
      });

      // Store console session
      this.activeConsoles.set(projectId, {
        ws,
        execSession,
        userId,
        projectName: project.name,
        containerName,
        createdAt: new Date(),
        lastActivity: new Date()
      });

      // Set up WebSocket message handlers
      ws.on('message', (data) => {
        this.handleConsoleInput(projectId, data);
      });

      ws.on('close', () => {
        this.cleanupConsole(projectId);
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error in console:', error);
        this.cleanupConsole(projectId);
      });

      // Start output streaming
      this.streamConsoleOutput(projectId, execSession);

      // Send connection success message
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Console connected successfully',
        projectName: project.name,
        containerName: containerName
      }));

      logger.info(`Console connected for project ${project.name} by user ${userId}`);

    } catch (error) {
      logger.error('Console connection failed:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Connection failed' }));
      ws.close();
    }
  }

  /**
   * Handle console input from WebSocket
   * @param {string} projectId - Project ID
   * @param {string} inputData - Input data
   */
  async handleConsoleInput(projectId, inputData) {
    const console = this.activeConsoles.get(projectId);
    if (!console) return;

    try {
      const { type, data } = JSON.parse(inputData);

      switch (type) {
        case 'input':
          // Send input to Docker exec session
          await this.dockerService.sendToExecSession(console.execSession, data);
          console.lastActivity = new Date();
          break;

        case 'resize':
          // Handle terminal resize
          await this.dockerService.resizeExecSession(
            console.execSession, 
            data.cols || 80, 
            data.rows || 24
          );
          break;

        case 'ping':
          // Respond to ping for connection health check
          console.ws.send(JSON.stringify({ type: 'pong' }));
          break;

        default:
          logger.warn('Unknown console input type:', type);
      }
    } catch (error) {
      logger.error('Console input handling failed:', error);
      console.ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Failed to process input' 
      }));
    }
  }

  /**
   * Stream console output from Docker exec session
   * @param {string} projectId - Project ID
   * @param {Object} execSession - Exec session object
   */
  async streamConsoleOutput(projectId, execSession) {
    const console = this.activeConsoles.get(projectId);
    if (!console) return;

    try {
      // Get stream from Docker exec session
      const stream = this.dockerService.getExecSessionStream(execSession);

      stream.on('data', (data) => {
        if (console.ws.readyState === 1) { // WebSocket.OPEN
          console.ws.send(JSON.stringify({
            type: 'output',
            data: data.toString()
          }));
          console.lastActivity = new Date();
        }
      });

      stream.on('error', (data) => {
        if (console.ws.readyState === 1) { // WebSocket.OPEN
          console.ws.send(JSON.stringify({
            type: 'error',
            data: data.toString()
          }));
        }
      });

      stream.on('end', (error) => {
        if (console.ws.readyState === 1) { // WebSocket.OPEN
          if (error) {
            console.ws.send(JSON.stringify({
              type: 'session_end',
              message: 'Console session ended with error',
              error: error.message
            }));
          } else {
            console.ws.send(JSON.stringify({
              type: 'session_end',
              message: 'Console session ended'
            }));
          }
        }
        this.cleanupConsole(projectId);
      });

      // Store stream reference for cleanup
      console.stream = stream;

    } catch (error) {
      logger.error('Console output streaming failed:', error);
      if (console.ws.readyState === 1) {
        console.ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to start output streaming'
        }));
      }
    }
  }

  /**
   * Check if user has access to project console
   * @param {string} userId - User ID
   * @param {string} projectId - Project ID
   * @returns {Promise<boolean>} True if has access
   */
  async checkConsoleAccess(userId, projectId) {
    try {
      // For now, allow all authenticated users to access console
      // In the future, this could be more restrictive based on project ownership
      return true;
    } catch (error) {
      logger.error('Error checking console access:', error);
      return false;
    }
  }

  /**
   * Cleanup console session
   * @param {string} projectId - Project ID
   */
  cleanupConsole(projectId) {
    const console = this.activeConsoles.get(projectId);
    if (console) {
      // Close Docker exec session
      if (console.execSession) {
        this.dockerService.closeExecSession(console.execSession);
      }

      // Close stream if exists
      if (console.stream) {
        console.stream.close();
      }

      this.activeConsoles.delete(projectId);
      logger.info(`Console session cleaned up for project: ${projectId}`);
    }
  }

  /**
   * Get active console count
   * @returns {number} Number of active consoles
   */
  getActiveConsoleCount() {
    return this.activeConsoles.size;
  }

  /**
   * Get active consoles info
   * @returns {Array} Array of active console info
   */
  getActiveConsoles() {
    const consoles = [];
    for (const [projectId, console] of this.activeConsoles) {
      consoles.push({
        projectId,
        userId: console.userId,
        projectName: console.projectName,
        containerName: console.containerName,
        createdAt: console.createdAt,
        lastActivity: console.lastActivity
      });
    }
    return consoles;
  }

  /**
   * Cleanup inactive consoles (for maintenance)
   * @param {number} maxInactiveMinutes - Maximum inactive minutes
   */
  cleanupInactiveConsoles(maxInactiveMinutes = 30) {
    const now = new Date();
    const maxInactiveMs = maxInactiveMinutes * 60 * 1000;

    for (const [projectId, console] of this.activeConsoles) {
      const inactiveMs = now - console.lastActivity;
      if (inactiveMs > maxInactiveMs) {
        logger.info(`Cleaning up inactive console for project: ${projectId}`);
        this.cleanupConsole(projectId);
      }
    }
  }

  /**
   * Cleanup all consoles (for shutdown)
   */
  cleanup() {
    for (const projectId of this.activeConsoles.keys()) {
      this.cleanupConsole(projectId);
    }
  }
}

module.exports = ConsoleManager;