// Simple setup for controller tests without external dependencies

// Mock all external dependencies
jest.mock('../../services/dockerService');
jest.mock('../../services/projectService');
jest.mock('../../utils/responseHelper');
jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
  securityLogger: {
    suspiciousActivity: jest.fn(),
  },
}));
jest.mock('../../config/environment', () => ({
  jwtSecret: 'test-secret',
}));

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}));

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

// Global test utilities
global.testUtils = {
  createMockRequest: (overrides = {}) => ({
    method: 'GET',
    url: '/test',
    path: '/test',
    originalUrl: '/test',
    headers: {},
    ip: '127.0.0.1',
    user: null,
    requestId: 'test-request-id',
    params: {},
    body: {},
    query: {},
    ...overrides
  }),
  
  createMockResponse: () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      get: jest.fn()
    };
    return res;
  },
  
  createMockNext: () => jest.fn(),
  
  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};