const { exec } = require('child_process');
const { promisify } = require('util');
const BaseService = require('../utils/baseService');
const { ErrorFactory } = require('../utils/serviceErrors');

const execAsync = promisify(exec);

/**
 * Port Service - Modern port management with auto-assignment
 * Implements Strategy pattern for port discovery and Factory pattern for port assignment
 */
class PortService extends BaseService {
  constructor(dependencies = {}) {
    super('PortService', dependencies);
    
    this.config = {
      portRange: { min: 3000, max: 9999 },
      reservedPorts: new Set([22, 80, 443, 3001, 6379, 27017, 8080, 8443, 9000, 9090]),
      projectTypeDefaults: {
        web: 3000,
        api: 3001,
        database: 5432,
        redis: 6379,
        mongodb: 27017,
        nginx: 80,
        https: 443,
        default: 3000
      }
    };
  }

  /**
   * Get all used ports from multiple sources
   * @returns {Promise<Set<number>>} Combined set of used ports
   */
  async getAllUsedPorts() {
    return this.executeOperation('getAllUsedPorts', async () => {
      const [systemPorts, dockerPorts, projectPorts] = await Promise.all([
        this._getSystemPorts(),
        this._getDockerPorts(),
        this._getProjectPorts()
      ]);

      return new Set([...systemPorts, ...dockerPorts, ...projectPorts]);
    });
  }

  /**
   * Find available port with intelligent assignment
   * @param {Object} options - Assignment options
   * @returns {Promise<number>} Available port number
   */
  async findAvailablePort(options = {}) {
    return this.executeOperation('findAvailablePort', async () => {
      const {
        preferredPort = null,
        minPort = this.config.portRange.min,
        maxPort = this.config.portRange.max,
        allowReserved = false
      } = options;

      this._validatePortRange(minPort, maxPort);

      const usedPorts = await this.getAllUsedPorts();

      // Try preferred port first
      if (preferredPort && this._isPortAvailable(preferredPort, usedPorts, allowReserved)) {
        this.logger.info(`Using preferred port: ${preferredPort}`);
        return preferredPort;
      }

      // Find next available port
      for (let port = minPort; port <= maxPort; port++) {
        if (this._isPortAvailable(port, usedPorts, allowReserved)) {
          this.logger.info(`Found available port: ${port}`);
          return port;
        }
      }

      throw ErrorFactory.resourceExhausted('No available ports in range', 'portRange', { minPort, maxPort });
    });
  }

  /**
   * Auto-assign port for a project
   * @param {Object} project - Project configuration
   * @param {Object} options - Assignment options
   * @returns {Promise<number>} Assigned port number
   */
  async autoAssignPort(project, options = {}) {
    return this.executeOperation('autoAssignPort', async () => {
      const {
        preferredPort = null,
        projectType = 'web',
        allowReserved = false,
        minPort = this.config.portRange.min,
        maxPort = this.config.portRange.max
      } = options;

      const targetPort = preferredPort || this.config.projectTypeDefaults[projectType] || this.config.projectTypeDefaults.default;
      
      const assignedPort = await this.findAvailablePort({
        preferredPort: targetPort,
        minPort,
        maxPort,
        allowReserved
      });

      this.logger.info(`Auto-assigned port ${assignedPort} for project ${project.name || 'unknown'}`);
      return assignedPort;
    });
  }

  /**
   * Check if a port is currently in use
   * @param {number} port - Port number to check
   * @returns {Promise<boolean>} True if port is in use
   */
  async isPortInUse(port) {
    return this.executeOperation('isPortInUse', async () => {
      this._validatePort(port);

      try {
        const { stdout } = await execAsync(`netstat -tuln | grep ":${port} " | grep LISTEN`);
        return stdout.trim().length > 0;
      } catch (error) {
        try {
          const { stdout } = await execAsync(`ss -tuln | grep ":${port} " | grep LISTEN`);
          return stdout.trim().length > 0;
        } catch (ssError) {
          this.logger.warn('Failed to check port status:', error.message);
          return false;
        }
      }
    });
  }

  /**
   * Get comprehensive port statistics
   * @returns {Promise<Object>} Port statistics
   */
  async getPortStatistics() {
    return this.executeOperation('getPortStatistics', async () => {
      const [systemPorts, dockerPorts, projectPorts] = await Promise.all([
        this._getSystemPorts(),
        this._getDockerPorts(),
        this._getProjectPorts()
      ]);

      const allUsedPorts = new Set([...systemPorts, ...dockerPorts, ...projectPorts]);
      const availablePorts = this._findAvailablePortsInRange(allUsedPorts);

      return {
        totalUsed: allUsedPorts.size,
        systemUsed: systemPorts.size,
        dockerUsed: dockerPorts.size,
        projectUsed: projectPorts.size,
        availableInRange: availablePorts.length,
        reservedPorts: this.config.reservedPorts.size,
        portRange: this.config.portRange,
        availablePorts: availablePorts.slice(0, 10)
      };
    });
  }

  /**
   * Find multiple available ports in a range
   * @param {Object} options - Search options
   * @returns {Promise<number[]>} Array of available ports
   */
  async findAvailablePorts(options = {}) {
    return this.executeOperation('findAvailablePorts', async () => {
      const {
        min = this.config.portRange.min,
        max = this.config.portRange.max,
        count = 10
      } = options;

      this._validatePortRange(min, max);

      const usedPorts = await this.getAllUsedPorts();
      return this._findAvailablePortsInRange(usedPorts, min, max, count);
    });
  }

  // Private methods

  /**
   * Get ports used by system processes
   * @private
   */
  async _getSystemPorts() {
    try {
      const { stdout } = await execAsync('netstat -tuln | grep LISTEN | awk \'{print $4}\' | sed \'s/.*://\' | sort -n | uniq');
      return this._parsePortsFromOutput(stdout);
    } catch (error) {
      this.logger.warn('Failed to get system ports:', error.message);
      return new Set();
    }
  }

  /**
   * Get ports used by Docker containers
   * @private
   */
  async _getDockerPorts() {
    try {
      const { stdout } = await execAsync('docker ps --format "table {{.Ports}}" | grep -o "[0-9]*:[0-9]*" | cut -d: -f1 | sort -n | uniq');
      return this._parsePortsFromOutput(stdout);
    } catch (error) {
      this.logger.warn('Failed to get Docker ports:', error.message);
      return new Set();
    }
  }

  /**
   * Get ports used by existing projects
   * @private
   */
  async _getProjectPorts() {
    try {
      const projectRepository = this.dependencies.projectRepository;
      if (!projectRepository) {
        this.logger.warn('Project repository not available for port checking');
        return new Set();
      }
      
      const projects = await projectRepository.findAll();
      const usedPorts = new Set();
      
      projects.forEach(project => {
        const port = project.assignedPort || project.port;
        if (port && typeof port === 'number') {
          usedPorts.add(port);
        }
      });
      
      return usedPorts;
    } catch (error) {
      this.logger.error('Failed to get project ports:', error);
      return new Set();
    }
  }

  /**
   * Parse port numbers from command output
   * @private
   */
  _parsePortsFromOutput(output) {
    const ports = new Set();
    output.split('\n').forEach(line => {
      const port = parseInt(line.trim());
      if (!isNaN(port) && port > 0 && port <= 65535) {
        ports.add(port);
      }
    });
    return ports;
  }

  /**
   * Check if a port is available
   * @private
   */
  _isPortAvailable(port, usedPorts, allowReserved = false) {
    return this._validatePort(port) &&
           (allowReserved || !this.config.reservedPorts.has(port)) &&
           !usedPorts.has(port);
  }

  /**
   * Find available ports in a specific range
   * @private
   */
  _findAvailablePortsInRange(usedPorts, minPort = this.config.portRange.min, maxPort = this.config.portRange.max, maxCount = Infinity) {
    const availablePorts = [];
    for (let port = minPort; port <= maxPort && availablePorts.length < maxCount; port++) {
      if (this._isPortAvailable(port, usedPorts, false)) {
        availablePorts.push(port);
      }
    }
    return availablePorts;
  }

  /**
   * Validate port number
   * @private
   */
  _validatePort(port) {
    if (typeof port !== 'number' || !Number.isInteger(port) || port < 1 || port > 65535) {
      throw ErrorFactory.validation('Invalid port number', 'port', port);
    }
    return true;
  }

  /**
   * Validate port range
   * @private
   */
  _validatePortRange(minPort, maxPort) {
    if (minPort < 1 || maxPort > 65535 || minPort > maxPort) {
      throw ErrorFactory.validation('Invalid port range', 'portRange', { minPort, maxPort });
    }
  }
}

module.exports = PortService;