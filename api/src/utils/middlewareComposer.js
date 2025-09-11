const AuthMiddleware = require("../middleware/auth");
const ValidationMiddleware = require("../middleware/validation");
const ResponseHelper = require("./responseHelper");

/**
 * MiddlewareComposer - Utility for composing common middleware patterns
 *
 * Provides pre-configured middleware chains for common authentication,
 * validation, and response patterns to reduce boilerplate code.
 */
class MiddlewareComposer {
  /**
   * Admin-only route middleware chain
   * @param {...Function} additionalMiddleware - Additional middleware to include
   * @returns {Array} Array of middleware functions
   */
  static admin(...additionalMiddleware) {
    return [
      AuthMiddleware.verifyToken,
      AuthMiddleware.requireRole("admin"),
      ...additionalMiddleware,
    ];
  }

  /**
   * Authenticated user route middleware chain
   * @param {...Function} additionalMiddleware - Additional middleware to include
   * @returns {Array} Array of middleware functions
   */
  static user(...additionalMiddleware) {
    return [AuthMiddleware.verifyToken, ...additionalMiddleware];
  }

  /**
   * Optional authentication middleware chain
   * @param {...Function} additionalMiddleware - Additional middleware to include
   * @returns {Array} Array of middleware functions
   */
  static optionalAuth(...additionalMiddleware) {
    return [AuthMiddleware.optionalAuth, ...additionalMiddleware];
  }

  /**
   * Role-based authentication middleware chain
   * @param {string} role - Required role
   * @param {...Function} additionalMiddleware - Additional middleware to include
   * @returns {Array} Array of middleware functions
   */
  static role(role, ...additionalMiddleware) {
    return [
      AuthMiddleware.verifyToken,
      AuthMiddleware.requireRole(role),
      ...additionalMiddleware,
    ];
  }

  /**
   * Resource ownership middleware chain
   * @param {string} paramName - Parameter name to check ownership for
   * @param {...Function} additionalMiddleware - Additional middleware to include
   * @returns {Array} Array of middleware functions
   */
  static ownership(paramName, ...additionalMiddleware) {
    return [
      AuthMiddleware.verifyToken,
      AuthMiddleware.requireOwnership(paramName),
      ...additionalMiddleware,
    ];
  }

  /**
   * Body validation middleware
   * @param {Joi.Schema} schema - Joi validation schema
   * @returns {Function} Validation middleware function
   */
  static validateBody(schema) {
    return ValidationMiddleware.validateBody(schema);
  }

  /**
   * Parameters validation middleware
   * @param {Joi.Schema} schema - Joi validation schema
   * @returns {Function} Validation middleware function
   */
  static validateParams(schema) {
    return ValidationMiddleware.validateParams(schema);
  }

  /**
   * Query validation middleware
   * @param {Joi.Schema} schema - Joi validation schema
   * @returns {Function} Validation middleware function
   */
  static validateQuery(schema) {
    return ValidationMiddleware.validateQuery(schema);
  }

  /**
   * Input sanitization middleware
   * @returns {Function} Sanitization middleware function
   */
  static sanitize() {
    return ValidationMiddleware.sanitizeInput;
  }

  /**
   * Authentication with body validation middleware chain
   * @param {Joi.Schema} schema - Joi validation schema for body
   * @param {string} role - Required role (optional)
   * @returns {Array} Array of middleware functions
   */
  static authWithBodyValidation(schema, role = null) {
    const middleware = [
      AuthMiddleware.verifyToken,
      ValidationMiddleware.sanitizeInput,
      ValidationMiddleware.validateBody(schema),
    ];

    if (role) {
      middleware.splice(1, 0, AuthMiddleware.requireRole(role));
    }

    return middleware;
  }

  /**
   * Authentication with parameter validation middleware chain
   * @param {Joi.Schema} schema - Joi validation schema for parameters
   * @param {string} role - Required role (optional)
   * @returns {Array} Array of middleware functions
   */
  static authWithParamValidation(schema, role = null) {
    const middleware = [
      AuthMiddleware.verifyToken,
      ValidationMiddleware.validateParams(schema),
    ];

    if (role) {
      middleware.splice(1, 0, AuthMiddleware.requireRole(role));
    }

    return middleware;
  }

  /**
   * Authentication with query validation middleware chain
   * @param {Joi.Schema} schema - Joi validation schema for query
   * @param {string} role - Required role (optional)
   * @returns {Array} Array of middleware functions
   */
  static authWithQueryValidation(schema, role = null) {
    const middleware = [
      AuthMiddleware.verifyToken,
      ValidationMiddleware.validateQuery(schema),
    ];

    if (role) {
      middleware.splice(1, 0, AuthMiddleware.requireRole(role));
    }

    return middleware;
  }

  /**
   * Full CRUD operation middleware chain
   * @param {Object} schemas - Object containing validation schemas
   * @param {Joi.Schema} schemas.body - Body validation schema
   * @param {Joi.Schema} schemas.params - Parameters validation schema
   * @param {string} role - Required role
   * @returns {Array} Array of middleware functions
   */
  static crudOperation(schemas, role = "admin") {
    const middleware = [
      AuthMiddleware.verifyToken,
      AuthMiddleware.requireRole(role),
      ValidationMiddleware.sanitizeInput,
    ];

    if (schemas.params) {
      middleware.push(ValidationMiddleware.validateParams(schemas.params));
    }

    if (schemas.body) {
      middleware.push(ValidationMiddleware.validateBody(schemas.body));
    }

    if (schemas.query) {
      middleware.push(ValidationMiddleware.validateQuery(schemas.query));
    }

    return middleware;
  }

  /**
   * Rate-limited authentication middleware chain
   * @param {string} role - Required role (optional)
   * @returns {Array} Array of middleware functions
   */
  static rateLimitedAuth(role = null) {
    const middleware = [
      AuthMiddleware.authRateLimit,
      AuthMiddleware.recordAuthAttempt,
      AuthMiddleware.verifyToken,
    ];

    if (role) {
      middleware.push(AuthMiddleware.requireRole(role));
    }

    return middleware;
  }

  /**
   * Public endpoint with optional rate limiting
   * @param {boolean} rateLimit - Whether to apply rate limiting
   * @returns {Array} Array of middleware functions
   */
  static public(rateLimit = false) {
    return rateLimit ? [AuthMiddleware.authRateLimit] : [];
  }

  /**
   * Create a route handler with standardized error handling
   * @param {Function} handler - Route handler function
   * @returns {Function} Wrapped route handler
   */
  static handler(handler) {
    return ResponseHelper.asyncHandler(handler);
  }

  /**
   * Create a complete route configuration
   * @param {Object} config - Route configuration
   * @param {Array} config.middleware - Middleware array
   * @param {Function} config.handler - Route handler function
   * @returns {Array} Complete middleware chain with handler
   */
  static route(config) {
    const { middleware = [], handler } = config;
    return [...middleware, ResponseHelper.asyncHandler(handler)];
  }

  /**
   * Standard GET route for collections with authentication and pagination
   * @param {Function} handler - Route handler function
   * @param {string} role - Required role
   * @param {Joi.Schema} querySchema - Query validation schema
   * @returns {Array} Complete middleware chain
   */
  static getCollection(handler, role = "user", querySchema = null) {
    const middleware = [AuthMiddleware.verifyToken];

    if (role) {
      middleware.push(AuthMiddleware.requireRole(role));
    }

    if (querySchema) {
      middleware.push(ValidationMiddleware.validateQuery(querySchema));
    }

    middleware.push(ResponseHelper.asyncHandler(handler));
    return middleware;
  }

  /**
   * Standard GET route for single resources with authentication
   * @param {Function} handler - Route handler function
   * @param {Joi.Schema} paramSchema - Parameter validation schema
   * @param {string} role - Required role
   * @returns {Array} Complete middleware chain
   */
  static getResource(handler, paramSchema, role = "user") {
    const middleware = [
      AuthMiddleware.verifyToken,
      ValidationMiddleware.validateParams(paramSchema),
    ];

    if (role) {
      middleware.push(AuthMiddleware.requireRole(role));
    }

    middleware.push(ResponseHelper.asyncHandler(handler));
    return middleware;
  }

  /**
   * Standard POST route for resource creation
   * @param {Function} handler - Route handler function
   * @param {Joi.Schema} bodySchema - Body validation schema
   * @param {string} role - Required role
   * @returns {Array} Complete middleware chain
   */
  static createResource(handler, bodySchema, role = "admin") {
    return [
      AuthMiddleware.verifyToken,
      AuthMiddleware.requireRole(role),
      ValidationMiddleware.sanitizeInput,
      ValidationMiddleware.validateBody(bodySchema),
      ResponseHelper.asyncHandler(handler),
    ];
  }

  /**
   * Standard PUT route for resource updates
   * @param {Function} handler - Route handler function
   * @param {Joi.Schema} paramSchema - Parameter validation schema
   * @param {Joi.Schema} bodySchema - Body validation schema
   * @param {string} role - Required role
   * @returns {Array} Complete middleware chain
   */
  static updateResource(handler, paramSchema, bodySchema, role = "admin") {
    return [
      AuthMiddleware.verifyToken,
      AuthMiddleware.requireRole(role),
      ValidationMiddleware.validateParams(paramSchema),
      ValidationMiddleware.sanitizeInput,
      ValidationMiddleware.validateBody(bodySchema),
      ResponseHelper.asyncHandler(handler),
    ];
  }

  /**
   * Standard DELETE route for resource deletion
   * @param {Function} handler - Route handler function
   * @param {Joi.Schema} paramSchema - Parameter validation schema
   * @param {string} role - Required role
   * @returns {Array} Complete middleware chain
   */
  static deleteResource(handler, paramSchema, role = "admin") {
    return [
      AuthMiddleware.verifyToken,
      AuthMiddleware.requireRole(role),
      ValidationMiddleware.validateParams(paramSchema),
      ResponseHelper.asyncHandler(handler),
    ];
  }

  /**
   * Authentication route with rate limiting and validation
   * @param {Function} handler - Route handler function
   * @param {Joi.Schema} bodySchema - Body validation schema
   * @returns {Array} Complete middleware chain
   */
  static authRoute(handler, bodySchema) {
    return [
      AuthMiddleware.authRateLimit,
      AuthMiddleware.recordAuthAttempt,
      ValidationMiddleware.sanitizeInput,
      ValidationMiddleware.validateBody(bodySchema),
      ResponseHelper.asyncHandler(handler),
    ];
  }

  /**
   * Combine multiple middleware arrays
   * @param {...Array} middlewareArrays - Arrays of middleware to combine
   * @returns {Array} Combined middleware array
   */
  static combine(...middlewareArrays) {
    return middlewareArrays.flat();
  }
}

module.exports = MiddlewareComposer;
