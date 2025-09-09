const { errorHandler, createError, asyncHandler } = require('../../middleware/errorHandler');
const { logger } = require('../../config/logger');

// Mock logger
jest.mock('../../config/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('Error Handler Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = global.testUtils.createMockRequest();
    res = global.testUtils.createMockResponse();
    next = global.testUtils.createMockNext();
    
    // Clear mocks
    jest.clearAllMocks();
  });

  describe('errorHandler', () => {
    it('should handle ValidationError correctly', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation Error',
        category: 'VALIDATION_ERROR',
        timestamp: expect.any(String),
        requestId: 'test-request-id'
      });
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should handle JsonWebTokenError correctly', () => {
      const error = new Error('Invalid token');
      error.name = 'JsonWebTokenError';

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid token',
        category: 'AUTH_ERROR',
        timestamp: expect.any(String),
        requestId: 'test-request-id'
      });
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should handle network errors correctly', () => {
      const error = new Error('Connection refused');
      error.name = 'ECONNREFUSED';

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Service unavailable',
        category: 'NETWORK_ERROR',
        timestamp: expect.any(String),
        requestId: 'test-request-id',
        retryable: true,
        retryAfter: '30 seconds'
      });
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should handle unknown errors as internal errors', () => {
      const error = new Error('Unknown error');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Unknown error',
        category: 'INTERNAL_ERROR',
        timestamp: expect.any(String),
        requestId: 'test-request-id'
      });
      expect(logger.error).toHaveBeenCalled();
    });

    it('should include user information in error context', () => {
      req.user = { id: 'user123' };
      const error = new Error('Test error');

      errorHandler(error, req, res, next);

      expect(logger.error).toHaveBeenCalledWith(
        'System error occurred:',
        expect.objectContaining({
          userId: 'user123'
        })
      );
    });
  });

  describe('createError', () => {
    it('should create an operational error with status code', () => {
      const error = createError('Test error', 400);

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
    });

    it('should default to 500 status code', () => {
      const error = createError('Test error');

      expect(error.statusCode).toBe(500);
    });
  });

  describe('asyncHandler', () => {
    it('should catch async errors and pass them to next', async () => {
      const asyncFunction = jest.fn().mockRejectedValue(new Error('Async error'));
      const wrappedFunction = asyncHandler(asyncFunction);

      await wrappedFunction(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should pass through successful async functions', async () => {
      const asyncFunction = jest.fn().mockResolvedValue('success');
      const wrappedFunction = asyncHandler(asyncFunction);

      await wrappedFunction(req, res, next);

      expect(asyncFunction).toHaveBeenCalledWith(req, res, next);
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle synchronous errors', () => {
      const syncFunction = jest.fn().mockImplementation(() => {
        throw new Error('Sync error');
      });
      const wrappedFunction = asyncHandler(syncFunction);

      wrappedFunction(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});