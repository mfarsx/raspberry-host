const mongoose = require('mongoose');
const { logger } = require('./logger');
const config = require('./environment');

const connectDatabase = async () => {
  try {
    const options = {
      maxPoolSize: config.mongoMaxPoolSize,
      serverSelectionTimeoutMS: config.mongoServerSelectionTimeout,
      socketTimeoutMS: config.mongoSocketTimeout,
    };

    await mongoose.connect(config.mongoUrl, options);
    
    logger.info('✅ Connected to MongoDB successfully');
    
    // Handle connection events
    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    throw error;
  }
};

const disconnectDatabase = async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error closing MongoDB connection:', error);
    throw error;
  }
};

module.exports = {
  connectDatabase,
  disconnectDatabase
};
