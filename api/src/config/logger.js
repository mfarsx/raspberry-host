const winston = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('./environment');

// Create logs directory if it doesn't exist
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Enhanced log format with more context
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata({ 
    fillExcept: ['message', 'level', 'timestamp', 'service'] 
  }),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, metadata }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    if (metadata && Object.keys(metadata).length > 0) {
      log += `\n  Metadata: ${JSON.stringify(metadata, null, 2)}`;
    }
    return log;
  })
);

// Define which transports the logger must use
const transports = [
  // Console transport
  new winston.transports.Console({
    format: config.isDevelopment ? consoleFormat : winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
      winston.format.colorize({ all: true }),
      winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`
      )
    ),
  }),
  // File transport for errors
  new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    level: 'error',
    maxsize: 10485760, // 10MB
    maxFiles: 10,
    tailable: true,
    format: logFormat,
  }),
  // File transport for all logs
  new winston.transports.File({
    filename: path.join(logDir, 'combined.log'),
    maxsize: 10485760, // 10MB
    maxFiles: 10,
    tailable: true,
    format: logFormat,
  }),
  // File transport for access logs
  new winston.transports.File({
    filename: path.join(logDir, 'access.log'),
    level: 'http',
    maxsize: 10485760, // 10MB
    maxFiles: 10,
    tailable: true,
    format: logFormat,
  }),
];

// Create the logger
const logger = winston.createLogger({
  level: config.logLevel,
  levels,
  transports,
  exitOnError: false,
  defaultMeta: { 
    service: 'pi-hosting-api',
    environment: config.nodeEnv,
    version: process.env.npm_package_version || '1.0.0'
  },
});

// Create a stream object with a 'write' function that will be used by morgan
const morganStream = {
  write: (message) => {
    logger.http(message.substring(0, message.lastIndexOf('\n')));
  },
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      contentLength: res.get('Content-Length') || 0
    };
    
    if (res.statusCode >= 400) {
      logger.warn('HTTP Request', logData);
    } else {
      logger.http('HTTP Request', logData);
    }
  });
  
  next();
};

// Performance monitoring
const performanceLogger = {
  startTimer: (label) => {
    const start = process.hrtime.bigint();
    return {
      end: () => {
        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1000000; // Convert to milliseconds
        logger.info(`Performance: ${label}`, { duration: `${duration.toFixed(2)}ms` });
        return duration;
      }
    };
  }
};

// Security event logging
const securityLogger = {
  loginAttempt: (ip, user, success) => {
    logger.warn('Security: Login Attempt', {
      ip,
      user,
      success,
      timestamp: new Date().toISOString()
    });
  },
  
  suspiciousActivity: (ip, activity, details) => {
    logger.error('Security: Suspicious Activity', {
      ip,
      activity,
      details,
      timestamp: new Date().toISOString()
    });
  },
  
  rateLimitExceeded: (ip, endpoint) => {
    logger.warn('Security: Rate Limit Exceeded', {
      ip,
      endpoint,
      timestamp: new Date().toISOString()
    });
  }
};

// Business event logging
const businessLogger = {
  projectDeployed: (projectId, projectName, userId) => {
    logger.info('Business: Project Deployed', {
      projectId,
      projectName,
      userId,
      timestamp: new Date().toISOString()
    });
  },
  
  projectDeleted: (projectId, projectName, userId) => {
    logger.info('Business: Project Deleted', {
      projectId,
      projectName,
      userId,
      timestamp: new Date().toISOString()
    });
  },
  
  systemHealthCheck: (status, details) => {
    logger.info('Business: System Health Check', {
      status,
      details,
      timestamp: new Date().toISOString()
    });
  }
};

// Error tracking with context
const errorLogger = {
  logError: (error, context = {}) => {
    logger.error('Application Error', {
      message: error.message,
      stack: error.stack,
      ...context,
      timestamp: new Date().toISOString()
    });
  },
  
  logDatabaseError: (error, operation, context = {}) => {
    logger.error('Database Error', {
      message: error.message,
      operation,
      ...context,
      timestamp: new Date().toISOString()
    });
  },
  
  logNetworkError: (error, endpoint, context = {}) => {
    logger.error('Network Error', {
      message: error.message,
      endpoint,
      ...context,
      timestamp: new Date().toISOString()
    });
  }
};

// Log rotation and cleanup
const logRotation = {
  cleanup: () => {
    const files = fs.readdirSync(logDir);
    const now = Date.now();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    
    files.forEach(file => {
      const filePath = path.join(logDir, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtime.getTime() > maxAge) {
        fs.unlinkSync(filePath);
        logger.info(`Cleaned up old log file: ${file}`);
      }
    });
  }
};

// Initialize log cleanup on startup
setInterval(logRotation.cleanup, 24 * 60 * 60 * 1000); // Run daily

module.exports = { 
  logger,
  morganStream,
  requestLogger,
  performanceLogger,
  securityLogger,
  businessLogger,
  errorLogger,
  logRotation
};
