import mongoose from 'mongoose';
import { getRedisClient } from '../config/redis';
import { logger } from '../config/logger';

export const checkDatabaseHealth = async (): Promise<{
  connected: boolean;
  status: string;
  collections?: number;
  documents?: number;
  error?: string;
}> => {
  try {
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

export const checkRedisHealth = async (): Promise<{
  connected: boolean;
  status: string;
  connectedClients?: number;
  memoryUsed?: string;
  error?: string;
}> => {
  try {
    const redisClient = getRedisClient();
    
    // Check if Redis is connected
    if (!redisClient.isReady) {
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
    const connectedClients = connectedClientsMatch ? parseInt(connectedClientsMatch[1]) : 0;
    
    // Parse memory info
    const memoryUsedMatch = memoryInfo.match(/used_memory_human:([^\r\n]+)/);
    const memoryUsed = memoryUsedMatch ? memoryUsedMatch[1] : 'Unknown';
    
    return {
      connected: true,
      status: 'connected',
      connectedClients,
      memoryUsed
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