const { Router } = require('express');
const { logger } = require('../config/logger');
const AuthMiddleware = require('../middleware/auth');
const ValidationMiddleware = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const DockerService = require('../services/dockerService');

const router = Router();
const dockerService = new DockerService();

// Get all Docker containers
router.get('/containers',
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole('admin'),
  asyncHandler(async (req, res) => {
    try {
      const containers = await dockerService.getAllContainers();
      res.json({
        success: true,
        data: containers,
        count: containers.length
      });
    } catch (error) {
      logger.error('Failed to get Docker containers:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get Docker containers',
        message: error.message
      });
    }
  })
);

// Get all Docker images
router.get('/images',
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole('admin'),
  asyncHandler(async (req, res) => {
    try {
      const images = await dockerService.getAllImages();
      res.json({
        success: true,
        data: images,
        count: images.length
      });
    } catch (error) {
      logger.error('Failed to get Docker images:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get Docker images',
        message: error.message
      });
    }
  })
);

// Get Docker networks
router.get('/networks',
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole('admin'),
  asyncHandler(async (req, res) => {
    try {
      const networks = await dockerService.getAllNetworks();
      res.json({
        success: true,
        data: networks,
        count: networks.length
      });
    } catch (error) {
      logger.error('Failed to get Docker networks:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get Docker networks',
        message: error.message
      });
    }
  })
);

// Get Docker volumes
router.get('/volumes',
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole('admin'),
  asyncHandler(async (req, res) => {
    try {
      const volumes = await dockerService.getAllVolumes();
      res.json({
        success: true,
        data: volumes,
        count: volumes.length
      });
    } catch (error) {
      logger.error('Failed to get Docker volumes:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get Docker volumes',
        message: error.message
      });
    }
  })
);

// Get Docker system info
router.get('/info',
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole('admin'),
  asyncHandler(async (req, res) => {
    try {
      const info = await dockerService.getSystemInfo();
      res.json({
        success: true,
        data: info
      });
    } catch (error) {
      logger.error('Failed to get Docker system info:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get Docker system info',
        message: error.message
      });
    }
  })
);

// Remove Docker image
router.delete('/images/:id',
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole('admin'),
  ValidationMiddleware.validateParams({
    id: { type: 'string', required: true }
  }),
  asyncHandler(async (req, res) => {
    try {
      const { id } = req.params;
      await dockerService.removeImage(id);
      
      logger.info(`Docker image removed: ${id}`);
      
      res.json({
        success: true,
        message: 'Docker image removed successfully'
      });
    } catch (error) {
      logger.error('Failed to remove Docker image:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove Docker image',
        message: error.message
      });
    }
  })
);

module.exports = router;