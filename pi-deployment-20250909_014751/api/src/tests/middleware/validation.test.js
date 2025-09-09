const Joi = require('joi');
const ValidationMiddleware = require('../../middleware/validation');

describe('Validation Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
  });

  describe('validateBody', () => {
    const testSchema = Joi.object({
      name: Joi.string().required(),
      email: Joi.string().email().required(),
      age: Joi.number().min(18).optional()
    });

    it('should pass valid data', () => {
      req.body = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25
      };

      const middleware = ValidationMiddleware.validateBody(testSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(req.body).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
        age: 25
      });
    });

    it('should reject invalid data', () => {
      req.body = {
        name: 'John Doe',
        email: 'invalid-email',
        age: 15
      };

      const middleware = ValidationMiddleware.validateBody(testSchema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
            message: expect.stringContaining('valid email')
          }),
          expect.objectContaining({
            field: 'age',
            message: expect.stringContaining('18')
          })
        ])
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should strip unknown fields', () => {
      req.body = {
        name: 'John Doe',
        email: 'john@example.com',
        unknownField: 'should be removed'
      };

      const middleware = ValidationMiddleware.validateBody(testSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.body).toEqual({
        name: 'John Doe',
        email: 'john@example.com'
      });
    });
  });

  describe('validateParams', () => {
    const testSchema = Joi.object({
      id: Joi.string().required(),
      type: Joi.string().valid('user', 'admin').optional()
    });

    it('should pass valid parameters', () => {
      req.params = {
        id: '123',
        type: 'user'
      };

      const middleware = ValidationMiddleware.validateParams(testSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject invalid parameters', () => {
      req.params = {
        id: '',
        type: 'invalid'
      };

      const middleware = ValidationMiddleware.validateParams(testSchema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid parameters',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'id',
            message: expect.stringContaining('required')
          }),
          expect.objectContaining({
            field: 'type',
            message: expect.stringContaining('valid')
          })
        ])
      });
    });
  });

  describe('validateQuery', () => {
    const testSchema = Joi.object({
      page: Joi.number().min(1).default(1),
      limit: Joi.number().min(1).max(100).default(10),
      search: Joi.string().optional()
    });

    it('should pass valid query parameters', () => {
      req.query = {
        page: '2',
        limit: '20',
        search: 'test'
      };

      const middleware = ValidationMiddleware.validateQuery(testSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(req.query).toEqual({
        page: 2,
        limit: 20,
        search: 'test'
      });
    });

    it('should apply defaults for missing parameters', () => {
      req.query = {};

      const middleware = ValidationMiddleware.validateQuery(testSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.query).toEqual({
        page: 1,
        limit: 10
      });
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize XSS attempts', () => {
      req.body = {
        name: '<script>alert("xss")</script>John',
        description: 'javascript:alert("xss")',
        onclick: 'onclick="alert(\'xss\')"'
      };

      ValidationMiddleware.sanitizeInput(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.body).toEqual({
        name: 'John',
        description: '',
        onclick: ''
      });
    });

    it('should handle nested objects', () => {
      req.body = {
        user: {
          name: '<script>alert("xss")</script>John',
          profile: {
            bio: 'javascript:alert("xss")'
          }
        },
        tags: ['<script>alert("xss")</script>tag1', 'normal-tag']
      };

      ValidationMiddleware.sanitizeInput(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.body).toEqual({
        user: {
          name: 'John',
          profile: {
            bio: ''
          }
        },
        tags: ['tag1', 'normal-tag']
      });
    });

    it('should handle non-object inputs gracefully', () => {
      req.body = null;
      req.query = undefined;
      req.params = 'string';

      ValidationMiddleware.sanitizeInput(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.body).toBeNull();
      expect(req.query).toBeUndefined();
      expect(req.params).toBe('string');
    });
  });
});