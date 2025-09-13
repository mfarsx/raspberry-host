const ConfigController = require('../../controllers/configController');

// Mock the dependencies
jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('../../utils/responseHelper', () => ({
  success: jest.fn((res, data) => res.json({ success: true, data })),
  error: jest.fn((res, message, status = 500) => res.status(status).json({ success: false, error: message }))
}));

jest.mock('../../config/environment', () => ({
  domain: 'localhost',
  port: 3001,
  nodeEnv: 'test'
}));

describe('ConfigController', () => {
  let configController;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    configController = new ConfigController();
    mockReq = {};
    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
  });

  describe('getAppConfig', () => {
    it('should return app configuration', () => {
      configController.getAppConfig(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          name: expect.any(String),
          version: expect.any(String),
          platform: expect.any(String),
          features: expect.any(Object),
          branding: expect.any(Object)
        })
      });
    });
  });

  describe('getSystemConfig', () => {
    it('should return system configuration', () => {
      configController.getSystemConfig(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          defaultPort: expect.any(Number),
          refreshInterval: expect.any(Number),
          shell: expect.any(String),
          logConfig: expect.any(Object),
          websocket: expect.any(Object),
          deployment: expect.any(Object)
        })
      });
    });
  });

  describe('getUIConfig', () => {
    it('should return UI configuration', () => {
      configController.getUIConfig(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          placeholders: expect.any(Object),
          demoCredentials: expect.any(Object),
          messages: expect.any(Object),
          theme: expect.any(Object)
        })
      });
    });
  });

  describe('getAllConfig', () => {
    it('should return all configuration', () => {
      configController.getAllConfig(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          app: expect.any(Object),
          system: expect.any(Object),
          ui: expect.any(Object),
          timestamp: expect.any(String),
          environment: expect.any(String)
        })
      });
    });
  });
});