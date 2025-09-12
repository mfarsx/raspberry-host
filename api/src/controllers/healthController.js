const { logger } = require("../config/logger");
const {
  checkDatabaseHealth,
  checkRedisHealth,
  checkDockerHealth,
  checkSystemResources,
} = require("../services/healthService");

/**
 * HealthController - Handles health check endpoints
 */
class HealthController {
  /**
   * Get basic health status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getHealthStatus(req, res) {
    const startTime = Date.now();

    // Check all services in parallel with timeout
    const healthChecks = await Promise.allSettled([
      checkDatabaseHealth(),
      checkRedisHealth(),
      checkDockerHealth(),
      checkSystemResources(),
    ]);

    const [dbHealth, redisHealth, dockerHealth, systemResources] =
      healthChecks.map((result, index) => {
        if (result.status === "fulfilled") {
          return result.value;
        } else {
          logger.error(`Health check ${index} failed:`, result.reason);
          return {
            connected: false,
            status: "error",
            error: result.reason?.message || "Unknown error",
          };
        }
      });

    // Get system information
    const systemInfo = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      platform: process.platform,
      nodeVersion: process.version,
      pid: process.pid,
    };

    const responseTime = Date.now() - startTime;

    const healthStatus = {
      ok: dbHealth.connected && redisHealth.connected && dockerHealth.connected,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      services: {
        database: dbHealth,
        redis: redisHealth,
        docker: dockerHealth,
        api: {
          connected: true,
          uptime: `${Math.floor(systemInfo.uptime)}s`,
          memory: `${Math.round(systemInfo.memory.heapUsed / 1024 / 1024)}MB`,
          version: systemInfo.nodeVersion,
        },
      },
      system: {
        ...systemInfo,
        resources: systemResources,
      },
    };

    const statusCode = healthStatus.ok ? 200 : 503;

    logger.info("Health check completed", {
      status: healthStatus.ok ? "healthy" : "unhealthy",
      responseTime: `${responseTime}ms`,
      services: healthStatus.services,
    });

    res.status(statusCode).json(healthStatus);
  }

  /**
   * Get detailed health status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getDetailedHealth(req, res) {
    const startTime = Date.now();

    // Check all services
    const [dbHealth, redisHealth] = await Promise.all([
      checkDatabaseHealth(),
      checkRedisHealth(),
    ]);

    // Get detailed system information
    const systemInfo = {
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
      cpu: process.cpuUsage(),
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      pid: process.pid,
      env: process.env.NODE_ENV || "development",
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
          environment: systemInfo.env,
        },
      },
      system: systemInfo,
    };

    const statusCode = detailedHealth.ok ? 200 : 503;

    res.status(statusCode).json(detailedHealth);
  }
}

module.exports = HealthController;