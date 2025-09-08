const { v4: uuidv4 } = require('uuid');

/**
 * Request ID middleware
 * Adds a unique request ID to each request for better tracing
 */
const requestIdMiddleware = (req, res, next) => {
  // Generate or use existing request ID
  req.requestId = req.headers['x-request-id'] || uuidv4();
  
  // Set response header
  res.setHeader('X-Request-ID', req.requestId);
  
  next();
};

module.exports = requestIdMiddleware;