const User = require('../models/User');
const BaseRepository = require('./baseRepository');
const { logger } = require('../config/logger');
const { DatabaseErrorHandler, NotFoundError, ValidationError } = require('../utils/databaseErrors');

/**
 * Modern User Repository
 * Extends BaseRepository with user-specific operations
 */
class ModernUserRepository extends BaseRepository {
  constructor() {
    super(User, 'User');
  }

  /**
   * Find user by email or username
   */
  async findByEmailOrUsername(identifier) {
    return DatabaseErrorHandler.execute(async () => {
      return await this.findOne({
        $or: [
          { email: identifier.toLowerCase() },
          { username: identifier }
        ]
      });
    }, 'Finding user by email or username');
  }

  /**
   * Find user by email
   */
  async findByEmail(email) {
    return DatabaseErrorHandler.execute(async () => {
      return await this.findOne({ email: email.toLowerCase() });
    }, 'Finding user by email');
  }

  /**
   * Find user by username
   */
  async findByUsername(username) {
    return DatabaseErrorHandler.execute(async () => {
      return await this.findOne({ username });
    }, 'Finding user by username');
  }

  /**
   * Update user password
   */
  async updatePassword(id, newPassword) {
    return DatabaseErrorHandler.execute(async () => {
      const user = await this.findById(id);
      if (!user) {
        throw new NotFoundError('User');
      }
      
      user.password = newPassword;
      await user.save();
      
      logger.info(`Password updated for user: ${user.username}`);
      return user;
    }, 'Updating user password');
  }

  /**
   * Update last login
   */
  async updateLastLogin(id) {
    return DatabaseErrorHandler.execute(async () => {
      const updateData = { lastLogin: new Date() };
      const user = await this.updateById(id, updateData);
      
      logger.info(`Last login updated for user: ${user.username}`);
      return user;
    }, 'Updating last login');
  }

  /**
   * Check if email exists
   */
  async emailExists(email, excludeId = null) {
    return DatabaseErrorHandler.execute(async () => {
      const filter = { email: email.toLowerCase() };
      if (excludeId) {
        filter._id = { $ne: excludeId };
      }
      
      return await this.exists(filter);
    }, 'Checking email existence');
  }

  /**
   * Check if username exists
   */
  async usernameExists(username, excludeId = null) {
    return DatabaseErrorHandler.execute(async () => {
      const filter = { username };
      if (excludeId) {
        filter._id = { $ne: excludeId };
      }
      
      return await this.exists(filter);
    }, 'Checking username existence');
  }

  /**
   * Create admin user
   */
  async createAdmin(username, email, password) {
    return DatabaseErrorHandler.execute(async () => {
      const adminData = {
        username,
        email: email.toLowerCase(),
        password,
        roles: ['admin'],
        isActive: true
      };
      
      const admin = await this.create(adminData);
      logger.info(`Admin user created: ${admin.username}`);
      return admin;
    }, 'Creating admin user');
  }

  /**
   * Create admin user if not exists
   */
  async createAdminIfNotExists() {
    return DatabaseErrorHandler.execute(async () => {
      const adminExists = await this.findOne({ roles: 'admin' });
      if (adminExists) {
        logger.info('Admin user already exists');
        return adminExists;
      }

      const adminUser = await this.createAdmin(
        'admin',
        'admin@example.com',
        'password'
      );
      
      logger.info('Default admin user created');
      return adminUser;
    }, 'Creating admin user if not exists');
  }

  /**
   * Get users with pagination and filtering
   */
  async findUsersWithPagination(options = {}) {
    return DatabaseErrorHandler.execute(async () => {
      const {
        page = 1,
        limit = 10,
        search = null,
        role = null,
        isActive = null,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      const filter = {};
      
      // Search filter
      if (search) {
        filter.$or = [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }
      
      // Role filter
      if (role) {
        filter.roles = role;
      }
      
      // Active status filter
      if (isActive !== null) {
        filter.isActive = isActive;
      }
      
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
      
      return await this.findWithPagination({
        page,
        limit,
        filter,
        sort,
        select: '-password' // Exclude password from results
      });
    }, 'Finding users with pagination');
  }

  /**
   * Update user roles
   */
  async updateRoles(id, roles) {
    return DatabaseErrorHandler.execute(async () => {
      const updateData = { roles };
      const user = await this.updateById(id, updateData);
      
      logger.info(`Roles updated for user: ${user.username}`, { roles });
      return user;
    }, 'Updating user roles');
  }

  /**
   * Activate/Deactivate user
   */
  async setActiveStatus(id, isActive) {
    return DatabaseErrorHandler.execute(async () => {
      const updateData = { isActive };
      const user = await this.updateById(id, updateData);
      
      logger.info(`User ${isActive ? 'activated' : 'deactivated'}: ${user.username}`);
      return user;
    }, 'Setting user active status');
  }

  /**
   * Get user statistics
   */
  async getUserStatistics() {
    return DatabaseErrorHandler.execute(async () => {
      const pipeline = [
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            activeUsers: {
              $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
            },
            inactiveUsers: {
              $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] }
            },
            adminUsers: {
              $sum: { $cond: [{ $in: ['admin', '$roles'] }, 1, 0] }
            },
            regularUsers: {
              $sum: { $cond: [{ $not: { $in: ['admin', '$roles'] } }, 1, 0] }
            },
            recentLogins: {
              $sum: {
                $cond: [
                  {
                    $gte: [
                      '$lastLogin',
                      { $subtract: ['$$NOW', 7 * 24 * 60 * 60 * 1000] } // 7 days ago
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ];
      
      const result = await this.aggregate(pipeline);
      return result[0] || {
        totalUsers: 0,
        activeUsers: 0,
        inactiveUsers: 0,
        adminUsers: 0,
        regularUsers: 0,
        recentLogins: 0
      };
    }, 'Getting user statistics');
  }

  /**
   * Get users by role
   */
  async getUsersByRole(role) {
    return DatabaseErrorHandler.execute(async () => {
      return await this.findMany(
        { roles: role },
        {
          select: '-password',
          sort: { createdAt: -1 }
        }
      );
    }, 'Getting users by role');
  }

  /**
   * Get inactive users
   */
  async getInactiveUsers(daysSinceLastLogin = 30) {
    return DatabaseErrorHandler.execute(async () => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastLogin);
      
      return await this.findMany(
        {
          $or: [
            { lastLogin: { $lt: cutoffDate } },
            { lastLogin: null }
          ],
          isActive: true
        },
        {
          select: '-password',
          sort: { lastLogin: 1 }
        }
      );
    }, 'Getting inactive users');
  }

  /**
   * Bulk update user status
   */
  async bulkUpdateStatus(userIds, isActive) {
    return DatabaseErrorHandler.execute(async () => {
      const operations = userIds.map(id => ({
        updateOne: {
          filter: { _id: id },
          update: { 
            isActive,
            updatedAt: new Date()
          }
        }
      }));
      
      const result = await this.bulkWrite(operations);
      logger.info(`Bulk ${isActive ? 'activated' : 'deactivated'} ${result.modifiedCount} users`);
      return result;
    }, 'Bulk updating user status');
  }

  /**
   * Search users with advanced filtering
   */
  async searchUsers(searchCriteria, options = {}) {
    return DatabaseErrorHandler.execute(async () => {
      const {
        query = '',
        role = null,
        isActive = null,
        dateRange = null,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = searchCriteria;

      const filter = {};
      
      // Text search
      if (query) {
        filter.$or = [
          { username: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } }
        ];
      }
      
      // Role filter
      if (role) {
        filter.roles = role;
      }
      
      // Active status filter
      if (isActive !== null) {
        filter.isActive = isActive;
      }
      
      // Date range filter
      if (dateRange && dateRange.start && dateRange.end) {
        filter.createdAt = {
          $gte: new Date(dateRange.start),
          $lte: new Date(dateRange.end)
        };
      }
      
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
      
      return await this.findWithPagination({
        ...options,
        filter,
        sort,
        select: '-password'
      });
    }, 'Searching users');
  }
}

module.exports = ModernUserRepository;