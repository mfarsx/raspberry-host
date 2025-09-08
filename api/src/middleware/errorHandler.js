const { logger } = require('../config/logger');
const config = require('../config/environment');

const errorHandler = (error, req, res, next) => {
  let { statusCode = 500, message } = error;
  let category = 'INTERNAL_ERROR';

  // Log error with enhanced context
  logger.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    category,
    statusCode,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Handle specific error types with better categorization
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    category = 'VALIDATION_ERROR';
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
    category = 'CAST_ERROR';
  } else if (error.name === 'MongoError' && error.code === 11000) {
    statusCode = 409;
    message = 'Duplicate field value';
    category = 'DUPLICATE_ERROR';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    category = 'AUTH_ERROR';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    category = 'AUTH_ERROR';
  } else if (error.name === 'SyntaxError') {
    statusCode = 400;
    message = 'Invalid JSON syntax';
    category = 'SYNTAX_ERROR';
  } else if (error.name === 'ENOTFOUND' || error.name === 'ECONNREFUSED') {
    statusCode = 503;
    message = 'Service unavailable';
    category = 'NETWORK_ERROR';
  } else if (error.name === 'ETIMEDOUT') {
    statusCode = 504;
    message = 'Request timeout';
    category = 'TIMEOUT_ERROR';
  }

  // Send error response with enhanced information
  res.status(statusCode).json({
    success: false,
    error: message,
    category,
    ...(config.isDevelopment && { 
      stack: error.stack,
      details: error.details 
    })
  });
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
