const { logger } = require("../config/logger");
const ResponseHelper = require("../utils/responseHelper");
const config = require("../config/environment");

/**
 * ConfigController - Handles configuration endpoints for frontend
 */
class ConfigController {
  /**
   * Get application configuration
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  getAppConfig(req, res) {
    try {
      const appConfig = {
        name: process.env.APP_NAME || "Raspberry Pi Hosting Platform",
        version: process.env.APP_VERSION || "1.0.0",
        platform: this.getPlatformInfo(),
        features: this.getFeatureFlags(),
        branding: {
          logo: process.env.APP_LOGO || "🍓",
          primaryColor: process.env.APP_PRIMARY_COLOR || "#007bff",
          secondaryColor: process.env.APP_SECONDARY_COLOR || "#6c757d"
        }
      };

      logger.info("App config endpoint accessed");
      return ResponseHelper.success(res, appConfig);
    } catch (error) {
      logger.error("App config endpoint error:", error);
      return ResponseHelper.error(res, "Failed to get app configuration", 500);
    }
  }

  /**
   * Get system configuration
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  getSystemConfig(req, res) {
    try {
      const systemConfig = {
        defaultPort: 3000,
        refreshInterval: parseInt(process.env.REFRESH_INTERVAL) || 30000,
        shell: process.env.DEFAULT_SHELL || "/bin/sh",
        logConfig: {
          tail: parseInt(process.env.LOG_TAIL_LINES) || 100,
          follow: process.env.LOG_FOLLOW !== 'false',
          timestamps: process.env.LOG_TIMESTAMPS !== 'false'
        },
        websocket: {
          url: process.env.WS_URL || `http://${config.domain}:${config.port}`,
          reconnectAttempts: parseInt(process.env.WS_RECONNECT_ATTEMPTS) || 5,
          reconnectDelay: parseInt(process.env.WS_RECONNECT_DELAY) || 1000
        },
        deployment: {
          maxProjects: parseInt(process.env.MAX_PROJECTS) || 10,
          allowedPorts: this.getAllowedPorts(),
          defaultDomain: process.env.DEFAULT_DOMAIN || `${config.domain}`
        }
      };

      logger.info("System config endpoint accessed");
      return ResponseHelper.success(res, systemConfig);
    } catch (error) {
      logger.error("System config endpoint error:", error);
      return ResponseHelper.error(res, "Failed to get system configuration", 500);
    }
  }

  /**
   * Get UI configuration
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  getUIConfig(req, res) {
    try {
      const uiConfig = {
        placeholders: {
          domain: process.env.PLACEHOLDER_DOMAIN || "myproject.example.com",
          email: process.env.PLACEHOLDER_EMAIL || "admin@example.com",
          repository: process.env.PLACEHOLDER_REPOSITORY || "https://github.com/username/repository.git",
          projectName: process.env.PLACEHOLDER_PROJECT_NAME || "my-awesome-project"
        },
        demoCredentials: {
          username: process.env.DEMO_USERNAME || "admin",
          password: process.env.DEMO_PASSWORD || "demo123",
          email: process.env.DEMO_EMAIL || "admin@example.com"
        },
        messages: {
          welcomeMessage: process.env.WELCOME_MESSAGE || "Welcome to your personal hosting platform! Deploy and manage multiple websites and applications.",
          noProjectsMessage: process.env.NO_PROJECTS_MESSAGE || "No projects deployed yet. Deploy your first project to get started.",
          deploymentGuide: {
            title: process.env.DEPLOYMENT_GUIDE_TITLE || "Deployment Guide",
            steps: this.getDeploymentGuideSteps()
          }
        },
        theme: {
          darkMode: process.env.ENABLE_DARK_MODE === 'true',
          customCSS: process.env.CUSTOM_CSS_URL || null
        }
      };

      logger.info("UI config endpoint accessed");
      return ResponseHelper.success(res, uiConfig);
    } catch (error) {
      logger.error("UI config endpoint error:", error);
      return ResponseHelper.error(res, "Failed to get UI configuration", 500);
    }
  }

  /**
   * Get all configuration in one endpoint
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  getAllConfig(req, res) {
    try {
      const allConfig = {
        app: this.getAppConfigData(),
        system: this.getSystemConfigData(),
        ui: this.getUIConfigData(),
        timestamp: new Date().toISOString(),
        environment: config.nodeEnv
      };

      logger.info("All config endpoint accessed");
      return ResponseHelper.success(res, allConfig);
    } catch (error) {
      logger.error("All config endpoint error:", error);
      return ResponseHelper.error(res, "Failed to get configuration", 500);
    }
  }

  // Helper methods
  getPlatformInfo() {
    const os = require("os");
    const platform = os.platform();
    const arch = os.arch();
    
    if (platform === "linux" && arch === "arm64") {
      return "ARM64";
    } else if (platform === "linux" && arch === "arm") {
      return "ARM32";
    } else if (platform === "linux") {
      return "Linux";
    } else if (platform === "darwin") {
      return "macOS";
    } else if (platform === "win32") {
      return "Windows";
    }
    
    return `${platform} ${arch}`;
  }

  getFeatureFlags() {
    return {
      autoSSL: process.env.ENABLE_AUTO_SSL !== 'false',
      dockerSupport: process.env.ENABLE_DOCKER !== 'false',
      gitIntegration: process.env.ENABLE_GIT !== 'false',
      monitoring: process.env.ENABLE_MONITORING !== 'false',
      userManagement: process.env.ENABLE_USER_MANAGEMENT !== 'false',
      analytics: process.env.ENABLE_ANALYTICS === 'true'
    };
  }

  getAllowedPorts() {
    const portsStr = process.env.ALLOWED_PORTS || "3000,3001,8080,8081,9000,9001";
    return portsStr.split(',').map(port => parseInt(port.trim())).filter(port => !isNaN(port));
  }

  getDeploymentGuideSteps() {
    return [
      {
        title: "Prepare Your Project",
        description: "Make sure your project has a Dockerfile in the root directory. The platform will automatically build and run your project using Docker."
      },
      {
        title: "Configure Domain",
        description: "Set up DNS A/AAAA records pointing to your Raspberry Pi's IP address. The platform will automatically configure SSL certificates."
      },
      {
        title: "Environment Variables",
        description: "Add any environment variables your application needs (database URLs, API keys, etc.)."
      },
      {
        title: "Build Commands",
        description: "Specify build commands if your project needs compilation (e.g., npm run build). Leave empty for projects that don't need building."
      }
    ];
  }

  getAppConfigData() {
    return {
      name: process.env.APP_NAME || "Raspberry Pi Hosting Platform",
      version: process.env.APP_VERSION || "1.0.0",
      platform: this.getPlatformInfo(),
      features: this.getFeatureFlags(),
      branding: {
        logo: process.env.APP_LOGO || "🍓",
        primaryColor: process.env.APP_PRIMARY_COLOR || "#007bff",
        secondaryColor: process.env.APP_SECONDARY_COLOR || "#6c757d"
      }
    };
  }

  getSystemConfigData() {
    return {
      defaultPort: parseInt(process.env.DEFAULT_PORT) || 3000,
      refreshInterval: parseInt(process.env.REFRESH_INTERVAL) || 30000,
      shell: process.env.DEFAULT_SHELL || "/bin/sh",
      logConfig: {
        tail: parseInt(process.env.LOG_TAIL_LINES) || 100,
        follow: process.env.LOG_FOLLOW !== 'false',
        timestamps: process.env.LOG_TIMESTAMPS !== 'false'
      },
      websocket: {
        url: process.env.WS_URL || `http://${config.domain}:${config.port}`,
        reconnectAttempts: parseInt(process.env.WS_RECONNECT_ATTEMPTS) || 5,
        reconnectDelay: parseInt(process.env.WS_RECONNECT_DELAY) || 1000
      },
      deployment: {
        maxProjects: parseInt(process.env.MAX_PROJECTS) || 10,
        allowedPorts: this.getAllowedPorts(),
        defaultDomain: process.env.DEFAULT_DOMAIN || `${config.domain}`
      }
    };
  }

  getUIConfigData() {
    return {
      placeholders: {
        domain: process.env.PLACEHOLDER_DOMAIN || "myproject.example.com",
        email: process.env.PLACEHOLDER_EMAIL || "admin@example.com",
        repository: process.env.PLACEHOLDER_REPOSITORY || "https://github.com/username/repository.git",
        projectName: process.env.PLACEHOLDER_PROJECT_NAME || "my-awesome-project"
      },
      demoCredentials: {
        username: process.env.DEMO_USERNAME || "admin",
        password: process.env.DEMO_PASSWORD || "demo123",
        email: process.env.DEMO_EMAIL || "admin@example.com"
      },
      messages: {
        welcomeMessage: process.env.WELCOME_MESSAGE || "Welcome to your personal hosting platform! Deploy and manage multiple websites and applications.",
        noProjectsMessage: process.env.NO_PROJECTS_MESSAGE || "No projects deployed yet. Deploy your first project to get started.",
        deploymentGuide: {
          title: process.env.DEPLOYMENT_GUIDE_TITLE || "Deployment Guide",
          steps: this.getDeploymentGuideSteps()
        }
      },
      theme: {
        darkMode: process.env.ENABLE_DARK_MODE === 'true',
        customCSS: process.env.CUSTOM_CSS_URL || null
      }
    };
  }
}

module.exports = ConfigController;