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
