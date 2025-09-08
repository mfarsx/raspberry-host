const jwt = require('jsonwebtoken');
const { logger, securityLogger } = require('../config/logger');
const config = require('../config/environment');

/**
 * Authentication middleware factory
 */
class AuthMiddleware {
  /**
   * Verify JWT token
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static verifyToken(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        securityLogger.suspiciousActivity(req.ip, 'missing_auth_header', {
          endpoint: req.path,
          method: req.method
        });
        return res.status(401).json({
          success: false,
          error: 'Access denied. No token provided.',
          category: 'AUTH_ERROR'
        });
      }

      const token = authHeader.split(' ')[1]; // Bearer TOKEN
      
      if (!token) {
        securityLogger.suspiciousActivity(req.ip, 'malformed_auth_header', {
          endpoint: req.path,
          method: req.method
        });
        return res.status(401).json({
          success: false,
          error: 'Access denied. Invalid token format.',
          category: 'AUTH_ERROR'
        });
      }

      const decoded = jwt.verify(token, config.jwtSecret);
      req.user = decoded;
      next();
    } catch (error) {
      securityLogger.suspiciousActivity(req.ip, 'invalid_token', {
        endpoint: req.path,
        method: req.method,
        error: error.message
      });
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Token expired',
          category: 'AUTH_ERROR'
        });
      }
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          error: 'Invalid token',
          category: 'AUTH_ERROR'
        });
      }
      
      logger.error('Token verification error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        category: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Optional authentication - doesn't fail if no token
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static optionalAuth(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        req.user = null;
        return next();
      }

      const token = authHeader.split(' ')[1];
      
      if (!token) {
        req.user = null;
        return next();
      }

      const decoded = jwt.verify(token, config.jwtSecret);
      req.user = decoded;
      next();
    } catch (error) {
      // For optional auth, we don't log suspicious activity
      req.user = null;
      next();
    }
  }

  /**
   * Check if user has required role
   * @param {string|Array} roles - Required role(s)
   * @returns {Function} Express middleware function
   */
  static requireRole(roles) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          category: 'AUTH_ERROR'
        });
      }

      const userRoles = req.user.roles || [];
      const requiredRoles = Array.isArray(roles) ? roles : [roles];
      
      const hasRole = requiredRoles.some(role => userRoles.includes(role));
      
      if (!hasRole) {
        securityLogger.suspiciousActivity(req.ip, 'insufficient_permissions', {
          endpoint: req.path,
          method: req.method,
          userId: req.user.id,
          userRoles,
          requiredRoles
        });
        
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          category: 'AUTH_ERROR'
        });
      }
      
      next();
    };
  }

  /**
   * Check if user owns the resource
   * @param {string} resourceUserIdField - Field name containing user ID in request
   * @returns {Function} Express middleware function
   */
  static requireOwnership(resourceUserIdField = 'userId') {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          category: 'AUTH_ERROR'
        });
      }

      const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
      
      if (!resourceUserId) {
        return res.status(400).json({
          success: false,
          error: 'Resource user ID not found',
          category: 'VALIDATION_ERROR'
        });
      }

      // Admin users can access any resource
      if (req.user.roles && req.user.roles.includes('admin')) {
        return next();
      }

      if (req.user.id !== resourceUserId) {
        securityLogger.suspiciousActivity(req.ip, 'unauthorized_resource_access', {
          endpoint: req.path,
          method: req.method,
          userId: req.user.id,
          resourceUserId,
          resourceField: resourceUserIdField
        });
        
        return res.status(403).json({
          success: false,
          error: 'Access denied. You can only access your own resources.',
          category: 'AUTH_ERROR'
        });
      }
      
      next();
    };
  }

  /**
   * Rate limiting for authentication endpoints
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static authRateLimit(req, res, next) {
    // This would integrate with Redis for distributed rate limiting
    // For now, we'll use a simple in-memory approach
    const clientId = req.ip;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxAttempts = 5;
    
    if (!AuthMiddleware.authAttempts) {
      AuthMiddleware.authAttempts = new Map();
    }
    
    const attempts = AuthMiddleware.authAttempts.get(clientId) || [];
    const recentAttempts = attempts.filter(time => now - time < windowMs);
    
    if (recentAttempts.length >= maxAttempts) {
      securityLogger.suspiciousActivity(req.ip, 'auth_rate_limit_exceeded', {
        endpoint: req.path,
        method: req.method,
        attempts: recentAttempts.length
      });
      
      return res.status(429).json({
        success: false,
        error: 'Too many authentication attempts. Please try again later.',
        retryAfter: '15 minutes',
        category: 'RATE_LIMIT_ERROR'
      });
    }
    
    AuthMiddleware.authAttempts.set(clientId, recentAttempts);
    next();
  }

  /**
   * Record authentication attempt
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static recordAuthAttempt(req, res, next) {
    const clientId = req.ip;
    const now = Date.now();
    
    if (!AuthMiddleware.authAttempts) {
      AuthMiddleware.authAttempts = new Map();
    }
    
    const attempts = AuthMiddleware.authAttempts.get(clientId) || [];
    attempts.push(now);
    AuthMiddleware.authAttempts.set(clientId, attempts);
    
    next();
  }
}

module.exports = AuthMiddleware;