const mongoose = require('mongoose');
const { getRedisClient } = require('../config/redis');
const { logger } = require('../config/logger');

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

module.exports = {
  checkDatabaseHealth,
  checkRedisHealth
};
