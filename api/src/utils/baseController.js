const { logger } = require('../config/logger');
const ResponseHelper = require('./responseHelper');

/**
 * BaseController - Abstract base class for all controllers
 * 
 * Provides common functionality including standardized error handling,
 * request validation, response formatting, and logging patterns.
 */
class BaseController {
  constructor(controllerName) {
    if (this.constructor === BaseController) {
      throw new Error('BaseController cannot be instantiated directly');
    }
    
    this.controllerName = controllerName;
    this.logger = logger;
  }

  /**
   * Handle a request with standardized error handling
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} operation - Async function to execute
   * @param {string} errorMessage - Error message for logging
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Express response
   */
  async handleRequest(req, res, operation, errorMessage, options = {}) {
    const startTime = Date.now();
    const requestId = req.requestId || 'unknown';
    
    try {
      this.logger.debug(`${this.controllerName}: Starting operation`, {
        requestId,
        method: req.method,
        url: req.url,
        userId: req.user?.id || 'anonymous'
      });

      const result = await operation(req, res);
      
      const duration = Date.now() - startTime;
      this.logger.debug(`${this.controllerName}: Operation completed`, {
        requestId,
        duration: `${duration}ms`,
        success: true
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`${this.controllerName}: Operation failed`, {
        requestId,
        duration: `${duration}ms`,
        error: error.message,
        stack: error.stack,
        method: req.method,
        url: req.url,
        userId: req.user?.id || 'anonymous'
      });

      // If response is already sent, don't send another
      if (res.headersSent) {
        return;
      }

      // Handle specific error types
      if (error.name === 'ValidationError') {
        return ResponseHelper.validationError(res, error.details || [error.message]);
      }
      
      if (error.name === 'NotFoundError') {
        return ResponseHelper.notFound(res, error.message);
      }
      
      if (error.name === 'ConflictError') {
        return ResponseHelper.conflict(res, error.message);
      }
      
      if (error.name === 'PermissionError') {
        return ResponseHelper.forbidden(res, error.message);
      }

      // Default to internal server error
      return ResponseHelper.internalError(res, errorMessage || 'An unexpected error occurred');
    }
  }

  /**
   * Handle a request that returns a single resource
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} operation - Async function that returns a resource
   * @param {string} resourceName - Name of the resource for error messages
   * @returns {Promise<Object>} Express response
   */
  async handleSingleResource(req, res, operation, resourceName = 'Resource') {
    return this.handleRequest(req, res, async (req, res) => {
      const resource = await operation(req, res);
      
      if (!resource) {
        return ResponseHelper.notFound(res, `${resourceName} not found`);
      }
      
      return ResponseHelper.success(res, resource);
    }, `Failed to get ${resourceName.toLowerCase()}`);
  }

  /**
   * Handle a request that returns a list of resources with pagination
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} operation - Async function that returns paginated data
   * @param {string} resourceName - Name of the resource for error messages
   * @returns {Promise<Object>} Express response
   */
  async handlePaginatedList(req, res, operation, resourceName = 'Resources') {
    return this.handleRequest(req, res, async (req, res) => {
      const result = await operation(req, res);
      
      if (result.pagination) {
        return ResponseHelper.successWithPagination(res, result.data, result.pagination);
      } else if (Array.isArray(result)) {
        return ResponseHelper.successWithCount(res, result);
      } else {
        return ResponseHelper.success(res, result);
      }
    }, `Failed to get ${resourceName.toLowerCase()}`);
  }

  /**
   * Handle a request that creates a resource
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} operation - Async function that creates a resource
   * @param {string} resourceName - Name of the resource for error messages
   * @param {string} successMessage - Success message
   * @returns {Promise<Object>} Express response
   */
  async handleCreate(req, res, operation, resourceName = 'Resource', successMessage = null) {
    return this.handleRequest(req, res, async (req, res) => {
      const resource = await operation(req, res);
      
      const message = successMessage || `${resourceName} created successfully`;
      return ResponseHelper.created(res, resource, message);
    }, `Failed to create ${resourceName.toLowerCase()}`);
  }

  /**
   * Handle a request that updates a resource
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} operation - Async function that updates a resource
   * @param {string} resourceName - Name of the resource for error messages
   * @param {string} successMessage - Success message
   * @returns {Promise<Object>} Express response
   */
  async handleUpdate(req, res, operation, resourceName = 'Resource', successMessage = null) {
    return this.handleRequest(req, res, async (req, res) => {
      const resource = await operation(req, res);
      
      if (!resource) {
        return ResponseHelper.notFound(res, `${resourceName} not found`);
      }
      
      const message = successMessage || `${resourceName} updated successfully`;
      return ResponseHelper.success(res, resource, { message });
    }, `Failed to update ${resourceName.toLowerCase()}`);
  }

  /**
   * Handle a request that deletes a resource
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} operation - Async function that deletes a resource
   * @param {string} resourceName - Name of the resource for error messages
   * @param {string} successMessage - Success message
   * @returns {Promise<Object>} Express response
   */
  async handleDelete(req, res, operation, resourceName = 'Resource', successMessage = null) {
    return this.handleRequest(req, res, async (req, res) => {
      const success = await operation(req, res);
      
      if (!success) {
        return ResponseHelper.notFound(res, `${resourceName} not found`);
      }
      
      const message = successMessage || `${resourceName} deleted successfully`;
      return ResponseHelper.success(res, null, { message });
    }, `Failed to delete ${resourceName.toLowerCase()}`);
  }

  /**
   * Handle a request that performs an action on a resource
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} operation - Async function that performs an action
   * @param {string} actionName - Name of the action for error messages
   * @param {string} successMessage - Success message
   * @returns {Promise<Object>} Express response
   */
  async handleAction(req, res, operation, actionName = 'Action', successMessage = null) {
    return this.handleRequest(req, res, async (req, res) => {
      const result = await operation(req, res);
      
      if (result === false || result === null) {
        return ResponseHelper.notFound(res, `${actionName} failed - resource not found`);
      }
      
      const message = successMessage || `${actionName} completed successfully`;
      return ResponseHelper.success(res, result, { message });
    }, `Failed to perform ${actionName.toLowerCase()}`);
  }

  /**
   * Validate required parameters in request
   * @param {Object} req - Express request object
   * @param {Array} requiredParams - Array of required parameter names
   * @throws {ValidationError} If required parameters are missing
   */
  validateRequiredParams(req, requiredParams) {
    const missing = requiredParams.filter(param => {
      const value = req.params[param] || req.body[param] || req.query[param];
      return value === undefined || value === null || value === '';
    });

    if (missing.length > 0) {
      const error = new Error(`Missing required parameters: ${missing.join(', ')}`);
      error.name = 'ValidationError';
      throw error;
    }
  }

  /**
   * Validate parameter types
   * @param {Object} req - Express request object
   * @param {Object} paramTypes - Object mapping parameter names to expected types
   * @throws {ValidationError} If parameter types are invalid
   */
  validateParamTypes(req, paramTypes) {
    for (const [param, expectedType] of Object.entries(paramTypes)) {
      const value = req.params[param] || req.body[param] || req.query[param];
      
      if (value !== undefined && typeof value !== expectedType) {
        const error = new Error(`Invalid type for parameter ${param}: expected ${expectedType}, got ${typeof value}`);
        error.name = 'ValidationError';
        throw error;
      }
    }
  }

  /**
   * Extract pagination parameters from request
   * @param {Object} req - Express request object
   * @returns {Object} Pagination parameters
   */
  extractPaginationParams(req) {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    
    return { page, limit };
  }

  /**
   * Extract filter parameters from request
   * @param {Object} req - Express request object
   * @param {Array} allowedFilters - Array of allowed filter parameter names
   * @returns {Object} Filter parameters
   */
  extractFilterParams(req, allowedFilters = []) {
    const filters = {};
    
    allowedFilters.forEach(filter => {
      if (req.query[filter] !== undefined) {
        filters[filter] = req.query[filter];
      }
    });
    
    return filters;
  }
}

module.exports = BaseController;