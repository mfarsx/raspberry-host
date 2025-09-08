const { Router } = require('express');
const { logger } = require('../config/logger');
const { ProjectService } = require('../services/projectService');
const ValidationMiddleware = require('../middleware/validation');
const projectSchemas = require('../schemas/projectSchemas');
const { asyncHandler } = require('../middleware/errorHandler');

const router = Router();
const projectService = new ProjectService();

// Get all hosted projects
router.get('/', asyncHandler(async (req, res) => {
  const projects = await projectService.getAllProjects();
  res.json({
    success: true,
    data: projects,
    count: projects.length
  });
}));

// Get project by ID
router.get('/:id', 
  ValidationMiddleware.validateParams(projectSchemas.projectId),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const project = await projectService.getProjectById(id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
        category: 'NOT_FOUND'
      });
    }
    
    res.json({
      success: true,
      data: project
    });
  })
);

// Deploy new project
router.post('/deploy', 
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validateBody(projectSchemas.deployProject),
  asyncHandler(async (req, res) => {
    const project = await projectService.deployProject(req.body);
    
    logger.info(`Project deployed: ${req.body.name} at ${req.body.domain}`);
    
    res.status(201).json({
      success: true,
      message: 'Project deployed successfully',
      data: project
    });
  })
);

// Update project
router.put('/:id', 
  ValidationMiddleware.validateParams(projectSchemas.projectId),
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validateBody(projectSchemas.updateProject),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const project = await projectService.updateProject(id, req.body);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
        category: 'NOT_FOUND'
      });
    }
    
    res.json({
      success: true,
      message: 'Project updated successfully',
      data: project
    });
  })
);

// Delete project
router.delete('/:id', 
  ValidationMiddleware.validateParams(projectSchemas.projectId),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const success = await projectService.deleteProject(id);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
        category: 'NOT_FOUND'
      });
    }
    
    logger.info(`Project deleted: ${id}`);
    
    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  })
);

// Restart project
router.post('/:id/restart', 
  ValidationMiddleware.validateParams(projectSchemas.projectId),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const success = await projectService.restartProject(id);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
        category: 'NOT_FOUND'
      });
    }
    
    logger.info(`Project restarted: ${id}`);
    
    res.json({
      success: true,
      message: 'Project restarted successfully'
    });
  })
);

// Get project logs
router.get('/:id/logs', 
  ValidationMiddleware.validateParams(projectSchemas.projectId),
  ValidationMiddleware.validateQuery(projectSchemas.logsQuery),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { lines } = req.query;
    
    const logs = await projectService.getProjectLogs(id, lines);
    
    if (!logs) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
        category: 'NOT_FOUND'
      });
    }
    
    res.json({
      success: true,
      data: logs
    });
  })
);

// Get project status
router.get('/:id/status', 
  ValidationMiddleware.validateParams(projectSchemas.projectId),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const status = await projectService.getProjectStatus(id);
    
    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
        category: 'NOT_FOUND'
      });
    }
    
    res.json({
      success: true,
      data: status
    });
  })
);

module.exports = router;
