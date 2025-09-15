const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { createServer } = require('http');
const { Server: SocketIOServer } = require('socket.io');

// Import routes
const healthRoutes = require('./routes/health');
const apiRoutes = require('./routes/api');
const projectRoutes = require('./routes/projects');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const dockerRoutes = require('./routes/docker');
const { connectDatabase } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { logger, requestLogger, performanceLogger } = require('./config/logger');
const { errorHandler } = require('./middleware/errorHandler');
const { rateLimiter } = require('./middleware/rateLimiter');
const requestIdMiddleware = require('./middleware/requestId');
const { setupSocketIO } = require('./config/socketio');
const config = require('./config/environment');
const MonitoringService = require('./services/monitoringService');
const StatusSyncService = require('./services/statusSyncService');

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: config.corsOrigin,
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  allowEIO3: true,
  transports: ["polling", "websocket"]
});

const PORT = config.port;

// Security middleware
if (config.enableSecurityHeaders) {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "wss:"],
      },
    },
  }));
}

// CORS configuration
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Compression middleware
if (config.enableCompression) {
  app.use(compression());
}

// Request ID middleware
app.use(requestIdMiddleware);

// Enhanced request logging middleware
app.use(requestLogger);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
if (config.enableRateLimiting) {
  app.use(rateLimiter);
}

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/docker', dockerRoutes);
app.use('/api', apiRoutes);

// WebSocket setup
setupSocketIO(io);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  logger.warn('Route not found:', {
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  res.status(404).json({
    success: false,
    error: 'Route not found',
    category: 'NOT_FOUND',
    path: req.originalUrl
  });
});

// Global services for graceful shutdown
let statusSyncService = null;

// Graceful shutdown handling
let isShuttingDown = false;

const gracefulShutdown = (signal) => {
  if (isShuttingDown) {
    logger.warn(`${signal} received again, forcing exit`);
    process.exit(1);
  }
  
  isShuttingDown = true;
  logger.info(`${signal} received, shutting down gracefully`);
  
  // Stop accepting new connections
  server.close((err) => {
    if (err) {
      logger.error('Error during server shutdown:', err);
      process.exit(1);
    }
    
    logger.info('HTTP server closed');
    
    // Stop status sync service
    if (statusSyncService) {
      statusSyncService.stop();
      logger.info('Status sync service stopped');
    }
    
    // Close database connections if they exist
    try {
      if (config.isProduction) {
        // Close MongoDB connection
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState === 1) {
          mongoose.connection.close(false, () => {
            logger.info('MongoDB connection closed');
          });
        }
        
        // Close Redis connection
        const { getRedisClient } = require('./config/redis');
        const redisClient = getRedisClient();
        if (redisClient && redisClient.isOpen) {
          redisClient.quit(() => {
            logger.info('Redis connection closed');
          });
        }
      }
    } catch (error) {
      logger.error('Error closing database connections:', error);
    }
    
    // Give connections time to close, then force exit
    setTimeout(() => {
      logger.info('Process terminated gracefully');
      process.exit(0);
    }, 5000);
  });
  
  // Force exit after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle different shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', {
    error: error.message,
    stack: error.stack
  });
  
  // Don't exit immediately, let graceful shutdown handle it
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', {
    reason: reason?.message || reason,
    promise: promise.toString()
  });
  
  // Don't exit immediately, let graceful shutdown handle it
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Start server
async function startServer() {
  const timer = performanceLogger.startTimer('Server Startup');
  
  try {
    // Initialize monitoring service
    const monitoringService = new MonitoringService();
    monitoringService.startMonitoring();
    
    // Connect to databases
    await connectDatabase();
    await connectRedis();
    
    // Initialize status sync service
    statusSyncService = new StatusSyncService();
    statusSyncService.start();
    
    server.listen(PORT, () => {
      timer.end();
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📊 Environment: ${config.nodeEnv}`);
      logger.info(`🌐 CORS Origin: ${config.corsOrigin}`);
      logger.info(`📁 Projects Directory: ${config.projectsDir}`);
      logger.info(`📈 Monitoring: Enabled`);
      logger.info(`🔒 Security Headers: ${config.enableSecurityHeaders ? 'Enabled' : 'Disabled'}`);
      logger.info(`⚡ Compression: ${config.enableCompression ? 'Enabled' : 'Disabled'}`);
      logger.info(`🚦 Rate Limiting: ${config.enableRateLimiting ? 'Enabled' : 'Disabled'}`);
    });
  } catch (error) {
    timer.end();
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
