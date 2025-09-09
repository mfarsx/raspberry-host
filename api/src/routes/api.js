const { Router } = require('express');
const { logger } = require('../config/logger');

const router = Router();

// Basic API routes
router.get('/', (req, res) => {
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

// Simple health check for clients
router.get('/health-check', (req, res) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.json({
    status: 'healthy',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: isDevelopment ? 'System running in development mode' : 'System running in production mode'
  });
});

// System stats endpoint
router.get('/stats', async (req, res) => {
  try {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    const stats = {
      ok: true, // Always true for development mode
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
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
router.get('/system', async (req, res) => {
  try {
    const os = require('os');
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
      hostname: os.hostname(),
      loadAverage: os.loadavg(),
      memory: {
        total: Math.round(os.totalmem() / 1024 / 1024 / 1024) + 'GB',
        free: Math.round(os.freemem() / 1024 / 1024 / 1024) + 'GB',
        used: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024 / 1024) + 'GB',
        usage: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100) + '%'
      },
      cpu: {
        model: os.cpus()[0].model,
        cores: os.cpus().length,
        speed: os.cpus()[0].speed + 'MHz'
      },
      network: {
        interfaces: os.networkInterfaces()
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

// System status endpoint
router.get('/system/status', async (req, res) => {
  try {
    const DockerService = require('../services/dockerService');
    const dockerService = new DockerService();
    
    const [dockerAvailable, dockerComposeAvailable] = await Promise.all([
      dockerService.isDockerAvailable(),
      dockerService.isDockerComposeAvailable()
    ]);
    
    // Determine overall system health
    const isDevelopment = process.env.NODE_ENV === 'development';
    const overallHealthy = isDevelopment ? true : dockerAvailable && dockerComposeAvailable;
    
    const status = {
      timestamp: new Date().toISOString(),
      healthy: overallHealthy,
      environment: process.env.NODE_ENV || 'development',
      services: {
        api: {
          status: 'healthy',
          uptime: process.uptime(),
          memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
          version: process.version
        },
        docker: {
          status: dockerAvailable ? 'available' : (isDevelopment ? 'not_required' : 'unavailable'),
          version: dockerAvailable ? 'installed' : (isDevelopment ? 'development_mode' : 'not installed'),
          message: isDevelopment ? 'Docker not required in development mode' : undefined
        },
        dockerCompose: {
          status: dockerComposeAvailable ? 'available' : (isDevelopment ? 'not_required' : 'unavailable'),
          version: dockerComposeAvailable ? 'installed' : (isDevelopment ? 'development_mode' : 'not installed'),
          message: isDevelopment ? 'Docker Compose not required in development mode' : undefined
        },
        database: {
          status: 'development_mode',
          message: 'Database connections skipped in development mode'
        },
        redis: {
          status: 'development_mode',
          message: 'Redis connections skipped in development mode'
        }
      },
      system: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        uptime: process.uptime(),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024),
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
        }
      }
    };
    
    logger.info('System status endpoint accessed');
    res.json(status);
  } catch (error) {
    logger.error('System status endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

module.exports = router;
