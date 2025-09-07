import { Router } from 'express';
import { Request, Response } from 'express';
import { logger } from '../config/logger';
import { ProjectService } from '../services/projectService';

const router = Router();
const projectService = new ProjectService();

// Get all hosted projects
router.get('/', async (req: Request, res: Response) => {
  try {
    const projects = await projectService.getAllProjects();
    res.json({
      success: true,
      data: projects,
      count: projects.length
    });
  } catch (error) {
    logger.error('Failed to get projects:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get projects',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get project by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const project = await projectService.getProjectById(id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }
    
    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    logger.error('Failed to get project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get project',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Deploy new project
router.post('/deploy', async (req: Request, res: Response) => {
  try {
    const { 
      name, 
      domain, 
      repository, 
      branch = 'main',
      buildCommand,
      startCommand,
      environment,
      port
    } = req.body;
    
    // Validate required fields
    if (!name || !domain || !repository) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, domain, repository'
      });
    }
    
    const project = await projectService.deployProject({
      name,
      domain,
      repository,
      branch,
      buildCommand,
      startCommand,
      environment: environment || {},
      port: port || 3000
    });
    
    logger.info(`Project deployed: ${name} at ${domain}`);
    
    res.status(201).json({
      success: true,
      message: 'Project deployed successfully',
      data: project
    });
  } catch (error) {
    logger.error('Failed to deploy project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deploy project',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update project
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const project = await projectService.updateProject(id, updates);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Project updated successfully',
      data: project
    });
  } catch (error) {
    logger.error('Failed to update project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update project',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete project
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const success = await projectService.deleteProject(id);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }
    
    logger.info(`Project deleted: ${id}`);
    
    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete project',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Restart project
router.post('/:id/restart', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const success = await projectService.restartProject(id);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }
    
    logger.info(`Project restarted: ${id}`);
    
    res.json({
      success: true,
      message: 'Project restarted successfully'
    });
  } catch (error) {
    logger.error('Failed to restart project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restart project',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get project logs
router.get('/:id/logs', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { lines = 100 } = req.query;
    
    const logs = await projectService.getProjectLogs(id, parseInt(lines as string));
    
    if (!logs) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }
    
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    logger.error('Failed to get project logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get project logs',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get project status
router.get('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const status = await projectService.getProjectStatus(id);
    
    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Failed to get project status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get project status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;