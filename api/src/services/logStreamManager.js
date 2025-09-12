const { logger } = require('../config/logger');
const DockerService = require('./dockerService');
const projectRepository = require('../repositories/projectRepository');
const path = require('path');

/**
 * Log Stream Manager - Handles real-time log streaming via WebSocket
 */
class LogStreamManager {
  constructor() {
    this.activeStreams = new Map(); // projectId -> stream info
    this.logFilters = new Map(); // projectId -> filter settings
    this.dockerService = new DockerService();
    this.projectsDir = process.env.PROJECTS_DIR || './projects';
  }

  /**
   * Start log stream for a project
   * @param {Object} ws - WebSocket connection
   * @param {string} projectId - Project ID
   * @param {string} userId - User ID
   * @param {Object} options - Stream options
   */
  async startLogStream(ws, projectId, userId, options = {}) {
    try {
      // Validate access
      const hasAccess = await this.checkLogAccess(userId, projectId);
      if (!hasAccess) {
        ws.send(JSON.stringify({ type: 'error', message: 'Access denied' }));
        ws.close();
        return;
      }

      // Get project info
      const project = await projectRepository.findById(projectId);
      if (!project) {
        ws.send(JSON.stringify({ type: 'error', message: 'Project not found' }));
        ws.close();
        return;
      }

      // Set up log stream options
      const streamOptions = {
        follow: true,
        tail: options.tail || 100,
        since: options.since || new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours
        timestamps: true,
        ...options
      };

      // Store stream info
      this.activeStreams.set(projectId, {
        ws,
        userId,
        options: streamOptions,
        createdAt: new Date(),
        messageCount: 0,
        projectName: project.name
      });

      // Set up WebSocket handlers
      ws.on('message', (data) => {
        this.handleLogStreamMessage(projectId, data);
      });

      ws.on('close', () => {
        this.stopLogStream(projectId);
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error in log stream:', error);
        this.stopLogStream(projectId);
      });

      // Start Docker log streaming
      await this.streamDockerLogs(projectId, streamOptions);

    } catch (error) {
      logger.error('Log stream start failed:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Stream failed to start' }));
      ws.close();
    }
  }

  /**
   * Stream Docker logs for a project
   * @param {string} projectId - Project ID
   * @param {Object} options - Stream options
   */
  async streamDockerLogs(projectId, options) {
    const stream = this.activeStreams.get(projectId);
    if (!stream) return;

    try {
      const projectPath = path.join(this.projectsDir, stream.projectName);
      
      // Get Docker logs stream
      const logStream = await this.dockerService.getProjectLogsStream(projectPath, options);

      logStream.on('data', (chunk) => {
        // Rate limiting check
        if (stream.messageCount > 1000) { // Max 1000 messages per session
          stream.ws.send(JSON.stringify({
            type: 'warning',
            message: 'Rate limit reached, stopping stream'
          }));
          this.stopLogStream(projectId);
          return;
        }

        // Parse and filter logs
        const logEntry = this.dockerService.parseLogEntry(chunk.toString());
        if (this.shouldIncludeLog(projectId, logEntry)) {
          stream.ws.send(JSON.stringify({
            type: 'log',
            data: logEntry,
            timestamp: new Date().toISOString()
          }));
          stream.messageCount++;
        }
      });

      logStream.on('error', (error) => {
        logger.error('Log stream error:', error);
        stream.ws.send(JSON.stringify({
          type: 'error',
          message: 'Log stream error'
        }));
      });

      logStream.on('end', () => {
        stream.ws.send(JSON.stringify({ type: 'stream_end' }));
        this.stopLogStream(projectId);
      });

      // Store the log stream for cleanup
      stream.logStream = logStream;

    } catch (error) {
      logger.error('Docker log streaming failed:', error);
    }
  }

  /**
   * Handle WebSocket messages for log streaming
   * @param {string} projectId - Project ID
   * @param {string} data - Message data
   */
  handleLogStreamMessage(projectId, data) {
    try {
      const { type, ...payload } = JSON.parse(data);
      const stream = this.activeStreams.get(projectId);
      
      if (!stream) return;

      switch (type) {
        case 'filter':
          // Update log filters
          this.logFilters.set(projectId, payload);
          break;

        case 'pause':
          // Pause log streaming
          this.pauseLogStream(projectId);
          break;

        case 'resume':
          // Resume log streaming
          this.resumeLogStream(projectId);
          break;

        default:
          logger.warn('Unknown log stream message type:', type);
      }
    } catch (error) {
      logger.error('Log stream message handling failed:', error);
    }
  }

  /**
   * Check if log should be included based on filters
   * @param {string} projectId - Project ID
   * @param {Object} logEntry - Log entry
   * @returns {boolean} True if should include
   */
  shouldIncludeLog(projectId, logEntry) {
    const filters = this.logFilters.get(projectId);
    if (!filters) return true;

    // Apply filters (level, keyword, stream, etc.)
    if (filters.level && !logEntry.message.toLowerCase().includes(filters.level.toLowerCase())) {
      return false;
    }

    if (filters.keyword && !logEntry.message.toLowerCase().includes(filters.keyword.toLowerCase())) {
      return false;
    }

    if (filters.stream && logEntry.stream !== filters.stream) {
      return false;
    }

    if (filters.container && logEntry.container !== filters.container) {
      return false;
    }

    return true;
  }

  /**
   * Pause log streaming
   * @param {string} projectId - Project ID
   */
  pauseLogStream(projectId) {
    const stream = this.activeStreams.get(projectId);
    if (stream && stream.logStream) {
      // Note: Docker logs don't have a pause mechanism, so we'll just mark as paused
      stream.paused = true;
      stream.ws.send(JSON.stringify({ type: 'paused' }));
    }
  }

  /**
   * Resume log streaming
   * @param {string} projectId - Project ID
   */
  resumeLogStream(projectId) {
    const stream = this.activeStreams.get(projectId);
    if (stream && stream.logStream) {
      stream.paused = false;
      stream.ws.send(JSON.stringify({ type: 'resumed' }));
    }
  }

  /**
   * Stop log stream
   * @param {string} projectId - Project ID
   */
  stopLogStream(projectId) {
    const stream = this.activeStreams.get(projectId);
    if (stream) {
      // Close Docker log stream
      if (stream.logStream) {
        stream.logStream.close();
      }
      
      this.activeStreams.delete(projectId);
      this.logFilters.delete(projectId);
      
      logger.info(`Log stream stopped for project: ${projectId}`);
    }
  }

  /**
   * Check if user has access to project logs
   * @param {string} userId - User ID
   * @param {string} projectId - Project ID
   * @returns {Promise<boolean>} True if has access
   */
  async checkLogAccess(userId, projectId) {
    try {
      // For now, allow all authenticated users to view logs
      // In the future, this could be more restrictive based on project ownership
      return true;
    } catch (error) {
      logger.error('Error checking log access:', error);
      return false;
    }
  }

  /**
   * Get active stream count
   * @returns {number} Number of active streams
   */
  getActiveStreamCount() {
    return this.activeStreams.size;
  }

  /**
   * Get active streams info
   * @returns {Array} Array of active stream info
   */
  getActiveStreams() {
    const streams = [];
    for (const [projectId, stream] of this.activeStreams) {
      streams.push({
        projectId,
        userId: stream.userId,
        createdAt: stream.createdAt,
        messageCount: stream.messageCount,
        projectName: stream.projectName
      });
    }
    return streams;
  }

  /**
   * Cleanup all streams (for shutdown)
   */
  cleanup() {
    for (const projectId of this.activeStreams.keys()) {
      this.stopLogStream(projectId);
    }
  }
}

module.exports = LogStreamManager;