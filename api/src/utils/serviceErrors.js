/**
 * Custom Error Classes for Service Layer
 *
 * Provides standardized error handling across all services with
 * proper error categorization, context, and logging integration.
 */

/**
 * Base Service Error - Parent class for all service errors
 */
class ServiceError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = this.constructor.name;
    this.category = options.category || "SERVICE_ERROR";
    this.statusCode = options.statusCode || 500;
    this.context = options.context || {};
    this.retryable = options.retryable || false;
    this.timestamp = new Date().toISOString();

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to JSON for logging and API responses
   * @returns {Object} JSON representation of error
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      category: this.category,
      statusCode: this.statusCode,
      context: this.context,
      retryable: this.retryable,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }

  /**
   * Get safe error info for API responses (excludes sensitive data)
   * @returns {Object} Safe error info
   */
  toSafeJSON() {
    return {
      name: this.name,
      message: this.message,
      category: this.category,
      statusCode: this.statusCode,
      retryable: this.retryable,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Validation Error - For input validation failures
 */
class ValidationError extends ServiceError {
  constructor(message, field = null, value = null) {
    super(message, {
      category: "VALIDATION_ERROR",
      statusCode: 400,
      context: { field, value },
      retryable: false,
    });
  }
}

/**
 * Not Found Error - For resource not found scenarios
 */
class NotFoundError extends ServiceError {
  constructor(resource, identifier = null) {
    const message = identifier
      ? `${resource} not found: ${identifier}`
      : `${resource} not found`;

    super(message, {
      category: "NOT_FOUND",
      statusCode: 404,
      context: { resource, identifier },
      retryable: false,
    });
  }
}

/**
 * External Service Error - For external service failures
 */
class ExternalServiceError extends ServiceError {
  constructor(service, operation, originalError = null) {
    const message = `${service} service failed during ${operation}`;

    super(message, {
      category: "EXTERNAL_SERVICE_ERROR",
      statusCode: 503,
      context: {
        service,
        operation,
        originalError: originalError?.message,
      },
      retryable: true,
    });

    if (originalError) {
      this.originalError = originalError;
    }
  }
}

/**
 * Command Execution Error - For command/process execution failures
 */
class CommandExecutionError extends ServiceError {
  constructor(command, exitCode = null, stdout = "", stderr = "") {
    const message = exitCode
      ? `Command failed with exit code ${exitCode}: ${command}`
      : `Command execution failed: ${command}`;

    super(message, {
      category: "COMMAND_EXECUTION_ERROR",
      statusCode: 500,
      context: {
        command,
        exitCode,
        stdout: stdout.slice(0, 500), // Limit output length
        stderr: stderr.slice(0, 500),
      },
      retryable: false,
    });
  }
}

/**
 * Resource Conflict Error - For resource conflicts (already exists, etc.)
 */
class ConflictError extends ServiceError {
  constructor(resource, reason = "Resource conflict") {
    super(`${reason}: ${resource}`, {
      category: "CONFLICT_ERROR",
      statusCode: 409,
      context: { resource, reason },
      retryable: false,
    });
  }
}

/**
 * Permission Error - For permission/authorization failures
 */
class PermissionError extends ServiceError {
  constructor(operation, resource = null) {
    const message = resource
      ? `Permission denied for ${operation} on ${resource}`
      : `Permission denied for ${operation}`;

    super(message, {
      category: "PERMISSION_ERROR",
      statusCode: 403,
      context: { operation, resource },
      retryable: false,
    });
  }
}

/**
 * Timeout Error - For operation timeouts
 */
class TimeoutError extends ServiceError {
  constructor(operation, timeout) {
    super(`Operation timed out after ${timeout}ms: ${operation}`, {
      category: "TIMEOUT_ERROR",
      statusCode: 408,
      context: { operation, timeout },
      retryable: true,
    });
  }
}

/**
 * Rate Limit Error - For rate limiting scenarios
 */
class RateLimitError extends ServiceError {
  constructor(limit, window, retryAfter = null) {
    super(`Rate limit exceeded: ${limit} requests per ${window}`, {
      category: "RATE_LIMIT_ERROR",
      statusCode: 429,
      context: { limit, window, retryAfter },
      retryable: true,
    });
  }
}

/**
 * Error Factory - Helper to create appropriate error types
 */
class ErrorFactory {
  /**
   * Create error from generic error object
   * @param {Error} error - Original error
   * @param {Object} context - Additional context
   * @returns {ServiceError} Appropriate service error
   */
  static fromError(error, context = {}) {
    if (error instanceof ServiceError) {
      return error;
    }

    // Map common error patterns to specific error types
    if (error.code === "ENOENT") {
      return new NotFoundError("File or directory", error.path);
    }

    if (error.code === "EACCES" || error.code === "EPERM") {
      return new PermissionError("file access", error.path);
    }

    if (error.code === "ETIMEDOUT" || error.message.includes("timeout")) {
      return new TimeoutError(
        context.operation || "operation",
        context.timeout || 30000
      );
    }

    // Default to generic service error
    return new ServiceError(error.message, {
      category: "UNKNOWN_ERROR",
      statusCode: 500,
      context: {
        originalCode: error.code,
        originalName: error.name,
        ...context,
      },
      retryable: false,
    });
  }

  /**
   * Create validation error with field details
   * @param {string} message - Error message
   * @param {string} field - Field name
   * @param {any} value - Field value
   * @returns {ValidationError}
   */
  static validation(message, field, value) {
    return new ValidationError(message, field, value);
  }

  /**
   * Create not found error
   * @param {string} resource - Resource type
   * @param {string} identifier - Resource identifier
   * @returns {NotFoundError}
   */
  static notFound(resource, identifier) {
    return new NotFoundError(resource, identifier);
  }

  /**
   * Create external service error
   * @param {string} service - Service name
   * @param {string} operation - Operation name
   * @param {Error} originalError - Original error
   * @returns {ExternalServiceError}
   */
  static externalService(service, operation, originalError) {
    return new ExternalServiceError(service, operation, originalError);
  }

  /**
   * Create command execution error
   * @param {string} command - Command that failed
   * @param {number} exitCode - Exit code
   * @param {string} stdout - Standard output
   * @param {string} stderr - Standard error
   * @returns {CommandExecutionError}
   */
  static commandExecution(command, exitCode, stdout, stderr) {
    return new CommandExecutionError(command, exitCode, stdout, stderr);
  }
}

module.exports = {
  ServiceError,
  ValidationError,
  NotFoundError,
  ExternalServiceError,
  CommandExecutionError,
  ConflictError,
  PermissionError,
  TimeoutError,
  RateLimitError,
  ErrorFactory,
};
