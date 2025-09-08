const { logger } = require('../config/logger');

/**
 * Validation middleware factory
 * Creates validation middleware for different schemas
 */
class ValidationMiddleware {
  /**
   * Validates request body against a schema
   * @param {Object} schema - Validation schema
   * @returns {Function} Express middleware function
   */
  static validateBody(schema) {
    return (req, res, next) => {
      try {
        const { error, value } = schema.validate(req.body, { 
          abortEarly: false,
          stripUnknown: true 
        });

        if (error) {
          const validationErrors = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value
          }));

          logger.warn('Validation error:', {
            path: req.path,
            method: req.method,
            errors: validationErrors
          });

          return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: validationErrors
          });
        }

        req.body = value;
        next();
      } catch (err) {
        logger.error('Validation middleware error:', err);
        res.status(500).json({
          success: false,
          error: 'Internal validation error'
        });
      }
    };
  }

  /**
   * Validates request parameters against a schema
   * @param {Object} schema - Validation schema
   * @returns {Function} Express middleware function
   */
  static validateParams(schema) {
    return (req, res, next) => {
      try {
        const { error, value } = schema.validate(req.params, { 
          abortEarly: false,
          stripUnknown: true 
        });

        if (error) {
          const validationErrors = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value
          }));

          logger.warn('Parameter validation error:', {
            path: req.path,
            method: req.method,
            errors: validationErrors
          });

          return res.status(400).json({
            success: false,
            error: 'Invalid parameters',
            details: validationErrors
          });
        }

        req.params = value;
        next();
      } catch (err) {
        logger.error('Parameter validation middleware error:', err);
        res.status(500).json({
          success: false,
          error: 'Internal validation error'
        });
      }
    };
  }

  /**
   * Validates request query parameters against a schema
   * @param {Object} schema - Validation schema
   * @returns {Function} Express middleware function
   */
  static validateQuery(schema) {
    return (req, res, next) => {
      try {
        const { error, value } = schema.validate(req.query, { 
          abortEarly: false,
          stripUnknown: true 
        });

        if (error) {
          const validationErrors = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value
          }));

          logger.warn('Query validation error:', {
            path: req.path,
            method: req.method,
            errors: validationErrors
          });

          return res.status(400).json({
            success: false,
            error: 'Invalid query parameters',
            details: validationErrors
          });
        }

        req.query = value;
        next();
      } catch (err) {
        logger.error('Query validation middleware error:', err);
        res.status(500).json({
          success: false,
          error: 'Internal validation error'
        });
      }
    };
  }

  /**
   * Sanitizes input data to prevent XSS and other attacks
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static sanitizeInput(req, res, next) {
    try {
      const sanitizeObject = (obj) => {
        if (typeof obj !== 'object' || obj === null) {
          return obj;
        }

        if (Array.isArray(obj)) {
          return obj.map(sanitizeObject);
        }

        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
          if (typeof value === 'string') {
            // Remove potentially dangerous characters
            sanitized[key] = value
              .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
              .replace(/javascript:/gi, '')
              .replace(/on\w+\s*=/gi, '')
              .trim();
          } else {
            sanitized[key] = sanitizeObject(value);
          }
        }
        return sanitized;
      };

      if (req.body) {
        req.body = sanitizeObject(req.body);
      }
      if (req.query) {
        req.query = sanitizeObject(req.query);
      }
      if (req.params) {
        req.params = sanitizeObject(req.params);
      }

      next();
    } catch (err) {
      logger.error('Sanitization middleware error:', err);
      res.status(500).json({
        success: false,
        error: 'Internal sanitization error'
      });
    }
  }
}

module.exports = ValidationMiddleware;
