/**
 * Modern Database Error Classes
 * Provides specific error types for better error handling
 */

class DatabaseError extends Error {
  constructor(message, code = 'DATABASE_ERROR', statusCode = 500) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
  }
}

class ConnectionError extends DatabaseError {
  constructor(message = 'Database connection failed') {
    super(message, 'CONNECTION_ERROR', 503);
    this.name = 'ConnectionError';
  }
}

class ValidationError extends DatabaseError {
  constructor(message = 'Database validation failed', field = null) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
    this.field = field;
  }
}

class NotFoundError extends DatabaseError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

class DuplicateKeyError extends DatabaseError {
  constructor(field = 'field') {
    super(`Duplicate ${field}`, 'DUPLICATE_KEY', 409);
    this.name = 'DuplicateKeyError';
    this.field = field;
  }
}

class QueryError extends DatabaseError {
  constructor(message = 'Database query failed') {
    super(message, 'QUERY_ERROR', 500);
    this.name = 'QueryError';
  }
}

class TransactionError extends DatabaseError {
  constructor(message = 'Database transaction failed') {
    super(message, 'TRANSACTION_ERROR', 500);
    this.name = 'TransactionError';
  }
}

/**
 * Error handler for MongoDB/Mongoose errors
 */
class DatabaseErrorHandler {
  /**
   * Handle Mongoose validation errors
   */
  static handleValidationError(error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));
      
      return new ValidationError('Validation failed', errors);
    }
    return error;
  }

  /**
   * Handle Mongoose duplicate key errors
   */
  static handleDuplicateKeyError(error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return new DuplicateKeyError(field);
    }
    return error;
  }

  /**
   * Handle Mongoose cast errors
   */
  static handleCastError(error) {
    if (error.name === 'CastError') {
      return new ValidationError(`Invalid ${error.path}: ${error.value}`);
    }
    return error;
  }

  /**
   * Handle connection errors
   */
  static handleConnectionError(error) {
    if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
      return new ConnectionError(error.message);
    }
    return error;
  }

  /**
   * Generic error handler
   */
  static handleError(error) {
    // Handle specific Mongoose errors
    if (error.name === 'ValidationError') {
      return this.handleValidationError(error);
    }
    
    if (error.code === 11000) {
      return this.handleDuplicateKeyError(error);
    }
    
    if (error.name === 'CastError') {
      return this.handleCastError(error);
    }
    
    if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
      return this.handleConnectionError(error);
    }
    
    // Return original error if not handled
    return error;
  }

  /**
   * Check if error is a database error
   */
  static isDatabaseError(error) {
    return error instanceof DatabaseError || 
           error.name === 'ValidationError' ||
           error.name === 'CastError' ||
           error.code === 11000 ||
           error.name === 'MongoNetworkError' ||
           error.name === 'MongoTimeoutError';
  }
}

module.exports = {
  DatabaseError,
  ConnectionError,
  ValidationError,
  NotFoundError,
  DuplicateKeyError,
  QueryError,
  TransactionError,
  DatabaseErrorHandler
};