const BaseController = require('../utils/baseController');
const ResponseHelper = require('../utils/responseHelper');

// Mock Express request and response objects
const createMockReq = (params = {}, body = {}, query = {}, user = null) => ({
  params,
  body,
  query,
  user,
  method: 'GET',
  url: '/test',
  requestId: 'test-request-id'
});

const createMockRes = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    headersSent: false
  };
  return res;
};

// Test controller class
class TestController extends BaseController {
  constructor() {
    super('TestController');
  }
}

describe('BaseController', () => {
  let controller;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    controller = new TestController();
    mockReq = createMockReq();
    mockRes = createMockRes();
  });

  describe('Constructor', () => {
    test('should create controller with correct name', () => {
      expect(controller.controllerName).toBe('TestController');
    });

    test('should throw error when instantiated directly', () => {
      expect(() => new BaseController()).toThrow('BaseController cannot be instantiated directly');
    });
  });

  describe('handleRequest', () => {
    test('should handle successful operation', async () => {
      const operation = jest.fn().mockResolvedValue({ data: 'test' });
      
      await controller.handleRequest(mockReq, mockRes, operation, 'Test error');
      
      expect(operation).toHaveBeenCalledWith(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalled();
    });

    test('should handle operation error', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Test error'));
      
      await controller.handleRequest(mockReq, mockRes, operation, 'Operation failed');
      
      expect(operation).toHaveBeenCalledWith(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    test('should handle ValidationError', async () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      const operation = jest.fn().mockRejectedValue(error);
      
      await controller.handleRequest(mockReq, mockRes, operation, 'Validation failed');
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    test('should handle NotFoundError', async () => {
      const error = new Error('Resource not found');
      error.name = 'NotFoundError';
      const operation = jest.fn().mockRejectedValue(error);
      
      await controller.handleRequest(mockReq, mockRes, operation, 'Not found');
      
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    test('should handle ConflictError', async () => {
      const error = new Error('Resource conflict');
      error.name = 'ConflictError';
      const operation = jest.fn().mockRejectedValue(error);
      
      await controller.handleRequest(mockReq, mockRes, operation, 'Conflict');
      
      expect(mockRes.status).toHaveBeenCalledWith(409);
    });

    test('should handle PermissionError', async () => {
      const error = new Error('Permission denied');
      error.name = 'PermissionError';
      const operation = jest.fn().mockRejectedValue(error);
      
      await controller.handleRequest(mockReq, mockRes, operation, 'Permission denied');
      
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });

  describe('handleSingleResource', () => {
    test('should return resource when found', async () => {
      const resource = { id: 1, name: 'test' };
      const operation = jest.fn().mockResolvedValue(resource);
      
      await controller.handleSingleResource(mockReq, mockRes, operation, 'Resource');
      
      expect(mockRes.json).toHaveBeenCalled();
    });

    test('should return 404 when resource not found', async () => {
      const operation = jest.fn().mockResolvedValue(null);
      
      await controller.handleSingleResource(mockReq, mockRes, operation, 'Resource');
      
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('handlePaginatedList', () => {
    test('should handle paginated result', async () => {
      const result = {
        data: [{ id: 1 }, { id: 2 }],
        pagination: { page: 1, limit: 10, total: 2, pages: 1 }
      };
      const operation = jest.fn().mockResolvedValue(result);
      
      await controller.handlePaginatedList(mockReq, mockRes, operation, 'Resources');
      
      expect(mockRes.json).toHaveBeenCalled();
    });

    test('should handle array result', async () => {
      const result = [{ id: 1 }, { id: 2 }];
      const operation = jest.fn().mockResolvedValue(result);
      
      await controller.handlePaginatedList(mockReq, mockRes, operation, 'Resources');
      
      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  describe('handleCreate', () => {
    test('should create resource successfully', async () => {
      const resource = { id: 1, name: 'test' };
      const operation = jest.fn().mockResolvedValue(resource);
      
      await controller.handleCreate(mockReq, mockRes, operation, 'Resource', 'Created successfully');
      
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  describe('handleUpdate', () => {
    test('should update resource successfully', async () => {
      const resource = { id: 1, name: 'updated' };
      const operation = jest.fn().mockResolvedValue(resource);
      
      await controller.handleUpdate(mockReq, mockRes, operation, 'Resource', 'Updated successfully');
      
      expect(mockRes.json).toHaveBeenCalled();
    });

    test('should return 404 when resource not found', async () => {
      const operation = jest.fn().mockResolvedValue(null);
      
      await controller.handleUpdate(mockReq, mockRes, operation, 'Resource');
      
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('handleDelete', () => {
    test('should delete resource successfully', async () => {
      const operation = jest.fn().mockResolvedValue(true);
      
      await controller.handleDelete(mockReq, mockRes, operation, 'Resource', 'Deleted successfully');
      
      expect(mockRes.json).toHaveBeenCalled();
    });

    test('should return 404 when resource not found', async () => {
      const operation = jest.fn().mockResolvedValue(false);
      
      await controller.handleDelete(mockReq, mockRes, operation, 'Resource');
      
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('handleAction', () => {
    test('should perform action successfully', async () => {
      const result = { success: true };
      const operation = jest.fn().mockResolvedValue(result);
      
      await controller.handleAction(mockReq, mockRes, operation, 'Action', 'Action completed');
      
      expect(mockRes.json).toHaveBeenCalled();
    });

    test('should return 404 when action fails', async () => {
      const operation = jest.fn().mockResolvedValue(false);
      
      await controller.handleAction(mockReq, mockRes, operation, 'Action');
      
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('Utility Methods', () => {
    test('extractPaginationParams should return correct values', () => {
      const req = createMockReq({}, {}, { page: '2', limit: '20' });
      const result = controller.extractPaginationParams(req);
      
      expect(result).toEqual({ page: 2, limit: 20 });
    });

    test('extractPaginationParams should use defaults', () => {
      const req = createMockReq({}, {}, {});
      const result = controller.extractPaginationParams(req);
      
      expect(result).toEqual({ page: 1, limit: 10 });
    });

    test('extractFilterParams should return allowed filters', () => {
      const req = createMockReq({}, {}, { status: 'active', search: 'test', invalid: 'ignored' });
      const result = controller.extractFilterParams(req, ['status', 'search']);
      
      expect(result).toEqual({ status: 'active', search: 'test' });
    });

    test('validateRequiredParams should throw for missing params', () => {
      const req = createMockReq({}, {}, {});
      
      expect(() => controller.validateRequiredParams(req, ['id', 'name'])).toThrow('Missing required parameters: id, name');
    });

    test('validateRequiredParams should pass for present params', () => {
      const req = createMockReq({ id: '1' }, { name: 'test' }, {});
      
      expect(() => controller.validateRequiredParams(req, ['id', 'name'])).not.toThrow();
    });

    test('validateParamTypes should throw for wrong types', () => {
      const req = createMockReq({}, { count: 'not-a-number' }, {});
      
      expect(() => controller.validateParamTypes(req, { count: 'number' })).toThrow('Invalid type for parameter count: expected number, got string');
    });

    test('validateParamTypes should pass for correct types', () => {
      const req = createMockReq({}, { count: 42 }, {});
      
      expect(() => controller.validateParamTypes(req, { count: 'number' })).not.toThrow();
    });
  });
});