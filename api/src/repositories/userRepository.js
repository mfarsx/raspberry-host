const User = require('../models/User');
const { logger } = require('../config/logger');

class UserRepository {
  /**
   * Create a new user
   */
  async create(userData) {
    try {
      const user = new User(userData);
      await user.save();
      logger.info(`User created: ${user.username} (${user.email})`);
      return user;
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Find user by ID
   */
  async findById(id) {
    try {
      return await User.findById(id);
    } catch (error) {
      logger.error('Error finding user by ID:', error);
      throw error;
    }
  }

  /**
   * Find user by email or username
   */
  async findByEmailOrUsername(identifier) {
    try {
      return await User.findByEmailOrUsername(identifier);
    } catch (error) {
      logger.error('Error finding user by email/username:', error);
      throw error;
    }
  }

  /**
   * Find user by email
   */
  async findByEmail(email) {
    try {
      return await User.findOne({ email: email.toLowerCase() });
    } catch (error) {
      logger.error('Error finding user by email:', error);
      throw error;
    }
  }

  /**
   * Find user by username
   */
  async findByUsername(username) {
    try {
      return await User.findOne({ username });
    } catch (error) {
      logger.error('Error finding user by username:', error);
      throw error;
    }
  }

  /**
   * Update user
   */
  async update(id, updateData) {
    try {
      const user = await User.findByIdAndUpdate(
        id,
        { ...updateData, updatedAt: new Date() },
        { new: true, runValidators: true }
      );
      if (user) {
        logger.info(`User updated: ${user.username}`);
      }
      return user;
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Update user password
   */
  async updatePassword(id, newPassword) {
    try {
      const user = await User.findById(id);
      if (!user) return null;
      
      user.password = newPassword;
      await user.save();
      logger.info(`Password updated for user: ${user.username}`);
      return user;
    } catch (error) {
      logger.error('Error updating password:', error);
      throw error;
    }
  }

  /**
   * Update last login
   */
  async updateLastLogin(id) {
    try {
      const user = await User.findById(id);
      if (!user) return null;
      
      await user.updateLastLogin();
      logger.info(`Last login updated for user: ${user.username}`);
      return user;
    } catch (error) {
      logger.error('Error updating last login:', error);
      throw error;
    }
  }

  /**
   * Delete user
   */
  async delete(id) {
    try {
      const user = await User.findByIdAndDelete(id);
      if (user) {
        logger.info(`User deleted: ${user.username}`);
      }
      return user;
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Get all users with pagination
   */
  async findAll(page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;
      const users = await User.find()
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });
      
      const total = await User.countDocuments();
      
      return {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error finding all users:', error);
      throw error;
    }
  }

  /**
   * Check if email exists
   */
  async emailExists(email) {
    try {
      const count = await User.countDocuments({ email: email.toLowerCase() });
      return count > 0;
    } catch (error) {
      logger.error('Error checking email existence:', error);
      throw error;
    }
  }

  /**
   * Check if username exists
   */
  async usernameExists(username) {
    try {
      const count = await User.countDocuments({ username });
      return count > 0;
    } catch (error) {
      logger.error('Error checking username existence:', error);
      throw error;
    }
  }

  /**
   * Create admin user if not exists
   */
  async createAdminIfNotExists() {
    try {
      const adminExists = await User.findOne({ roles: 'admin' });
      if (adminExists) {
        logger.info('Admin user already exists');
        return adminExists;
      }

      const adminUser = await User.createAdmin(
        'admin',
        'admin@example.com',
        'password'
      );
      
      logger.info('Default admin user created');
      return adminUser;
    } catch (error) {
      logger.error('Error creating admin user:', error);
      throw error;
    }
  }
}

module.exports = new UserRepository();