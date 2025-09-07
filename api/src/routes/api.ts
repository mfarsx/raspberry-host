import { Router } from 'express';
import { Request, Response } from 'express';
import { logger } from '../config/logger';

const router = Router();

// Basic API routes
router.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Raspberry Pi 5 Hosting Platform API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      stats: '/api/stats',
      system: '/api/system'
    }
  });
});

// System stats endpoint
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = {
      timestamp: new Date().toISOString(),
      system: {
        uptime: process.uptime(),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024),
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
        },
        cpu: process.cpuUsage(),
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        pid: process.pid
      },
      database: {
        connected: true, // This will be updated with actual DB status
        collections: 0, // This will be updated with actual collection count
        documents: 0   // This will be updated with actual document count
      },
      redis: {
        connected: true, // This will be updated with actual Redis status
        connectedClients: 0, // This will be updated with actual client count
        memoryUsed: '0MB' // This will be updated with actual memory usage
      }
    };
    
    logger.info('Stats endpoint accessed');
    res.json(stats);
  } catch (error) {
    logger.error('Stats endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// System information endpoint
router.get('/system', async (req: Request, res: Response) => {
  try {
    const systemInfo = {
      timestamp: new Date().toISOString(),
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      v8Version: process.versions.v8,
      uptime: process.uptime(),
      pid: process.pid,
      cwd: process.cwd(),
      env: {
        NODE_ENV: process.env.NODE_ENV || 'development',
        PORT: process.env.PORT || '3001'
      },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      hostname: require('os').hostname(),
      loadAverage: require('os').loadavg(),
      memory: {
        total: Math.round(require('os').totalmem() / 1024 / 1024 / 1024) + 'GB',
        free: Math.round(require('os').freemem() / 1024 / 1024 / 1024) + 'GB',
        used: Math.round((require('os').totalmem() - require('os').freemem()) / 1024 / 1024 / 1024) + 'GB',
        usage: Math.round(((require('os').totalmem() - require('os').freemem()) / require('os').totalmem()) * 100) + '%'
      },
      cpu: {
        model: require('os').cpus()[0].model,
        cores: require('os').cpus().length,
        speed: require('os').cpus()[0].speed + 'MHz'
      },
      network: {
        interfaces: require('os').networkInterfaces()
      }
    };
    
    logger.info('System info endpoint accessed');
    res.json(systemInfo);
  } catch (error) {
    logger.error('System info endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system information',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;