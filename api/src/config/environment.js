const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

/**
 * Environment Configuration Manager
 * Centralizes all environment variable handling with validation and defaults
 */
class EnvironmentConfig {
  constructor() {
    this.validateRequiredVariables();
  }

  // =============================================================================
  // DOMAIN & SSL CONFIGURATION
  // =============================================================================
  get domain() {
    return process.env.DOMAIN || 'localhost';
  }

  get tlsEmail() {
    return process.env.TLS_EMAIL;
  }

  // =============================================================================
  // APPLICATION CONFIGURATION
  // =============================================================================
  get nodeEnv() {
    return process.env.NODE_ENV || 'development';
  }

  get port() {
    return parseInt(process.env.PORT) || 3001;
  }

  get logLevel() {
    return process.env.LOG_LEVEL || (this.isDevelopment ? 'debug' : 'info');
  }

  get isDevelopment() {
    return this.nodeEnv === 'development';
  }

  get isProduction() {
    return this.nodeEnv === 'production';
  }

  // =============================================================================
  // DATABASE CONFIGURATION
  // =============================================================================
  get mongoUrl() {
    if (this.isDevelopment) {
      return process.env.MONGO_URL || 'mongodb://mongodb:27017/pi_app_dev';
    }
    return process.env.MONGO_URL;
  }

  get mongoRootUsername() {
    return process.env.MONGO_ROOT_USERNAME || 'admin';
  }

  get mongoRootPassword() {
    return process.env.MONGO_ROOT_PASSWORD;
  }

  get mongoDatabase() {
    return process.env.MONGO_DATABASE || (this.isDevelopment ? 'pi_app_dev' : 'pi_app');
  }

  get redisUrl() {
    if (this.isDevelopment) {
      return process.env.REDIS_URL || 'redis://redis:6379';
    }
    return process.env.REDIS_URL;
  }

  get redisPassword() {
    return process.env.REDIS_PASSWORD;
  }

  // =============================================================================
  // SECURITY CONFIGURATION
  // =============================================================================
  get jwtSecret() {
    return process.env.JWT_SECRET || (this.isDevelopment ? 'dev-jwt-secret-key' : null);
  }

  get corsOrigin() {
    if (this.isDevelopment) {
      return process.env.CORS_ORIGIN || 'http://localhost:3000';
    }
    return process.env.CORS_ORIGIN || `https://${this.domain}`;
  }

  // =============================================================================
  // PROJECT DEPLOYMENT CONFIGURATION
  // =============================================================================
  get projectsDir() {
    return process.env.PROJECTS_DIR || './projects';
  }

  get maxConcurrentDeployments() {
    return parseInt(process.env.MAX_CONCURRENT_DEPLOYMENTS) || 3;
  }

  get deploymentTimeout() {
    return parseInt(process.env.DEPLOYMENT_TIMEOUT) || 300;
  }

  // =============================================================================
  // PERFORMANCE CONFIGURATION
  // =============================================================================
  get mongoMaxPoolSize() {
    return parseInt(process.env.MONGO_MAX_POOL_SIZE) || 10;
  }

  get mongoServerSelectionTimeout() {
    return parseInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT) || 5000;
  }

  get mongoSocketTimeout() {
    return parseInt(process.env.MONGO_SOCKET_TIMEOUT) || 45000;
  }

  get mongoWiredTigerCacheSizeGB() {
    return parseFloat(process.env.MONGO_WIRED_TIGER_CACHE_SIZE_GB) || 0.5;
  }

  get redisMaxMemory() {
    return process.env.REDIS_MAX_MEMORY || '256mb';
  }

  get redisMaxMemoryPolicy() {
    return process.env.REDIS_MAX_MEMORY_POLICY || 'allkeys-lru';
  }

  get redisSaveIntervals() {
    return process.env.REDIS_SAVE_INTERVALS || '900 1,300 10,60 10000';
  }

  // =============================================================================
  // NETWORK CONFIGURATION
  // =============================================================================
  get networkSubnet() {
    return process.env.NETWORK_SUBNET || '172.20.0.0/16';
  }

  get apiTimeout() {
    return parseInt(process.env.API_TIMEOUT) || 30000;
  }

  get websocketTimeout() {
    return parseInt(process.env.WEBSOCKET_TIMEOUT) || 60000;
  }

  // =============================================================================
  // FEATURE FLAGS
  // =============================================================================
  get enableMetrics() {
    return process.env.ENABLE_METRICS !== 'false';
  }

  get enableHealthChecks() {
    return process.env.ENABLE_HEALTH_CHECKS !== 'false';
  }

  get enableRateLimiting() {
    return process.env.ENABLE_RATE_LIMITING !== 'false';
  }

  get enableCompression() {
    return process.env.ENABLE_COMPRESSION !== 'false';
  }

  get enableSecurityHeaders() {
    return process.env.ENABLE_SECURITY_HEADERS !== 'false';
  }

  // =============================================================================
  // VALIDATION
  // =============================================================================
  validateRequiredVariables() {
    const requiredVars = [];

    if (this.isProduction) {
      requiredVars.push(
        { name: 'MONGO_URL', value: this.mongoUrl },
        { name: 'REDIS_URL', value: this.redisUrl },
        { name: 'JWT_SECRET', value: this.jwtSecret },
        { name: 'MONGO_ROOT_PASSWORD', value: this.mongoRootPassword },
        { name: 'REDIS_PASSWORD', value: this.redisPassword }
      );
    }

    const missingVars = requiredVars.filter(({ value }) => !value);

    if (missingVars.length > 0) {
      const missingNames = missingVars.map(({ name }) => name).join(', ');
      throw new Error(`Missing required environment variables: ${missingNames}`);
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================
  getAllConfig() {
    return {
      domain: this.domain,
      nodeEnv: this.nodeEnv,
      port: this.port,
      logLevel: this.logLevel,
      isDevelopment: this.isDevelopment,
      isProduction: this.isProduction,
      mongoUrl: this.mongoUrl,
      redisUrl: this.redisUrl,
      corsOrigin: this.corsOrigin,
      projectsDir: this.projectsDir,
      maxConcurrentDeployments: this.maxConcurrentDeployments,
      deploymentTimeout: this.deploymentTimeout,
      enableMetrics: this.enableMetrics,
      enableHealthChecks: this.enableHealthChecks,
      enableRateLimiting: this.enableRateLimiting,
      enableCompression: this.enableCompression,
      enableSecurityHeaders: this.enableSecurityHeaders
    };
  }

  getDatabaseConfig() {
    return {
      mongoUrl: this.mongoUrl,
      mongoRootUsername: this.mongoRootUsername,
      mongoRootPassword: this.mongoRootPassword,
      mongoDatabase: this.mongoDatabase,
      mongoMaxPoolSize: this.mongoMaxPoolSize,
      mongoServerSelectionTimeout: this.mongoServerSelectionTimeout,
      mongoSocketTimeout: this.mongoSocketTimeout,
      mongoWiredTigerCacheSizeGB: this.mongoWiredTigerCacheSizeGB,
      redisUrl: this.redisUrl,
      redisPassword: this.redisPassword,
      redisMaxMemory: this.redisMaxMemory,
      redisMaxMemoryPolicy: this.redisMaxMemoryPolicy,
      redisSaveIntervals: this.redisSaveIntervals
    };
  }

  getSecurityConfig() {
    return {
      jwtSecret: this.jwtSecret,
      corsOrigin: this.corsOrigin,
      enableSecurityHeaders: this.enableSecurityHeaders,
      enableRateLimiting: this.enableRateLimiting
    };
  }
}

// Export singleton instance
const config = new EnvironmentConfig();
module.exports = config;
