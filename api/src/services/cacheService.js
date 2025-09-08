const { logger } = require('../config/logger');
const config = require('../config/environment');

/**
 * Cache Service - Handles caching operations with Redis and in-memory fallback
 */
class CacheService {
  constructor(redisClient = null) {
    this.redis = redisClient;
    this.memoryCache = new Map();
    this.logger = logger;
    this.defaultTTL = 300; // 5 minutes
  }

  /**
   * Get Redis client
   * @returns {Object|null} Redis client or null
   */
  getRedisClient() {
    if (!this.redis && config.isProduction) {
      try {
        const { getRedisClient } = require('../config/redis');
        this.redis = getRedisClient();
      } catch (error) {
        this.logger.warn('Redis client not available, using memory cache only');
      }
    }
    return this.redis;
  }

  /**
   * Set cache value
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value, ttl = this.defaultTTL) {
    try {
      const serializedValue = JSON.stringify(value);
      
      // Try Redis first
      const redisClient = this.getRedisClient();
      if (redisClient && redisClient.isReady) {
        await redisClient.setEx(key, ttl, serializedValue);
        this.logger.debug(`Cache set in Redis: ${key}`);
        return true;
      }
      
      // Fallback to memory cache
      this.memoryCache.set(key, {
        value: serializedValue,
        expires: Date.now() + (ttl * 1000)
      });
      
      this.logger.debug(`Cache set in memory: ${key}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to set cache:', error);
      return false;
    }
  }

  /**
   * Get cache value
   * @param {string} key - Cache key
   * @returns {Promise<any|null>} Cached value or null
   */
  async get(key) {
    try {
      // Try Redis first
      const redisClient = this.getRedisClient();
      if (redisClient && redisClient.isReady) {
        const value = await redisClient.get(key);
        if (value) {
          this.logger.debug(`Cache hit in Redis: ${key}`);
          return JSON.parse(value);
        }
      }
      
      // Fallback to memory cache
      const cached = this.memoryCache.get(key);
      if (cached) {
        if (Date.now() < cached.expires) {
          this.logger.debug(`Cache hit in memory: ${key}`);
          return JSON.parse(cached.value);
        } else {
          // Expired, remove from memory
          this.memoryCache.delete(key);
        }
      }
      
      this.logger.debug(`Cache miss: ${key}`);
      return null;
    } catch (error) {
      this.logger.error('Failed to get cache:', error);
      return null;
    }
  }

  /**
   * Delete cache value
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Success status
   */
  async delete(key) {
    try {
      // Delete from Redis
      const redisClient = this.getRedisClient();
      if (redisClient && redisClient.isReady) {
        await redisClient.del(key);
      }
      
      // Delete from memory cache
      this.memoryCache.delete(key);
      
      this.logger.debug(`Cache deleted: ${key}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to delete cache:', error);
      return false;
    }
  }

  /**
   * Clear all cache
   * @returns {Promise<boolean>} Success status
   */
  async clear() {
    try {
      // Clear Redis cache
      const redisClient = this.getRedisClient();
      if (redisClient && redisClient.isReady) {
        await redisClient.flushAll();
      }
      
      // Clear memory cache
      this.memoryCache.clear();
      
      this.logger.info('All cache cleared');
      return true;
    } catch (error) {
      this.logger.error('Failed to clear cache:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} Cache statistics
   */
  async getStats() {
    try {
      const stats = {
        memory: {
          size: this.memoryCache.size,
          keys: Array.from(this.memoryCache.keys())
        },
        redis: {
          connected: false,
          info: null
        }
      };

      const redisClient = this.getRedisClient();
      if (redisClient && redisClient.isReady) {
        stats.redis.connected = true;
        try {
          const info = await redisClient.info('memory');
          stats.redis.info = info;
        } catch (error) {
          this.logger.warn('Failed to get Redis info:', error);
        }
      }

      return stats;
    } catch (error) {
      this.logger.error('Failed to get cache stats:', error);
      return null;
    }
  }

  /**
   * Clean up expired memory cache entries
   */
  cleanupMemoryCache() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, value] of this.memoryCache.entries()) {
      if (now >= value.expires) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired cache entries`);
    }
  }

  /**
   * Cache middleware factory
   * @param {number} ttl - Time to live in seconds
   * @param {Function} keyGenerator - Function to generate cache key
   * @returns {Function} Express middleware
   */
  createCacheMiddleware(ttl = this.defaultTTL, keyGenerator = null) {
    return async (req, res, next) => {
      try {
        const key = keyGenerator ? keyGenerator(req) : `cache:${req.method}:${req.originalUrl}`;
        
        // Try to get from cache
        const cached = await this.get(key);
        if (cached) {
          return res.json(cached);
        }
        
        // Store original res.json
        const originalJson = res.json.bind(res);
        
        // Override res.json to cache the response
        res.json = (data) => {
          // Cache the response
          this.set(key, data, ttl).catch(error => {
            this.logger.error('Failed to cache response:', error);
          });
          
          // Send the response
          return originalJson(data);
        };
        
        next();
      } catch (error) {
        this.logger.error('Cache middleware error:', error);
        next();
      }
    };
  }
}

// Create singleton instance
let cacheServiceInstance = null;

const getCacheService = () => {
  if (!cacheServiceInstance) {
    cacheServiceInstance = new CacheService();
  }
  return cacheServiceInstance;
};

module.exports = {
  CacheService,
  getCacheService
};