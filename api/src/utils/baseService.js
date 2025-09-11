const { logger } = require("../config/logger");
const { ErrorFactory } = require("./serviceErrors");
const { CommandExecutor } = require("./commandExecutor");

/**
 * BaseService - Abstract base class for all services
 *
 * Provides common functionality including logging, error handling,
 * metrics collection, and standardized patterns for all services.
 */
class BaseService {
  constructor(serviceName, dependencies = {}) {
    if (this.constructor === BaseService) {
      throw new Error("BaseService cannot be instantiated directly");
    }

    this.serviceName = serviceName;
    this.logger = dependencies.logger || logger;
    this.commandExecutor = dependencies.commandExecutor || CommandExecutor;

    // Service metrics
    this.metrics = {
      operationsCount: 0,
      errorsCount: 0,
      lastOperation: null,
      lastError: null,
      averageResponseTime: 0,
      operationTimes: [],
    };

    this.logger.info(`${this.serviceName} initialized`);
  }

  /**
   * Execute an operation with standardized logging and error handling
   * @param {string} operationName - Name of the operation
   * @param {Function} operation - Async function to execute
   * @param {Object} context - Additional context for logging
   * @returns {Promise<any>} Operation result
   */
  async executeOperation(operationName, operation, context = {}) {
    const startTime = Date.now();
    const operationId = this.generateOperationId();

    this.logger.info(`${this.serviceName}: Starting ${operationName}`, {
      operationId,
      context,
      timestamp: new Date().toISOString(),
    });

    try {
      const result = await operation();
      const duration = Date.now() - startTime;

      // Update metrics
      this.updateMetrics(operationName, duration, true);

      this.logger.info(`${this.serviceName}: Completed ${operationName}`, {
        operationId,
        duration: `${duration}ms`,
        success: true,
        timestamp: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Update metrics
      this.updateMetrics(operationName, duration, false);

      // Convert to service error if needed
      const serviceError = ErrorFactory.fromError(error, {
        service: this.serviceName,
        operation: operationName,
        operationId,
        ...context,
      });

      this.logger.error(`${this.serviceName}: Failed ${operationName}`, {
        operationId,
        duration: `${duration}ms`,
        error: serviceError.toJSON(),
        context,
        timestamp: new Date().toISOString(),
      });

      throw serviceError;
    }
  }

  /**
   * Execute a command using the CommandExecutor with service context
   * @param {string} command - Command to execute
   * @param {Array} args - Command arguments
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Command result
   */
  async executeCommand(command, args = [], options = {}) {
    const operationName = `command:${command}`;

    return this.executeOperation(
      operationName,
      async () => {
        return await this.commandExecutor.execute(command, args, {
          ...options,
          description: `${this.serviceName} ${command}`,
          logger: this.logger,
        });
      },
      { command, args }
    );
  }

  /**
   * Validate required parameters
   * @param {Object} params - Parameters to validate
   * @param {Array} required - Required parameter names
   * @throws {ValidationError} If validation fails
   */
  validateRequiredParams(params, required) {
    for (const param of required) {
      if (params[param] === undefined || params[param] === null) {
        throw ErrorFactory.validation(
          `Missing required parameter: ${param}`,
          param,
          params[param]
        );
      }
    }
  }

  /**
   * Validate parameter types
   * @param {Object} params - Parameters to validate
   * @param {Object} types - Parameter type definitions
   * @throws {ValidationError} If validation fails
   */
  validateParamTypes(params, types) {
    for (const [param, expectedType] of Object.entries(types)) {
      if (params[param] !== undefined) {
        const actualType = typeof params[param];
        if (actualType !== expectedType) {
          throw ErrorFactory.validation(
            `Invalid type for parameter ${param}: expected ${expectedType}, got ${actualType}`,
            param,
            params[param]
          );
        }
      }
    }
  }

  /**
   * Create a timeout promise
   * @param {number} ms - Timeout in milliseconds
   * @param {string} operation - Operation name for error
   * @returns {Promise} Timeout promise
   */
  createTimeout(ms, operation) {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(ErrorFactory.timeout(operation, ms));
      }, ms);
    });
  }

  /**
   * Execute operation with timeout
   * @param {Promise} promise - Promise to execute
   * @param {number} timeoutMs - Timeout in milliseconds
   * @param {string} operationName - Operation name
   * @returns {Promise} Promise that resolves/rejects with timeout
   */
  async withTimeout(promise, timeoutMs, operationName) {
    return Promise.race([
      promise,
      this.createTimeout(timeoutMs, operationName),
    ]);
  }

  /**
   * Retry operation with exponential backoff
   * @param {Function} operation - Async operation to retry
   * @param {Object} options - Retry options
   * @returns {Promise} Operation result
   */
  async retryOperation(operation, options = {}) {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      backoffFactor = 2,
      retryCondition = (error) => error.retryable,
    } = options;

    let lastError;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt > maxRetries || !retryCondition(error)) {
          throw error;
        }

        const delay = Math.min(
          baseDelay * Math.pow(backoffFactor, attempt - 1),
          maxDelay
        );

        this.logger.warn(
          `${this.serviceName}: Retry attempt ${attempt}/${maxRetries}`,
          {
            error: error.message,
            nextRetryIn: `${delay}ms`,
            timestamp: new Date().toISOString(),
          }
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Get service health status
   * @returns {Object} Health status
   */
  getHealthStatus() {
    const now = Date.now();
    const recentErrors = this.metrics.operationTimes
      .filter((op) => op.timestamp > now - 300000) // Last 5 minutes
      .filter((op) => !op.success).length;

    return {
      service: this.serviceName,
      status: recentErrors > 10 ? "unhealthy" : "healthy",
      metrics: {
        ...this.metrics,
        recentErrors,
        uptime: now - (this.startTime || now),
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get service metrics
   * @returns {Object} Service metrics
   */
  getMetrics() {
    return {
      service: this.serviceName,
      ...this.metrics,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Update service metrics
   * @private
   */
  updateMetrics(operationName, duration, success) {
    this.metrics.operationsCount++;
    this.metrics.lastOperation = {
      name: operationName,
      duration,
      success,
      timestamp: new Date().toISOString(),
    };

    if (!success) {
      this.metrics.errorsCount++;
      this.metrics.lastError = this.metrics.lastOperation;
    }

    // Update operation times (keep last 100)
    this.metrics.operationTimes.push({
      operation: operationName,
      duration,
      success,
      timestamp: Date.now(),
    });

    if (this.metrics.operationTimes.length > 100) {
      this.metrics.operationTimes = this.metrics.operationTimes.slice(-100);
    }

    // Calculate average response time
    const successfulOps = this.metrics.operationTimes.filter(
      (op) => op.success
    );
    if (successfulOps.length > 0) {
      this.metrics.averageResponseTime = Math.round(
        successfulOps.reduce((sum, op) => sum + op.duration, 0) /
          successfulOps.length
      );
    }
  }

  /**
   * Generate unique operation ID
   * @private
   */
  generateOperationId() {
    return `${this.serviceName}-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  }

  /**
   * Clean up resources (to be overridden by subclasses)
   */
  async cleanup() {
    this.logger.info(`${this.serviceName}: Cleaning up resources`);
  }
}

module.exports = BaseService;
