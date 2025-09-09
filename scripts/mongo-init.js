// MongoDB initialization script for Raspberry Pi Hosting Platform
// This script creates the application database and user

// Switch to the application database
db = db.getSiblingDB('pi_app');

// Create application user
db.createUser({
  user: 'pi_user',
  pwd: 'devpassword', // This will be replaced by environment variable
  roles: [
    {
      role: 'readWrite',
      db: 'pi_app'
    }
  ]
});

// Create initial collections
db.createCollection('projects');
db.createCollection('users');
db.createCollection('deployments');

// Create indexes for better performance
db.projects.createIndex({ "name": 1 }, { unique: true });
db.projects.createIndex({ "status": 1 });
db.projects.createIndex({ "createdAt": 1 });
db.projects.createIndex({ "updatedAt": 1 });

db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "username": 1 }, { unique: true });

db.deployments.createIndex({ "projectId": 1 });
db.deployments.createIndex({ "status": 1 });
db.deployments.createIndex({ "createdAt": 1 });

// Insert initial data
db.projects.insertOne({
  name: 'sample-website',
  description: 'Sample website project',
  repository: 'https://github.com/example/sample-website.git',
  domain: 'sample.yourdomain.com',
  port: 80,
  status: 'stopped',
  createdAt: new Date(),
  updatedAt: new Date()
});

print('MongoDB initialization completed successfully!');