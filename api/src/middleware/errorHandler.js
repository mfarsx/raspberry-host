const { logger } = require('../config/logger');
const config = require('../config/environment');

const errorHandler = (error, req, res, next) => {
  let { statusCode = 500, message } = error;
  let category = 'INTERNAL_ERROR';
  let isOperational = error.isOperational || false;

  // Enhanced error context
  const errorContext = {
    error: error.message,
    stack: error.stack,
    category,
    statusCode,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id || 'anonymous',
    timestamp: new Date().toISOString(),
    requestId: req.requestId || 'unknown'
  };

  // Handle specific error types with better categorization
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    category = 'VALIDATION_ERROR';
    isOperational = true;
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
    category = 'CAST_ERROR';
    isOperational = true;
  } else if (error.name === 'MongoError' && error.code === 11000) {
    statusCode = 409;
    message = 'Duplicate field value';
    category = 'DUPLICATE_ERROR';
    isOperational = true;
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    category = 'AUTH_ERROR';
    isOperational = true;
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    category = 'AUTH_ERROR';
    isOperational = true;
  } else if (error.name === 'SyntaxError') {
    statusCode = 400;
    message = 'Invalid JSON syntax';
    category = 'SYNTAX_ERROR';
    isOperational = true;
  } else if (error.name === 'ENOTFOUND' || error.name === 'ECONNREFUSED') {
    statusCode = 503;
    message = 'Service unavailable';
    category = 'NETWORK_ERROR';
    isOperational = true;
  } else if (error.name === 'ETIMEDOUT') {
    statusCode = 504;
    message = 'Request timeout';
    category = 'TIMEOUT_ERROR';
    isOperational = true;
  } else if (error.name === 'MulterError') {
    statusCode = 400;
    message = 'File upload error';
    category = 'UPLOAD_ERROR';
    isOperational = true;
  } else if (error.name === 'RateLimitError') {
    statusCode = 429;
    message = 'Rate limit exceeded';
    category = 'RATE_LIMIT_ERROR';
    isOperational = true;
  }

  // Log error with appropriate level
  if (isOperational) {
    logger.warn('Operational error occurred:', errorContext);
  } else {
    logger.error('System error occurred:', errorContext);
  }

  // Send error response with enhanced information
  const errorResponse = {
    success: false,
    error: message,
    category,
    timestamp: new Date().toISOString(),
    requestId: req.requestId || 'unknown'
  };

  // Add development-specific information
  if (config.isDevelopment) {
    errorResponse.stack = error.stack;
    errorResponse.details = error.details;
    errorResponse.context = errorContext;
  }

  // Add retry information for certain errors
  if (category === 'NETWORK_ERROR' || category === 'TIMEOUT_ERROR') {
    errorResponse.retryable = true;
    errorResponse.retryAfter = '30 seconds';
  }

  res.status(statusCode).json(errorResponse);
};

const createError = (message, statusCode = 500) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  createError,
  asyncHandler
};
