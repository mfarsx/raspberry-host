const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const mongoose = require('mongoose');
const { logger } = require('../config/logger');
const config = require('../config/environment');

const execAsync = promisify(exec);

/**
 * Database Backup and Recovery Utility
 * Provides comprehensive backup and recovery functionality
 */
class DatabaseBackup {
  constructor() {
    this.backupDir = path.join(process.cwd(), 'backups');
    this.maxBackups = parseInt(process.env.MAX_DB_BACKUPS) || 10;
    this.compressionEnabled = process.env.BACKUP_COMPRESSION !== 'false';
  }

  /**
   * Create a full database backup
   */
  async createBackup(options = {}) {
    try {
      const {
        name = null,
        description = '',
        includeIndexes = true,
        compression = this.compressionEnabled
      } = options;

      // Ensure backup directory exists
      await this.ensureBackupDirectory();

      // Generate backup name
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = name || `backup-${timestamp}`;
      const backupPath = path.join(this.backupDir, backupName);

      logger.info(`Starting database backup: ${backupName}`);

      // Create backup metadata
      const metadata = {
        name: backupName,
        description,
        timestamp: new Date().toISOString(),
        database: mongoose.connection.name,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        version: await this.getDatabaseVersion(),
        collections: await this.getCollectionInfo(),
        options: {
          includeIndexes,
          compression
        }
      };

      // Perform backup based on environment
      if (this.isDockerEnvironment()) {
        await this.createDockerBackup(backupPath, metadata, options);
      } else {
        await this.createLocalBackup(backupPath, metadata, options);
      }

      // Save metadata
      const metadataPath = `${backupPath}.metadata.json`;
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

      // Clean up old backups
      await this.cleanupOldBackups();

      logger.info(`Database backup completed: ${backupName}`);
      return {
        success: true,
        backupName,
        backupPath,
        metadataPath,
        size: await this.getBackupSize(backupPath),
        metadata
      };
    } catch (error) {
      logger.error('Database backup failed:', error);
      throw error;
    }
  }

  /**
   * Restore database from backup
   */
  async restoreBackup(backupName, options = {}) {
    try {
      const {
        dropExisting = false,
        preserveIndexes = true,
        collections = null
      } = options;

      const backupPath = path.join(this.backupDir, backupName);
      const metadataPath = `${backupPath}.metadata.json`;

      // Check if backup exists
      await fs.access(backupPath);
      await fs.access(metadataPath);

      // Load metadata
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));

      logger.info(`Starting database restore: ${backupName}`);

      // Perform restore based on environment
      if (this.isDockerEnvironment()) {
        await this.restoreDockerBackup(backupPath, metadata, options);
      } else {
        await this.restoreLocalBackup(backupPath, metadata, options);
      }

      logger.info(`Database restore completed: ${backupName}`);
      return {
        success: true,
        backupName,
        restoredCollections: metadata.collections.map(c => c.name),
        metadata
      };
    } catch (error) {
      logger.error('Database restore failed:', error);
      throw error;
    }
  }

  /**
   * List available backups
   */
  async listBackups() {
    try {
      await this.ensureBackupDirectory();
      const files = await fs.readdir(this.backupDir);
      
      const backups = [];
      
      for (const file of files) {
        if (file.endsWith('.metadata.json')) {
          const metadataPath = path.join(this.backupDir, file);
          const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
          
          const backupPath = path.join(this.backupDir, metadata.name);
          const stats = await fs.stat(backupPath).catch(() => null);
          
          backups.push({
            name: metadata.name,
            timestamp: metadata.timestamp,
            description: metadata.description,
            size: stats ? await this.getBackupSize(backupPath) : 0,
            collections: metadata.collections.length,
            database: metadata.database,
            metadata
          });
        }
      }
      
      return backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (error) {
      logger.error('Failed to list backups:', error);
      throw error;
    }
  }

  /**
   * Delete a backup
   */
  async deleteBackup(backupName) {
    try {
      const backupPath = path.join(this.backupDir, backupName);
      const metadataPath = `${backupPath}.metadata.json`;

      // Check if backup exists
      await fs.access(backupPath);
      await fs.access(metadataPath);

      // Delete backup files
      await fs.unlink(backupPath);
      await fs.unlink(metadataPath);

      logger.info(`Backup deleted: ${backupName}`);
      return { success: true, backupName };
    } catch (error) {
      logger.error('Failed to delete backup:', error);
      throw error;
    }
  }

  /**
   * Create Docker-based backup
   */
  async createDockerBackup(backupPath, metadata, options) {
    const { includeIndexes, compression } = options;
    
    // Use mongodump in Docker container
    const mongoContainer = await this.getMongoContainerName();
    const dumpCommand = `docker exec ${mongoContainer} mongodump --db ${metadata.database} --out /tmp/backup`;
    
    if (!includeIndexes) {
      dumpCommand += ' --noIndexes';
    }

    await execAsync(dumpCommand);
    
    // Copy backup from container
    const copyCommand = `docker cp ${mongoContainer}:/tmp/backup ${backupPath}`;
    await execAsync(copyCommand);
    
    // Compress if requested
    if (compression) {
      await this.compressBackup(backupPath);
    }
    
    // Clean up container temp files
    await execAsync(`docker exec ${mongoContainer} rm -rf /tmp/backup`);
  }

  /**
   * Create local backup
   */
  async createLocalBackup(backupPath, metadata, options) {
    const { includeIndexes, compression } = options;
    
    // Use mongodump locally
    const dumpCommand = `mongodump --db ${metadata.database} --out ${backupPath}`;
    
    if (!includeIndexes) {
      dumpCommand += ' --noIndexes';
    }

    await execAsync(dumpCommand);
    
    // Compress if requested
    if (compression) {
      await this.compressBackup(backupPath);
    }
  }

  /**
   * Restore Docker-based backup
   */
  async restoreDockerBackup(backupPath, metadata, options) {
    const { dropExisting, preserveIndexes } = options;
    
    const mongoContainer = await this.getMongoContainerName();
    
    // Copy backup to container
    const copyCommand = `docker cp ${backupPath} ${mongoContainer}:/tmp/restore`;
    await execAsync(copyCommand);
    
    // Drop existing database if requested
    if (dropExisting) {
      await execAsync(`docker exec ${mongoContainer} mongo ${metadata.database} --eval "db.dropDatabase()"`);
    }
    
    // Restore database
    const restoreCommand = `docker exec ${mongoContainer} mongorestore --db ${metadata.database} /tmp/restore/${metadata.database}`;
    
    if (!preserveIndexes) {
      restoreCommand += ' --noIndexRestore';
    }
    
    await execAsync(restoreCommand);
    
    // Clean up container temp files
    await execAsync(`docker exec ${mongoContainer} rm -rf /tmp/restore`);
  }

  /**
   * Restore local backup
   */
  async restoreLocalBackup(backupPath, metadata, options) {
    const { dropExisting, preserveIndexes } = options;
    
    // Drop existing database if requested
    if (dropExisting) {
      await execAsync(`mongo ${metadata.database} --eval "db.dropDatabase()"`);
    }
    
    // Restore database
    const restoreCommand = `mongorestore --db ${metadata.database} ${backupPath}/${metadata.database}`;
    
    if (!preserveIndexes) {
      restoreCommand += ' --noIndexRestore';
    }
    
    await execAsync(restoreCommand);
  }

  /**
   * Compress backup directory
   */
  async compressBackup(backupPath) {
    const compressedPath = `${backupPath}.tar.gz`;
    const command = `tar -czf ${compressedPath} -C ${path.dirname(backupPath)} ${path.basename(backupPath)}`;
    
    await execAsync(command);
    
    // Remove uncompressed directory
    await fs.rmdir(backupPath, { recursive: true });
    
    return compressedPath;
  }

  /**
   * Decompress backup
   */
  async decompressBackup(backupPath) {
    const decompressedPath = backupPath.replace('.tar.gz', '');
    const command = `tar -xzf ${backupPath} -C ${path.dirname(backupPath)}`;
    
    await execAsync(command);
    
    return decompressedPath;
  }

  /**
   * Get database version
   */
  async getDatabaseVersion() {
    try {
      const result = await mongoose.connection.db.admin().serverStatus();
      return result.version || 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Get collection information
   */
  async getCollectionInfo() {
    try {
      const db = mongoose.connection.db;
      const collections = await db.listCollections().toArray();
      
      const collectionInfo = [];
      for (const collection of collections) {
        const count = await db.collection(collection.name).countDocuments();
        collectionInfo.push({
          name: collection.name,
          count: count,
          size: collection.size || 0
        });
      }
      
      return collectionInfo;
    } catch (error) {
      logger.error('Failed to get collection info:', error);
      return [];
    }
  }

  /**
   * Get backup size
   */
  async getBackupSize(backupPath) {
    try {
      const stats = await fs.stat(backupPath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Ensure backup directory exists
   */
  async ensureBackupDirectory() {
    try {
      await fs.access(this.backupDir);
    } catch (error) {
      await fs.mkdir(this.backupDir, { recursive: true });
    }
  }

  /**
   * Clean up old backups
   */
  async cleanupOldBackups() {
    try {
      const backups = await this.listBackups();
      
      if (backups.length > this.maxBackups) {
        const toDelete = backups.slice(this.maxBackups);
        
        for (const backup of toDelete) {
          await this.deleteBackup(backup.name);
        }
        
        logger.info(`Cleaned up ${toDelete.length} old backups`);
      }
    } catch (error) {
      logger.error('Failed to cleanup old backups:', error);
    }
  }

  /**
   * Check if running in Docker environment
   */
  isDockerEnvironment() {
    return process.env.DOCKER_ENV === 'true' || 
           fs.existsSync('/.dockerenv') ||
           process.env.MONGO_URL?.includes('mongodb:');
  }

  /**
   * Get MongoDB container name
   */
  async getMongoContainerName() {
    try {
      const { stdout } = await execAsync('docker ps --filter "ancestor=mongo" --format "{{.Names}}"');
      return stdout.trim().split('\n')[0];
    } catch (error) {
      throw new Error('MongoDB container not found');
    }
  }

  /**
   * Validate backup integrity
   */
  async validateBackup(backupName) {
    try {
      const backupPath = path.join(this.backupDir, backupName);
      const metadataPath = `${backupPath}.metadata.json`;

      // Check if files exist
      await fs.access(backupPath);
      await fs.access(metadataPath);

      // Load metadata
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));

      // Check backup size
      const size = await this.getBackupSize(backupPath);
      
      return {
        valid: true,
        size,
        metadata,
        timestamp: metadata.timestamp
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Schedule automatic backups
   */
  scheduleAutomaticBackups(interval = 'daily') {
    const intervals = {
      hourly: 60 * 60 * 1000,
      daily: 24 * 60 * 60 * 1000,
      weekly: 7 * 24 * 60 * 60 * 1000
    };

    const intervalMs = intervals[interval] || intervals.daily;

    setInterval(async () => {
      try {
        const timestamp = new Date().toISOString();
        await this.createBackup({
          name: `auto-backup-${timestamp}`,
          description: `Automatic backup - ${interval}`,
          compression: true
        });
        logger.info(`Automatic backup completed: ${interval}`);
      } catch (error) {
        logger.error('Automatic backup failed:', error);
      }
    }, intervalMs);

    logger.info(`Automatic backups scheduled: ${interval}`);
  }
}

module.exports = DatabaseBackup;