// Environment configuration with validation

const config = {
  // API Configuration
  API_URL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  WS_URL: process.env.REACT_APP_WS_URL || 'http://localhost:3001',
  
  // App Configuration
  APP_NAME: process.env.REACT_APP_NAME || 'Raspberry Pi Hosting Platform',
  APP_VERSION: process.env.REACT_APP_VERSION || '1.0.0',
  
  // Feature Flags
  ENABLE_DEVTOOLS: process.env.NODE_ENV === 'development',
  ENABLE_ANALYTICS: process.env.REACT_APP_ENABLE_ANALYTICS === 'true',
  
  // Security
  SESSION_TIMEOUT: parseInt(process.env.REACT_APP_SESSION_TIMEOUT) || 30 * 60 * 1000, // 30 minutes
  
  // Performance
  QUERY_STALE_TIME: parseInt(process.env.REACT_APP_QUERY_STALE_TIME) || 5 * 60 * 1000, // 5 minutes
  QUERY_CACHE_TIME: parseInt(process.env.REACT_APP_QUERY_CACHE_TIME) || 10 * 60 * 1000, // 10 minutes
  
  // WebSocket
  WS_RECONNECT_ATTEMPTS: parseInt(process.env.REACT_APP_WS_RECONNECT_ATTEMPTS) || 5,
  WS_RECONNECT_DELAY: parseInt(process.env.REACT_APP_WS_RECONNECT_DELAY) || 1000,
};

// Validation
const validateConfig = () => {
  const errors = [];
  
  if (!config.API_URL) errors.push('API_URL is required');
  if (!config.WS_URL) errors.push('WS_URL is required');
  if (config.SESSION_TIMEOUT < 60000) errors.push('SESSION_TIMEOUT must be at least 1 minute');
  if (config.WS_RECONNECT_ATTEMPTS < 1) errors.push('WS_RECONNECT_ATTEMPTS must be at least 1');
  
  if (errors.length > 0) {
    console.error('Configuration validation failed:', errors);
    throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
  }
};

// Validate configuration on import
if (process.env.NODE_ENV === 'development') {
  validateConfig();
}

export default config;