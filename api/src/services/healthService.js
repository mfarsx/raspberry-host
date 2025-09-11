const mongoose = require('mongoose');
const { getRedisClient } = require('../config/redis');
const { logger } = require('../config/logger');
const DockerService = require('./dockerService');

const checkDatabaseHealth = async () => {
  try {
    // In development mode, skip database checks
    if (process.env.NODE_ENV === 'development') {
      return {
        connected: true,
        status: 'development_mode',
        message: 'Database connections skipped in development mode'
      };
    }
    
    // Check MongoDB connection
    const state = mongoose.connection.readyState;
    
    if (state !== 1) { // 1 = connected
      return {
        connected: false,
        status: 'disconnected',
        error: 'MongoDB not connected'
      };
    }
    
    // Get database stats
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const collectionCount = collections.length;
    
    // Get document count for each collection
    let totalDocuments = 0;
    for (const collection of collections) {
      try {
        const count = await db.collection(collection.name).countDocuments();
        totalDocuments += count;
      } catch (error) {
        logger.warn(`Could not count documents in collection ${collection.name}:`, error);
      }
    }
    
    return {
      connected: true,
      status: 'connected',
      collections: collectionCount,
      documents: totalDocuments
    };
    
  } catch (error) {
    logger.error('Database health check failed:', error);
    return {
      connected: false,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

const checkRedisHealth = async () => {
  try {
    // In development mode, skip Redis checks
    if (process.env.NODE_ENV === 'development') {
      return {
        connected: true,
        status: 'development_mode',
        message: 'Redis connections skipped in development mode'
      };
    }
    
    const redisClient = getRedisClient();
    
    // Check if Redis is connected
    if (!redisClient || !redisClient.isReady) {
      return {
        connected: false,
        status: 'disconnected',
        error: 'Redis not connected'
      };
    }
    
    // Get Redis info
    const info = await redisClient.info('clients');
    const memoryInfo = await redisClient.info('memory');
    
    // Parse client info
    const connectedClientsMatch = info.match(/connected_clients:(\d+)/);
    const connectedClients = connectedClientsMatch?.[1] ? parseInt(connectedClientsMatch[1]) : 0;
    
    // Parse memory info
    const memoryUsedMatch = memoryInfo.match(/used_memory_human:([^\r\n]+)/);
    const memoryUsed = memoryUsedMatch?.[1] || 'Unknown';
    
    return {
      connected: true,
      status: 'connected',
      connectedClients,
      memoryUsed: memoryUsed || 'Unknown'
    };
    
  } catch (error) {
    logger.error('Redis health check failed:', error);
    return {
      connected: false,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

const checkDockerHealth = async () => {
  try {
    // In development mode, skip Docker checks
    if (process.env.NODE_ENV === 'development') {
      return {
        connected: true,
        status: 'development_mode',
        message: 'Docker connections skipped in development mode'
      };
    }
    
    const dockerService = new DockerService();
    
    // Check if Docker is available
    const dockerAvailable = await dockerService.isDockerAvailable();
    if (!dockerAvailable) {
      return {
        connected: false,
        status: 'unavailable',
        error: 'Docker is not available or not running'
      };
    }
    
    // Check Docker Compose availability
    const dockerComposeAvailable = await dockerService.isDockerComposeAvailable();
    if (!dockerComposeAvailable) {
      return {
        connected: false,
        status: 'unavailable',
        error: 'Docker Compose is not available'
      };
    }
    
    // Get Docker system info
    const systemInfo = await dockerService.getSystemInfo();
    
    return {
      connected: true,
      status: 'available',
      version: systemInfo.ServerVersion || 'Unknown',
      containers: systemInfo.ContainersRunning || 0,
      images: systemInfo.Images || 0
    };
    
  } catch (error) {
    logger.error('Docker health check failed:', error);
    return {
      connected: false,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

const checkSystemResources = async () => {
  try {
    const os = require('os');
    
    // Get memory usage
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;
    
    // Get CPU load
    const loadAverage = os.loadavg();
    const cpuCount = os.cpus().length;
    
    // Get disk usage (if available)
    let diskUsage = null;
    try {
      const { execSync } = require('child_process');
      const dfOutput = execSync('df -h /', { encoding: 'utf8' });
      const lines = dfOutput.split('\n');
      if (lines.length > 1) {
        const parts = lines[1].split(/\s+/);
        diskUsage = {
          total: parts[1],
          used: parts[2],
          available: parts[3],
          usagePercent: parts[4]
        };
      }
    } catch (diskError) {
      logger.debug('Could not get disk usage:', diskError.message);
    }
    
    return {
      memory: {
        total: `${Math.round(totalMemory / 1024 / 1024 / 1024)}GB`,
        used: `${Math.round(usedMemory / 1024 / 1024 / 1024)}GB`,
        free: `${Math.round(freeMemory / 1024 / 1024 / 1024)}GB`,
        usagePercent: Math.round(memoryUsagePercent)
      },
      cpu: {
        cores: cpuCount,
        loadAverage: loadAverage.map(load => Math.round(load * 100) / 100),
        loadPercent: Math.round((loadAverage[0] / cpuCount) * 100)
      },
      disk: diskUsage,
      uptime: Math.round(os.uptime())
    };
    
  } catch (error) {
    logger.error('System resources check failed:', error);
    return {
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

module.exports = {
  checkDatabaseHealth,
  checkRedisHealth,
  checkDockerHealth,
  checkSystemResources
};
