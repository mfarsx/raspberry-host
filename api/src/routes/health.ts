import { Router } from 'express';
import { Request, Response } from 'express';
import { logger } from '../config/logger';
import { checkDatabaseHealth } from '../services/healthService';
import { checkRedisHealth } from '../services/healthService';

const router = Router();

// Health check endpoint
router.get('/', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    
    // Check database connection
    const dbHealth = await checkDatabaseHealth();
    
    // Check Redis connection
    const redisHealth = await checkRedisHealth();
    
    // Get system information
    const systemInfo = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      platform: process.platform,
      nodeVersion: process.version,
      pid: process.pid
    };
    
    const responseTime = Date.now() - startTime;
    
    const healthStatus = {
      ok: dbHealth.connected && redisHealth.connected,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      services: {
        database: dbHealth,
        redis: redisHealth,
        api: {
          connected: true,
          uptime: `${Math.floor(systemInfo.uptime)}s`,
          memory: `${Math.round(systemInfo.memory.heapUsed / 1024 / 1024)}MB`,
          version: systemInfo.nodeVersion
        }
      },
      system: systemInfo
    };
    
    const statusCode = healthStatus.ok ? 200 : 503;
    
    logger.info('Health check completed', {
      status: healthStatus.ok ? 'healthy' : 'unhealthy',
      responseTime: `${responseTime}ms`,
      services: healthStatus.services
    });
    
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    logger.error('Health check failed:', error);
    
    res.status(503).json({
      ok: false,
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Detailed health check
router.get('/detailed', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    
    // Check all services
    const [dbHealth, redisHealth] = await Promise.all([
      checkDatabaseHealth(),
      checkRedisHealth()
    ]);
    
    // Get detailed system information
    const systemInfo = {
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
      pid: process.pid,
      env: process.env.NODE_ENV || 'development'
    };
    
    const responseTime = Date.now() - startTime;
    
    const detailedHealth = {
      ok: dbHealth.connected && redisHealth.connected,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      services: {
        database: dbHealth,
        redis: redisHealth,
        api: {
          connected: true,
          uptime: `${Math.floor(systemInfo.uptime)}s`,
          memory: systemInfo.memory,
          version: systemInfo.nodeVersion,
          environment: systemInfo.env
        }
      },
      system: systemInfo
    };
    
    const statusCode = detailedHealth.ok ? 200 : 503;
    
    res.status(statusCode).json(detailedHealth);
  } catch (error) {
    logger.error('Detailed health check failed:', error);
    
    res.status(503).json({
      ok: false,
      timestamp: new Date().toISOString(),
      error: 'Detailed health check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;