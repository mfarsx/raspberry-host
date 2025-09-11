const { logger } = require("../config/logger");

/**
 * ResponseHelper - Standardized API response utility
 *
 * Provides consistent response formats across all API endpoints
 * and eliminates duplicated response code patterns.
 */
class ResponseHelper {
  /**
   * Send a successful response with data
   * @param {Object} res - Express response object
   * @param {any} data - Response data
   * @param {Object} meta - Additional metadata (count, pagination, etc.)
   * @returns {Object} Express response
   */
  static success(res, data, meta = {}) {
    const response = {
      success: true,
      data,
      ...meta,
      timestamp: new Date().toISOString(),
    };

    logger.debug("Sending success response", {
      dataType: typeof data,
      hasData: data !== null && data !== undefined,
      meta: Object.keys(meta),
    });

    return res.json(response);
  }

  /**
   * Send a successful response with data and count
   * @param {Object} res - Express response object
   * @param {Array} data - Array data to return
   * @returns {Object} Express response
   */
  static successWithCount(res, data) {
    if (!Array.isArray(data)) {
      logger.warn("successWithCount called with non-array data", {
        dataType: typeof data,
      });
    }

    return ResponseHelper.success(res, data, {
      count: Array.isArray(data) ? data.length : 0,
    });
  }

  /**
   * Send a successful response with pagination metadata
   * @param {Object} res - Express response object
   * @param {Array} data - Paginated data
   * @param {Object} pagination - Pagination info (page, limit, total, pages)
   * @returns {Object} Express response
   */
  static successWithPagination(res, data, pagination) {
    const paginationMeta = {
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        total: pagination.total || 0,
        pages: pagination.pages || 0,
        ...pagination,
      },
    };

    return ResponseHelper.success(res, data, paginationMeta);
  }

  /**
   * Send an error response
   * @param {Object} res - Express response object
   * @param {number} statusCode - HTTP status code
   * @param {string|Error} error - Error message or Error object
   * @param {string} category - Error category for client handling
   * @param {Object} details - Additional error details
   * @returns {Object} Express response
   */
  static error(
    res,
    statusCode,
    error,
    category = "GENERAL_ERROR",
    details = null
  ) {
    const errorMessage = typeof error === "string" ? error : error.message;

    const response = {
      success: false,
      error: errorMessage,
      category,
      timestamp: new Date().toISOString(),
      requestId: res.locals?.requestId || "unknown",
    };

    if (details) {
      response.details = details;
    }

    logger.warn("Sending error response", {
      statusCode,
      category,
      error: errorMessage,
      hasDetails: !!details,
    });

    return res.status(statusCode).json(response);
  }

  /**
   * Send a 404 Not Found response
   * @param {Object} res - Express response object
   * @param {string} resource - Resource type that was not found
   * @returns {Object} Express response
   */
  static notFound(res, resource = "Resource") {
    return ResponseHelper.error(res, 404, `${resource} not found`, "NOT_FOUND");
  }

  /**
   * Send a 500 Internal Server Error response
   * @param {Object} res - Express response object
   * @param {string|Error} error - Error message or Error object
   * @param {string} context - Additional context about the error
   * @returns {Object} Express response
   */
  static serverError(res, error, context = "") {
    const errorMessage = typeof error === "string" ? error : error.message;
    const fullMessage = `Internal server error${context ? ": " + context : ""}`;

    logger.error("Server error response", {
      error: errorMessage,
      context,
      stack: error?.stack,
    });

    return ResponseHelper.error(res, 500, fullMessage, "INTERNAL_ERROR");
  }

  /**
   * Send a 201 Created response
   * @param {Object} res - Express response object
   * @param {any} data - Created resource data
   * @param {string} message - Success message
   * @returns {Object} Express response
   */
  static created(res, data, message = "Resource created successfully") {
    const response = {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    };

    logger.info("Sending created response", {
      message,
      hasData: data !== null && data !== undefined,
    });

    return res.status(201).json(response);
  }

  /**
   * Send a 204 No Content response
   * @param {Object} res - Express response object
   * @returns {Object} Express response
   */
  static noContent(res) {
    logger.debug("Sending no content response");
    return res.status(204).send();
  }

  /**
   * Send a 400 Bad Request response
   * @param {Object} res - Express response object
   * @param {string|Error} error - Error message or Error object
   * @param {Object} details - Validation details or additional info
   * @returns {Object} Express response
   */
  static badRequest(res, error, details = null) {
    return ResponseHelper.error(res, 400, error, "BAD_REQUEST", details);
  }

  /**
   * Send a 401 Unauthorized response
   * @param {Object} res - Express response object
   * @param {string} message - Unauthorized message
   * @returns {Object} Express response
   */
  static unauthorized(res, message = "Unauthorized access") {
    return ResponseHelper.error(res, 401, message, "UNAUTHORIZED");
  }

  /**
   * Send a 403 Forbidden response
   * @param {Object} res - Express response object
   * @param {string} message - Forbidden message
   * @returns {Object} Express response
   */
  static forbidden(res, message = "Access forbidden") {
    return ResponseHelper.error(res, 403, message, "FORBIDDEN");
  }

  /**
   * Send a 409 Conflict response
   * @param {Object} res - Express response object
   * @param {string} message - Conflict message
   * @returns {Object} Express response
   */
  static conflict(res, message = "Resource conflict") {
    return ResponseHelper.error(res, 409, message, "CONFLICT");
  }

  /**
   * Send a 429 Too Many Requests response
   * @param {Object} res - Express response object
   * @param {string} message - Rate limit message
   * @param {string} retryAfter - Retry after duration
   * @returns {Object} Express response
   */
  static tooManyRequests(
    res,
    message = "Too many requests",
    retryAfter = "15 minutes"
  ) {
    return ResponseHelper.error(res, 429, message, "RATE_LIMIT_ERROR", {
      retryAfter,
    });
  }

  /**
   * Send a validation error response
   * @param {Object} res - Express response object
   * @param {Array} validationErrors - Array of validation error details
   * @returns {Object} Express response
   */
  static validationError(res, validationErrors) {
    return ResponseHelper.error(
      res,
      400,
      "Validation failed",
      "VALIDATION_ERROR",
      { errors: validationErrors }
    );
  }

  /**
   * Wrap an async route handler with standardized error handling
   * @param {Function} handler - Async route handler function
   * @returns {Function} Wrapped handler
   */
  static asyncHandler(handler) {
    return async (req, res, next) => {
      try {
        await handler(req, res, next);
      } catch (error) {
        logger.error("Async handler error:", {
          error: error.message,
          stack: error.stack,
          url: req.url,
          method: req.method,
        });

        // If response is already sent, don't send another
        if (res.headersSent) {
          return next(error);
        }

        // Send standardized error response
        ResponseHelper.serverError(res, error, "Route handler failed");
      }
    };
  }
}

module.exports = ResponseHelper;
