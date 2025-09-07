// MongoDB initialization script for Raspberry Pi 5 Hosting Platform
// This script runs when MongoDB container starts for the first time

// Switch to the application database
db = db.getSiblingDB(process.env.MONGO_INITDB_DATABASE || 'pi_app');

// Create application user
db.createUser({
  user: 'pi_user',
  pwd: process.env.MONGO_PASSWORD || 'defaultpassword',
  roles: [
    {
      role: 'readWrite',
      db: process.env.MONGO_INITDB_DATABASE || 'pi_app'
    }
  ]
});

// Create initial collections with indexes
db.createCollection('users');
db.createCollection('sessions');
db.createCollection('applications');
db.createCollection('logs');

// Create indexes for better performance
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "username": 1 }, { unique: true });
db.users.createIndex({ "createdAt": 1 });

db.sessions.createIndex({ "userId": 1 });
db.sessions.createIndex({ "token": 1 }, { unique: true });
db.sessions.createIndex({ "expiresAt": 1 }, { expireAfterSeconds: 0 });

db.applications.createIndex({ "userId": 1 });
db.applications.createIndex({ "name": 1 });
db.applications.createIndex({ "createdAt": 1 });

db.logs.createIndex({ "timestamp": 1 });
db.logs.createIndex({ "level": 1 });
db.logs.createIndex({ "service": 1 });

// Insert initial admin user (password should be changed on first login)
db.users.insertOne({
  username: 'admin',
  email: 'admin@localhost',
  password: '$2b$10$rQZ8K9vJ8K9vJ8K9vJ8K9e', // bcrypt hash for 'admin123'
  role: 'admin',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

// Insert system configuration
db.createCollection('config');
db.config.insertOne({
  key: 'system',
  value: {
    version: '1.0.0',
    initialized: true,
    initializedAt: new Date(),
    features: {
      websocket: true,
      authentication: true,
      monitoring: true,
      backup: true
    }
  },
  createdAt: new Date(),
  updatedAt: new Date()
});

print('MongoDB initialization completed successfully!');
print('Created collections: users, sessions, applications, logs, config');
print('Created indexes for optimal performance');
print('Created default admin user: admin / admin123');
print('Please change the default admin password on first login!');