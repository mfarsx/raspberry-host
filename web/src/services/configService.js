import apiClient from '../config/axios';

/**
 * Configuration Service - Handles fetching configuration from API
 */
class ConfigService {
  constructor() {
    this.cache = null;
    this.cacheTimestamp = null;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get all configuration from API
   * @returns {Promise<Object>} Configuration object
   */
  async getAllConfig() {
    // Check cache first
    if (this.cache && this.cacheTimestamp && 
        (Date.now() - this.cacheTimestamp) < this.cacheTimeout) {
      return this.cache;
    }

    try {
      const response = await apiClient.get('/config');
      this.cache = response.data.data;
      this.cacheTimestamp = Date.now();
      return this.cache;
    } catch (error) {
      console.error('Failed to fetch configuration:', error);
      // Return fallback configuration
      return this.getFallbackConfig();
    }
  }

  /**
   * Get app configuration
   * @returns {Promise<Object>} App configuration
   */
  async getAppConfig() {
    try {
      const response = await apiClient.get('/config/app');
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch app configuration:', error);
      return this.getFallbackAppConfig();
    }
  }

  /**
   * Get system configuration
   * @returns {Promise<Object>} System configuration
   */
  async getSystemConfig() {
    try {
      const response = await apiClient.get('/config/system');
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch system configuration:', error);
      return this.getFallbackSystemConfig();
    }
  }

  /**
   * Get UI configuration
   * @returns {Promise<Object>} UI configuration
   */
  async getUIConfig() {
    try {
      const response = await apiClient.get('/config/ui');
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch UI configuration:', error);
      return this.getFallbackUIConfig();
    }
  }

  /**
   * Clear configuration cache
   */
  clearCache() {
    this.cache = null;
    this.cacheTimestamp = null;
  }

  /**
   * Get fallback configuration when API is unavailable
   * @returns {Object} Fallback configuration
   */
  getFallbackConfig() {
    return {
      app: this.getFallbackAppConfig(),
      system: this.getFallbackSystemConfig(),
      ui: this.getFallbackUIConfig(),
      timestamp: new Date().toISOString(),
      environment: 'fallback'
    };
  }

  /**
   * Get fallback app configuration
   * @returns {Object} Fallback app configuration
   */
  getFallbackAppConfig() {
    return {
      name: 'Raspberry Pi Hosting Platform',
      version: '1.0.0',
      platform: 'ARM64',
      features: {
        autoSSL: true,
        dockerSupport: true,
        gitIntegration: true,
        monitoring: true,
        userManagement: true,
        analytics: false
      },
      branding: {
        logo: '🍓',
        primaryColor: '#007bff',
        secondaryColor: '#6c757d'
      }
    };
  }

  /**
   * Get fallback system configuration
   * @returns {Object} Fallback system configuration
   */
  getFallbackSystemConfig() {
    return {
      defaultPort: 3000,
      refreshInterval: 30000,
      shell: '/bin/sh',
      logConfig: {
        tail: 100,
        follow: true,
        timestamps: true
      },
      websocket: {
        url: process.env.REACT_APP_WS_URL || 'http://localhost:3001',
        reconnectAttempts: 5,
        reconnectDelay: 1000
      },
      deployment: {
        maxProjects: 10,
        allowedPorts: [3000, 3001, 8080, 8081, 9000, 9001],
        defaultDomain: 'localhost'
      }
    };
  }

  /**
   * Get fallback UI configuration
   * @returns {Object} Fallback UI configuration
   */
  getFallbackUIConfig() {
    return {
      placeholders: {
        domain: 'myproject.example.com',
        email: 'admin@example.com',
        repository: 'https://github.com/username/repository.git',
        projectName: 'my-awesome-project'
      },
      demoCredentials: {
        username: 'admin',
        password: 'demo123',
        email: 'admin@example.com'
      },
      messages: {
        welcomeMessage: 'Welcome to your personal hosting platform! Deploy and manage multiple websites and applications.',
        noProjectsMessage: 'No projects deployed yet. Deploy your first project to get started.',
        deploymentGuide: {
          title: 'Deployment Guide',
          steps: [
            {
              title: 'Prepare Your Project',
              description: 'Make sure your project has a Dockerfile in the root directory. The platform will automatically build and run your project using Docker.'
            },
            {
              title: 'Configure Domain',
              description: 'Set up DNS A/AAAA records pointing to your Raspberry Pi\'s IP address. The platform will automatically configure SSL certificates.'
            },
            {
              title: 'Environment Variables',
              description: 'Add any environment variables your application needs (database URLs, API keys, etc.).'
            },
            {
              title: 'Build Commands',
              description: 'Specify build commands if your project needs compilation (e.g., npm run build). Leave empty for projects that don\'t need building.'
            }
          ]
        }
      },
      theme: {
        darkMode: false,
        customCSS: null
      }
    };
  }
}

// Export singleton instance
const configService = new ConfigService();
export default configService;