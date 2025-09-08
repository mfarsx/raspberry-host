const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { createClient } = require('redis');

// Mock Redis for testing
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    isReady: true,
    get: jest.fn(),
    set: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
    hGet: jest.fn(),
    hSet: jest.fn(),
    hDel: jest.fn(),
    hGetAll: jest.fn(),
    hExists: jest.fn(),
    hLen: jest.fn(),
    info: jest.fn(),
    quit: jest.fn()
  }))
}));

// Mock child_process for testing
jest.mock('child_process', () => ({
  exec: jest.fn(),
  spawn: jest.fn(() => ({
    stdout: { on: jest.fn() },
    stderr: { on: jest.fn() },
    on: jest.fn(),
    kill: jest.fn()
  }))
}));

// Mock fs for testing
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    access: jest.fn(),
    rm: jest.fn()
  }
}));

let mongoServer;

beforeAll(async () => {
  // Start in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  // Clean up
  await mongoose.disconnect();
  await mongoServer.stop();
});

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