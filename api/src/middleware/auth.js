const jwt = require('jsonwebtoken');
const config = require('../config/environment');
const { securityLogger } = require('../config/logger');

/**
 * Simple Authentication middleware
 */
class AuthMiddleware {
  static verifyToken(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return res.status(401).json({
          success: false,
          error: 'Access denied. No token provided.'
        });
      }

      const token = authHeader.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'Access denied. Invalid token format.'
        });
      }

      const decoded = jwt.verify(token, config.jwtSecret);
      req.user = decoded;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Token expired'
        });
      }
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          error: 'Invalid token'
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

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
      req.user = null;
      next();
    }
  }

  static requireRole(role) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Access denied. No user authenticated.'
        });
      }

      if (!req.user.roles && !req.user.role) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. No role assigned to user.'
        });
      }

      // Check if user has the required role (support both single role and roles array)
      const userRoles = req.user.roles || (req.user.role ? [req.user.role] : []);
      if (!userRoles.includes(role)) {
        return res.status(403).json({
          success: false,
          error: `Access denied. Required role: ${role}, user roles: ${userRoles.join(', ')}`
        });
      }

      next();
    };
  }

  static authRateLimit(req, res, next) {
    // Simple rate limiting for auth endpoints
    // In production, you'd want to use Redis or a proper rate limiting library
    const clientIp = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    // Store rate limit data in memory (in production, use Redis)
    if (!AuthMiddleware.rateLimitStore) {
      AuthMiddleware.rateLimitStore = new Map();
    }
    
    const key = `auth_${clientIp}`;
    const attempts = AuthMiddleware.rateLimitStore.get(key) || { count: 0, resetTime: now + 15 * 60 * 1000 }; // 15 minutes
    
    if (now > attempts.resetTime) {
      attempts.count = 0;
      attempts.resetTime = now + 15 * 60 * 1000;
    }
    
    if (attempts.count >= 5) { // 5 attempts per 15 minutes
      securityLogger.suspiciousActivity(clientIp, 'rate_limit_exceeded', {
        endpoint: req.path,
        attempts: attempts.count
      });
      return res.status(429).json({
        success: false,
        error: 'Too many authentication attempts. Please try again later.',
        category: 'RATE_LIMIT'
      });
    }
    
    attempts.count++;
    AuthMiddleware.rateLimitStore.set(key, attempts);
    next();
  }

  static recordAuthAttempt(req, res, next) {
    const clientIp = req.ip || req.connection.remoteAddress;
    const endpoint = req.path;
    const method = req.method;
    
    // Log authentication attempt
    securityLogger.info(`Auth attempt: ${method} ${endpoint} from ${clientIp}`);
    
    next();
  }

  static requireOwnership(paramName) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Access denied. No user authenticated.'
        });
      }

      const resourceId = req.params[paramName];
      const userId = req.user.id;

      // Allow admin users to access any resource
      const userRoles = req.user.roles || (req.user.role ? [req.user.role] : []);
      if (userRoles.includes('admin')) {
        return next();
      }

      // Check if user is accessing their own resource
      if (resourceId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. You can only access your own resources.',
          category: 'FORBIDDEN'
        });
      }

      next();
    };
  }
}

module.exports = AuthMiddleware;