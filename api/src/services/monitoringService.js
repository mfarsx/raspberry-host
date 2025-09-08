const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const { logger, performanceLogger } = require('../config/logger');
const config = require('../config/environment');

const execAsync = promisify(exec);

/**
 * Monitoring Service - Collects system metrics and health data
 */
class MonitoringService {
  constructor() {
    this.logger = logger;
    this.metrics = {
      system: null,
      memory: null,
      cpu: null,
      disk: null,
      network: null,
      processes: null
    };
    this.lastUpdate = null;
    this.updateInterval = 30000; // 30 seconds
  }

  /**
   * Get comprehensive system metrics
   * @returns {Promise<Object>} System metrics
   */
  async getSystemMetrics() {
    const timer = performanceLogger.startTimer('System Metrics Collection');
    
    try {
      const [
        memoryMetrics,
        cpuMetrics,
        diskMetrics,
        networkMetrics,
        processMetrics
      ] = await Promise.all([
        this.getMemoryMetrics(),
        this.getCpuMetrics(),
        this.getDiskMetrics(),
        this.getNetworkMetrics(),
        this.getProcessMetrics()
      ]);

      const metrics = {
        timestamp: new Date().toISOString(),
        system: {
          platform: os.platform(),
          arch: os.arch(),
          hostname: os.hostname(),
          uptime: os.uptime(),
          loadAverage: os.loadavg(),
          nodeVersion: process.version,
          pid: process.pid
        },
        memory: memoryMetrics,
        cpu: cpuMetrics,
        disk: diskMetrics,
        network: networkMetrics,
        processes: processMetrics
      };

      this.metrics = metrics;
      this.lastUpdate = new Date();
      
      timer.end();
      return metrics;
    } catch (error) {
      this.logger.error('Failed to collect system metrics:', error);
      timer.end();
      throw error;
    }
  }

  /**
   * Get memory usage metrics
   * @returns {Promise<Object>} Memory metrics
   */
  async getMemoryMetrics() {
    try {
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;

      return {
        total: totalMemory,
        free: freeMemory,
        used: usedMemory,
        percentage: Math.round((usedMemory / totalMemory) * 100),
        cached: 0, // Would need additional system calls for accurate cached memory
        buffers: 0  // Would need additional system calls for accurate buffer memory
      };
    } catch (error) {
      this.logger.error('Failed to get memory metrics:', error);
      return null;
    }
  }

  /**
   * Get CPU usage metrics
   * @returns {Promise<Object>} CPU metrics
   */
  async getCpuMetrics() {
    try {
      const cpus = os.cpus();
      const loadAverage = os.loadavg();

      // Calculate CPU usage percentage
      let totalIdle = 0;
      let totalTick = 0;

      cpus.forEach(cpu => {
        for (const type in cpu.times) {
          totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
      });

      const cpuUsage = 100 - Math.round(100 * totalIdle / totalTick);

      return {
        cores: cpus.length,
        model: cpus[0].model,
        speed: cpus[0].speed,
        usage: cpuUsage,
        loadAverage: {
          '1min': loadAverage[0],
          '5min': loadAverage[1],
          '15min': loadAverage[2]
        }
      };
    } catch (error) {
      this.logger.error('Failed to get CPU metrics:', error);
      return null;
    }
  }

  /**
   * Get disk usage metrics
   * @returns {Promise<Object>} Disk metrics
   */
  async getDiskMetrics() {
    try {
      // Get disk usage using df command
      const { stdout } = await execAsync('df -h /');
      const lines = stdout.trim().split('\n');
      const data = lines[1].split(/\s+/);

      return {
        total: data[1],
        used: data[2],
        available: data[3],
        percentage: parseInt(data[4].replace('%', '')),
        mountPoint: data[5]
      };
    } catch (error) {
      this.logger.error('Failed to get disk metrics:', error);
      return null;
    }
  }

  /**
   * Get network interface metrics
   * @returns {Promise<Object>} Network metrics
   */
  async getNetworkMetrics() {
    try {
      const networkInterfaces = os.networkInterfaces();
      const interfaces = {};

      Object.keys(networkInterfaces).forEach(name => {
        const iface = networkInterfaces[name];
        interfaces[name] = iface.map(addr => ({
          address: addr.address,
          family: addr.family,
          internal: addr.internal,
          mac: addr.mac
        }));
      });

      return {
        interfaces,
        defaultGateway: null // Would need additional system calls
      };
    } catch (error) {
      this.logger.error('Failed to get network metrics:', error);
      return null;
    }
  }

  /**
   * Get process metrics
   * @returns {Promise<Object>} Process metrics
   */
  async getProcessMetrics() {
    try {
      // Get top processes using ps command
      const { stdout } = await execAsync('ps aux --sort=-%cpu | head -10');
      const lines = stdout.trim().split('\n');
      const processes = lines.slice(1).map(line => {
        const parts = line.trim().split(/\s+/);
        return {
          pid: parts[1],
          cpu: parseFloat(parts[2]),
          memory: parseFloat(parts[3]),
          command: parts.slice(10).join(' ')
        };
      });

      return {
        total: process.pid, // This would need actual process count
        topCpu: processes.slice(0, 5),
        topMemory: processes.slice(0, 5) // Simplified - would need separate query
      };
    } catch (error) {
      this.logger.error('Failed to get process metrics:', error);
      return null;
    }
  }

  /**
   * Get Docker container metrics
   * @returns {Promise<Object>} Docker metrics
   */
  async getDockerMetrics() {
    try {
      const { stdout } = await execAsync('docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"');
      const lines = stdout.trim().split('\n');
      const containers = lines.slice(1).map(line => {
        const parts = line.trim().split(/\s+/);
        return {
          container: parts[0],
          cpu: parts[1],
          memory: parts[2],
          network: parts[3],
          block: parts[4]
        };
      });

      return {
        containers,
        total: containers.length
      };
    } catch (error) {
      this.logger.error('Failed to get Docker metrics:', error);
      return null;
    }
  }

  /**
   * Get application-specific metrics
   * @returns {Promise<Object>} Application metrics
   */
  async getApplicationMetrics() {
    try {
      const memUsage = process.memoryUsage();
      
      return {
        nodejs: {
          memory: {
            rss: memUsage.rss,
            heapTotal: memUsage.heapTotal,
            heapUsed: memUsage.heapUsed,
            external: memUsage.external,
            arrayBuffers: memUsage.arrayBuffers
          },
          uptime: process.uptime(),
          version: process.version,
          platform: process.platform,
          arch: process.arch
        },
        environment: {
          nodeEnv: config.nodeEnv,
          port: config.port,
          logLevel: config.logLevel
        }
      };
    } catch (error) {
      this.logger.error('Failed to get application metrics:', error);
      return null;
    }
  }

  /**
   * Get health status
   * @returns {Promise<Object>} Health status
   */
  async getHealthStatus() {
    try {
      const metrics = await this.getSystemMetrics();
      const dockerMetrics = await this.getDockerMetrics();
      const appMetrics = await this.getApplicationMetrics();

      // Determine overall health
      const healthChecks = {
        memory: metrics.memory?.percentage < 90,
        disk: metrics.disk?.percentage < 90,
        cpu: metrics.cpu?.usage < 90,
        docker: dockerMetrics?.total >= 0 // Basic check
      };

      const overallHealth = Object.values(healthChecks).every(check => check);

      return {
        status: overallHealth ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        checks: healthChecks,
        metrics: {
          system: metrics,
          docker: dockerMetrics,
          application: appMetrics
        }
      };
    } catch (error) {
      this.logger.error('Failed to get health status:', error);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring() {
    this.logger.info('Starting system monitoring');
    
    setInterval(async () => {
      try {
        await this.getSystemMetrics();
      } catch (error) {
        this.logger.error('Monitoring interval error:', error);
      }
    }, this.updateInterval);
  }

  /**
   * Get cached metrics (if available)
   * @returns {Object|null} Cached metrics
   */
  getCachedMetrics() {
    if (this.lastUpdate && (Date.now() - this.lastUpdate.getTime()) < this.updateInterval) {
      return this.metrics;
    }
    return null;
  }
}

module.exports = MonitoringService;
