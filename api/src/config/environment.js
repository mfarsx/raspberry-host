const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

/**
 * Simple Environment Configuration
 */
class EnvironmentConfig {
  constructor() {
    this.validateRequiredVariables();
  }

  get domain() {
    return process.env.DOMAIN || 'localhost';
  }

  get tlsEmail() {
    return process.env.TLS_EMAIL;
  }

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

  get mongoUrl() {
    return this.isDevelopment 
      ? process.env.MONGO_URL || 'mongodb://mongodb:27017/pi_app_dev'
      : process.env.MONGO_URL;
  }

  get redisUrl() {
    return this.isDevelopment 
      ? process.env.REDIS_URL || 'redis://redis:6379'
      : process.env.REDIS_URL;
  }

  get jwtSecret() {
    const secret = process.env.JWT_SECRET;
    
    if (!secret) {
      if (this.isDevelopment) {
        const crypto = require('crypto');
        return crypto.randomBytes(64).toString('hex');
      } else {
        throw new Error('JWT_SECRET environment variable is required in production');
      }
    }
    
    return secret;
  }

  get corsOrigin() {
    return this.isDevelopment 
      ? process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost']
      : process.env.CORS_ORIGIN || `https://${this.domain}`;
  }

  get projectsDir() {
    return process.env.PROJECTS_DIR || './projects';
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

  // MongoDB Configuration
  get mongoMaxPoolSize() {
    return parseInt(process.env.MONGO_MAX_POOL_SIZE) || 10;
  }

  get mongoServerSelectionTimeout() {
    return parseInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT) || 5000;
  }

  get mongoSocketTimeout() {
    return parseInt(process.env.MONGO_SOCKET_TIMEOUT) || 45000;
  }

  get mongoConnectTimeout() {
    return parseInt(process.env.MONGO_CONNECT_TIMEOUT) || 10000;
  }

  get mongoMaxIdleTime() {
    return parseInt(process.env.MONGO_MAX_IDLE_TIME) || 30000;
  }

  // Deployment Configuration
  get maxConcurrentDeployments() {
    return parseInt(process.env.MAX_CONCURRENT_DEPLOYMENTS) || 3;
  }

  get deploymentTimeout() {
    return parseInt(process.env.DEPLOYMENT_TIMEOUT) || 300000; // 5 minutes
  }

  get buildTimeout() {
    return parseInt(process.env.BUILD_TIMEOUT) || 600000; // 10 minutes
  }

  get gitCloneTimeout() {
    return parseInt(process.env.GIT_CLONE_TIMEOUT) || 120000; // 2 minutes
  }

  // Port Configuration
  get portRangeMin() {
    return parseInt(process.env.PORT_RANGE_MIN) || 3000;
  }

  get portRangeMax() {
    return parseInt(process.env.PORT_RANGE_MAX) || 9999;
  }

  get maxPortsPerUser() {
    return parseInt(process.env.MAX_PORTS_PER_USER) || 10;
  }

  // Cache Configuration
  get cacheDefaultTTL() {
    return parseInt(process.env.CACHE_DEFAULT_TTL) || 300; // 5 minutes
  }

  get cacheMaxSize() {
    return parseInt(process.env.CACHE_MAX_SIZE) || 1000;
  }

  // Security Configuration
  get sessionTimeout() {
    return parseInt(process.env.SESSION_TIMEOUT) || 3600000; // 1 hour
  }

  get maxLoginAttempts() {
    return parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
  }

  get lockoutDuration() {
    return parseInt(process.env.LOCKOUT_DURATION) || 900000; // 15 minutes
  }

  validateRequiredVariables() {
    if (this.isProduction) {
      const required = ['MONGO_URL', 'REDIS_URL', 'JWT_SECRET'];
      const missing = required.filter(key => !process.env[key]);
      
      if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
      }
    }
  }
}

// Export singleton instance
const config = new EnvironmentConfig();
module.exports = config;
