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
const { connectDatabase } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { logger, requestLogger, performanceLogger } = require('./config/logger');
const { errorHandler } = require('./middleware/errorHandler');
const { rateLimiter } = require('./middleware/rateLimiter');
const requestIdMiddleware = require('./middleware/requestId');
const { setupSocketIO } = require('./config/socketio');
const config = require('./config/environment');
const MonitoringService = require('./services/monitoringService');

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: config.corsOrigin,
    methods: ["GET", "POST"]
  }
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
app.use('/api/projects', projectRoutes);
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

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Start server
async function startServer() {
  const timer = performanceLogger.startTimer('Server Startup');
  
  try {
    // Initialize monitoring service
    const monitoringService = new MonitoringService();
    monitoringService.startMonitoring();
    
    // Connect to databases (optional in development)
    if (config.isProduction) {
      await connectDatabase();
      await connectRedis();
    } else {
      logger.info('Running in development mode - skipping database connections');
    }
    
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
