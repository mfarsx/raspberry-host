const mongoose = require('mongoose');
const { logger } = require('../config/logger');

/**
 * Modern Database Migration System
 * Handles database schema migrations and data transformations
 */
class DatabaseMigration {
  constructor() {
    this.migrations = new Map();
    this.migrationCollection = 'migrations';
  }

  /**
   * Register a migration
   */
  registerMigration(version, name, up, down) {
    this.migrations.set(version, {
      version,
      name,
      up,
      down,
      executed: false
    });
  }

  /**
   * Get migration collection
   */
  async getMigrationCollection() {
    return mongoose.connection.db.collection(this.migrationCollection);
  }

  /**
   * Get executed migrations
   */
  async getExecutedMigrations() {
    try {
      const collection = await this.getMigrationCollection();
      const migrations = await collection.find({}).sort({ version: 1 }).toArray();
      return migrations.map(m => m.version);
    } catch (error) {
      // Collection doesn't exist yet
      return [];
    }
  }

  /**
   * Mark migration as executed
   */
  async markMigrationExecuted(version, name) {
    const collection = await this.getMigrationCollection();
    await collection.insertOne({
      version,
      name,
      executedAt: new Date(),
      executedBy: 'system'
    });
  }

  /**
   * Mark migration as rolled back
   */
  async markMigrationRolledBack(version) {
    const collection = await this.getMigrationCollection();
    await collection.deleteOne({ version });
  }

  /**
   * Run all pending migrations
   */
  async runMigrations() {
    logger.info('Starting database migrations...');
    
    const executedMigrations = await this.getExecutedMigrations();
    const pendingMigrations = Array.from(this.migrations.values())
      .filter(migration => !executedMigrations.includes(migration.version))
      .sort((a, b) => a.version.localeCompare(b.version));

    if (pendingMigrations.length === 0) {
      logger.info('No pending migrations');
      return;
    }

    logger.info(`Found ${pendingMigrations.length} pending migrations`);

    for (const migration of pendingMigrations) {
      try {
        logger.info(`Running migration: ${migration.version} - ${migration.name}`);
        await migration.up();
        await this.markMigrationExecuted(migration.version, migration.name);
        logger.info(`Migration completed: ${migration.version} - ${migration.name}`);
      } catch (error) {
        logger.error(`Migration failed: ${migration.version} - ${migration.name}`, error);
        throw error;
      }
    }

    logger.info('All migrations completed successfully');
  }

  /**
   * Rollback last migration
   */
  async rollbackLastMigration() {
    logger.info('Rolling back last migration...');
    
    const executedMigrations = await this.getExecutedMigrations();
    if (executedMigrations.length === 0) {
      logger.info('No migrations to rollback');
      return;
    }

    const lastMigrationVersion = executedMigrations[executedMigrations.length - 1];
    const migration = this.migrations.get(lastMigrationVersion);

    if (!migration || !migration.down) {
      throw new Error(`Migration ${lastMigrationVersion} cannot be rolled back`);
    }

    try {
      logger.info(`Rolling back migration: ${migration.version} - ${migration.name}`);
      await migration.down();
      await this.markMigrationRolledBack(migration.version);
      logger.info(`Migration rolled back: ${migration.version} - ${migration.name}`);
    } catch (error) {
      logger.error(`Rollback failed: ${migration.version} - ${migration.name}`, error);
      throw error;
    }
  }

  /**
   * Get migration status
   */
  async getMigrationStatus() {
    const executedMigrations = await this.getExecutedMigrations();
    const allMigrations = Array.from(this.migrations.values())
      .sort((a, b) => a.version.localeCompare(b.version));

    return {
      total: allMigrations.length,
      executed: executedMigrations.length,
      pending: allMigrations.length - executedMigrations.length,
      migrations: allMigrations.map(migration => ({
        version: migration.version,
        name: migration.name,
        executed: executedMigrations.includes(migration.version)
      }))
    };
  }
}

/**
 * Migration definitions
 */
class MigrationDefinitions {
  constructor(migrationSystem) {
    this.migration = migrationSystem;
  }

  /**
   * Define all migrations
   */
  defineMigrations() {
    // Migration 001: Add compound indexes
    this.migration.registerMigration(
      '001',
      'Add compound indexes for better performance',
      async () => {
        const db = mongoose.connection.db;
        
        // Projects collection indexes
        await db.collection('projects').createIndex({ createdBy: 1, status: 1 });
        await db.collection('projects').createIndex({ status: 1, createdAt: -1 });
        await db.collection('projects').createIndex({ domain: 1, status: 1 });
        await db.collection('projects').createIndex({ port: 1, status: 1 });
        
        // Users collection indexes
        await db.collection('users').createIndex({ roles: 1, isActive: 1 });
        await db.collection('users').createIndex({ isActive: 1, lastLogin: -1 });
        
        logger.info('Compound indexes created successfully');
      },
      async () => {
        const db = mongoose.connection.db;
        
        // Drop compound indexes
        await db.collection('projects').dropIndex({ createdBy: 1, status: 1 });
        await db.collection('projects').dropIndex({ status: 1, createdAt: -1 });
        await db.collection('projects').dropIndex({ domain: 1, status: 1 });
        await db.collection('projects').dropIndex({ port: 1, status: 1 });
        
        await db.collection('users').dropIndex({ roles: 1, isActive: 1 });
        await db.collection('users').dropIndex({ isActive: 1, lastLogin: -1 });
        
        logger.info('Compound indexes dropped successfully');
      }
    );

    // Migration 002: Add soft delete fields
    this.migration.registerMigration(
      '002',
      'Add soft delete fields to projects and users',
      async () => {
        const db = mongoose.connection.db;
        
        // Add soft delete fields to projects
        await db.collection('projects').updateMany(
          { isDeleted: { $exists: false } },
          { $set: { isDeleted: false, deletedAt: null } }
        );
        
        // Add soft delete fields to users
        await db.collection('users').updateMany(
          { isDeleted: { $exists: false } },
          { $set: { isDeleted: false, deletedAt: null } }
        );
        
        logger.info('Soft delete fields added successfully');
      },
      async () => {
        const db = mongoose.connection.db;
        
        // Remove soft delete fields
        await db.collection('projects').updateMany(
          {},
          { $unset: { isDeleted: '', deletedAt: '' } }
        );
        
        await db.collection('users').updateMany(
          {},
          { $unset: { isDeleted: '', deletedAt: '' } }
        );
        
        logger.info('Soft delete fields removed successfully');
      }
    );

    // Migration 003: Add project metadata fields
    this.migration.registerMigration(
      '003',
      'Add project metadata and health tracking fields',
      async () => {
        const db = mongoose.connection.db;
        
        // Add metadata fields to projects
        await db.collection('projects').updateMany(
          { 
            metadata: { $exists: false },
            healthStatus: { $exists: false },
            lastHealthCheck: { $exists: false }
          },
          { 
            $set: { 
              metadata: {},
              healthStatus: 'unknown',
              lastHealthCheck: null
            } 
          }
        );
        
        logger.info('Project metadata fields added successfully');
      },
      async () => {
        const db = mongoose.connection.db;
        
        // Remove metadata fields
        await db.collection('projects').updateMany(
          {},
          { $unset: { metadata: '', healthStatus: '', lastHealthCheck: '' } }
        );
        
        logger.info('Project metadata fields removed successfully');
      }
    );

    // Migration 004: Add user preferences
    this.migration.registerMigration(
      '004',
      'Add user preferences and settings',
      async () => {
        const db = mongoose.connection.db;
        
        // Add preferences fields to users
        await db.collection('users').updateMany(
          { 
            preferences: { $exists: false },
            settings: { $exists: false }
          },
          { 
            $set: { 
              preferences: {
                theme: 'light',
                language: 'en',
                notifications: true
              },
              settings: {
                emailNotifications: true,
                projectUpdates: true,
                systemAlerts: true
              }
            } 
          }
        );
        
        logger.info('User preferences fields added successfully');
      },
      async () => {
        const db = mongoose.connection.db;
        
        // Remove preferences fields
        await db.collection('users').updateMany(
          {},
          { $unset: { preferences: '', settings: '' } }
        );
        
        logger.info('User preferences fields removed successfully');
      }
    );
  }
}

/**
 * Initialize migration system
 */
async function initializeMigrations() {
  const migrationSystem = new DatabaseMigration();
  const migrationDefinitions = new MigrationDefinitions(migrationSystem);
  
  // Define all migrations
  migrationDefinitions.defineMigrations();
  
  return migrationSystem;
}

module.exports = {
  DatabaseMigration,
  MigrationDefinitions,
  initializeMigrations
};