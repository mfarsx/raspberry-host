// MongoDB initialization script for Raspberry Pi Hosting Platform
// This script sets up the database, users, and collections

// Switch to the application database
db = db.getSiblingDB('pi_app');

// Create application user
db.createUser({
  user: 'pi_user',
  pwd: 'pi_password123',
  roles: [
    {
      role: 'readWrite',
      db: 'pi_app'
    }
  ]
});

// Create collections with initial data
db.createCollection('users');
db.createCollection('projects');
db.createCollection('deployments');
db.createCollection('logs');
db.createCollection('system_metrics');

// Insert initial admin user
db.users.insertOne({
  username: 'admin',
  email: 'admin@localhost',
  password: '$2b$10$rQZ8K9mN2pL3sT4uV5wX6yZ7aB8cD9eF0gH1iJ2kL3mN4oP5qR6sT7uV8wX9yZ', // hashed password for 'admin123'
  role: 'admin',
  createdAt: new Date(),
  updatedAt: new Date(),
  isActive: true
});

// Create indexes for better performance
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ email: 1 }, { unique: true });
db.projects.createIndex({ name: 1 }, { unique: true });
db.projects.createIndex({ userId: 1 });
db.deployments.createIndex({ projectId: 1 });
db.deployments.createIndex({ status: 1 });
db.deployments.createIndex({ createdAt: -1 });
db.logs.createIndex({ timestamp: -1 });
db.system_metrics.createIndex({ timestamp: -1 });

print('MongoDB initialization completed successfully');