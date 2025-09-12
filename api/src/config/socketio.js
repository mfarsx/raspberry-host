const { logger } = require('./logger');
const { getRedisClient } = require('./redis');
const LogStreamManager = require('../services/logStreamManager');
const ConsoleManager = require('../services/consoleManager');

const setupSocketIO = (io) => {
  // Initialize managers
  const logStreamManager = new LogStreamManager();
  const consoleManager = new ConsoleManager();
  
  // Connection handling
  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);
    
    // Join client to a room for broadcasting
    socket.join('general');
    
    // Handle client messages
    socket.on('message', (data) => {
      logger.info(`Message from ${socket.id}:`, data);
      
      // Echo the message back to the client
      socket.emit('echo', {
        message: `Echo: ${data.message}`,
        timestamp: new Date().toISOString(),
        clientId: socket.id
      });
      
      // Broadcast to all clients in the room
      socket.to('general').emit('message', {
        ...data,
        from: socket.id,
        timestamp: new Date().toISOString()
      });
    });
    
    // Handle stats requests
    socket.on('stats', () => {
      const stats = {
        connectedClients: io.engine.clientsCount,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
      };
      
      socket.emit('stats', stats);
      logger.info(`Stats requested by ${socket.id}`);
    });
    
    // Handle echo requests
    socket.on('echo', (data) => {
      socket.emit('echo', {
        message: data.message,
        timestamp: new Date().toISOString(),
        clientId: socket.id
      });
    });
    
    // Handle ping/pong
    socket.on('ping', () => {
      socket.emit('pong', {
        timestamp: new Date().toISOString()
      });
    });

    // Handle log streaming requests
    socket.on('start_log_stream', async (data) => {
      try {
        const { projectId, options = {} } = data;
        const userId = socket.userId || 'anonymous'; // You might want to get this from auth
        
        if (!projectId) {
          socket.emit('log_stream_error', { message: 'Project ID is required' });
          return;
        }

        logger.info(`Starting log stream for project ${projectId} by user ${userId}`);
        await logStreamManager.startLogStream(socket, projectId, userId, options);
        
      } catch (error) {
        logger.error('Error starting log stream:', error);
        socket.emit('log_stream_error', { message: 'Failed to start log stream' });
      }
    });

    // Handle log stream messages (filters, pause/resume)
    socket.on('log_stream_message', (data) => {
      try {
        const { projectId, ...messageData } = data;
        if (projectId) {
          logStreamManager.handleLogStreamMessage(projectId, JSON.stringify(messageData));
        }
      } catch (error) {
        logger.error('Error handling log stream message:', error);
      }
    });

    // Handle stop log stream
    socket.on('stop_log_stream', (data) => {
      try {
        const { projectId } = data;
        if (projectId) {
          logStreamManager.stopLogStream(projectId);
          socket.emit('log_stream_stopped', { projectId });
        }
      } catch (error) {
        logger.error('Error stopping log stream:', error);
      }
    });

    // Handle console access requests
    socket.on('start_console', async (data) => {
      try {
        const { projectId, options = {} } = data;
        const userId = socket.userId || 'anonymous';
        
        if (!projectId) {
          socket.emit('console_error', { message: 'Project ID is required' });
          return;
        }

        logger.info(`Starting console for project ${projectId} by user ${userId}`);
        await consoleManager.handleConsoleConnection(socket, projectId, userId, options);
        
      } catch (error) {
        logger.error('Error starting console:', error);
        socket.emit('console_error', { message: 'Failed to start console' });
      }
    });

    // Handle console messages (input, resize, etc.)
    socket.on('console_message', (data) => {
      try {
        const { projectId, ...messageData } = data;
        if (projectId) {
          consoleManager.handleConsoleInput(projectId, JSON.stringify(messageData));
        }
      } catch (error) {
        logger.error('Error handling console message:', error);
      }
    });

    // Handle stop console
    socket.on('stop_console', (data) => {
      try {
        const { projectId } = data;
        if (projectId) {
          consoleManager.cleanupConsole(projectId);
          socket.emit('console_stopped', { projectId });
        }
      } catch (error) {
        logger.error('Error stopping console:', error);
      }
    });
    
    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info(`Client disconnected: ${socket.id}, reason: ${reason}`);
      
      // Clean up any active log streams for this socket
      const activeStreams = logStreamManager.getActiveStreams();
      activeStreams.forEach(stream => {
        if (stream.userId === socket.userId) {
          logStreamManager.stopLogStream(stream.projectId);
        }
      });

      // Clean up any active consoles for this socket
      const activeConsoles = consoleManager.getActiveConsoles();
      activeConsoles.forEach(console => {
        if (console.userId === socket.userId) {
          consoleManager.cleanupConsole(console.projectId);
        }
      });
    });
    
    // Handle errors
    socket.on('error', (error) => {
      logger.error(`Socket error from ${socket.id}:`, error);
    });
  });
  
  // Server-wide events
  io.engine.on('connection_error', (error) => {
    logger.error('Socket.IO connection error:', error);
  });
  
  logger.info('Socket.IO server configured');
};

module.exports = {
  setupSocketIO
};
