const ModernUserRepository = require('../repositories/modernUserRepository');
const DatabaseValidator = require('../utils/databaseValidator');
const { DatabaseErrorHandler, NotFoundError, ValidationError } = require('../utils/databaseErrors');
const { logger } = require('../config/logger');

/**
 * Modern User Service
 * Uses repository pattern and modern error handling
 */
class ModernUserService {
  constructor() {
    this.userRepository = new ModernUserRepository();
  }

  /**
   * Create a new user
   */
  async createUser(userData) {
    return DatabaseErrorHandler.execute(async () => {
      // Validate and sanitize input data
      const sanitizedData = DatabaseValidator.sanitizeUserData(userData);

      // Check if email already exists
      const emailExists = await this.userRepository.emailExists(sanitizedData.email);
      if (emailExists) {
        throw new ValidationError('Email is already in use');
      }

      // Check if username already exists
      const usernameExists = await this.userRepository.usernameExists(sanitizedData.username);
      if (usernameExists) {
        throw new ValidationError('Username is already in use');
      }

      // Create user
      const user = await this.userRepository.create(sanitizedData);
      
      logger.info(`User created: ${user.username}`);
      return user;
    }, 'Creating user');
  }

  /**
   * Get user by ID
   */
  async getUserById(userId) {
    return DatabaseErrorHandler.execute(async () => {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new NotFoundError('User');
      }
      return user;
    }, 'Getting user by ID');
  }

  /**
   * Get user by email or username
   */
  async getUserByIdentifier(identifier) {
    return DatabaseErrorHandler.execute(async () => {
      const sanitizedIdentifier = DatabaseValidator.sanitizeString(identifier, {
        trim: true,
        maxLength: 100
      });

      const user = await this.userRepository.findByEmailOrUsername(sanitizedIdentifier);
      if (!user) {
        throw new NotFoundError('User');
      }
      return user;
    }, 'Getting user by identifier');
  }

  /**
   * Update user
   */
  async updateUser(userId, updateData, requestingUserId = null) {
    return DatabaseErrorHandler.execute(async () => {
      // Get existing user
      const existingUser = await this.userRepository.findById(userId);
      if (!existingUser) {
        throw new NotFoundError('User');
      }

      // Check if requesting user has access (if provided)
      if (requestingUserId && existingUser._id.toString() !== requestingUserId) {
        // Check if requesting user is admin
        const requestingUser = await this.userRepository.findById(requestingUserId);
        if (!requestingUser || !requestingUser.roles.includes('admin')) {
          throw new ValidationError('Access denied to this user');
        }
      }

      // Validate and sanitize update data
      const sanitizedData = DatabaseValidator.sanitizeUserData(updateData);

      // Check email availability if email is being changed
      if (sanitizedData.email && sanitizedData.email !== existingUser.email) {
        const emailExists = await this.userRepository.emailExists(sanitizedData.email, userId);
        if (emailExists) {
          throw new ValidationError('Email is already in use');
        }
      }

      // Check username availability if username is being changed
      if (sanitizedData.username && sanitizedData.username !== existingUser.username) {
        const usernameExists = await this.userRepository.usernameExists(sanitizedData.username, userId);
        if (usernameExists) {
          throw new ValidationError('Username is already in use');
        }
      }

      // Update user
      const updatedUser = await this.userRepository.updateById(userId, sanitizedData);

      logger.info(`User updated: ${updatedUser.username}`);
      return updatedUser;
    }, 'Updating user');
  }

  /**
   * Update user password
   */
  async updateUserPassword(userId, newPassword, requestingUserId = null) {
    return DatabaseErrorHandler.execute(async () => {
      // Get existing user
      const existingUser = await this.userRepository.findById(userId);
      if (!existingUser) {
        throw new NotFoundError('User');
      }

      // Check if requesting user has access (if provided)
      if (requestingUserId && existingUser._id.toString() !== requestingUserId) {
        // Check if requesting user is admin
        const requestingUser = await this.userRepository.findById(requestingUserId);
        if (!requestingUser || !requestingUser.roles.includes('admin')) {
          throw new ValidationError('Access denied to this user');
        }
      }

      // Sanitize password
      const sanitizedPassword = DatabaseValidator.sanitizePassword(newPassword);

      // Update password
      const updatedUser = await this.userRepository.updatePassword(userId, sanitizedPassword);

      logger.info(`Password updated for user: ${updatedUser.username}`);
      return updatedUser;
    }, 'Updating user password');
  }

  /**
   * Update user roles
   */
  async updateUserRoles(userId, roles, requestingUserId) {
    return DatabaseErrorHandler.execute(async () => {
      // Check if requesting user is admin
      const requestingUser = await this.userRepository.findById(requestingUserId);
      if (!requestingUser || !requestingUser.roles.includes('admin')) {
        throw new ValidationError('Access denied - admin role required');
      }

      // Validate roles
      const validRoles = ['user', 'admin', 'moderator'];
      const sanitizedRoles = roles.filter(role => validRoles.includes(role));
      
      if (sanitizedRoles.length === 0) {
        throw new ValidationError('At least one valid role is required');
      }

      // Update roles
      const updatedUser = await this.userRepository.updateRoles(userId, sanitizedRoles);

      logger.info(`Roles updated for user: ${updatedUser.username}`, { roles: sanitizedRoles });
      return updatedUser;
    }, 'Updating user roles');
  }

  /**
   * Activate/Deactivate user
   */
  async setUserActiveStatus(userId, isActive, requestingUserId) {
    return DatabaseErrorHandler.execute(async () => {
      // Check if requesting user is admin
      const requestingUser = await this.userRepository.findById(requestingUserId);
      if (!requestingUser || !requestingUser.roles.includes('admin')) {
        throw new ValidationError('Access denied - admin role required');
      }

      // Update active status
      const updatedUser = await this.userRepository.setActiveStatus(userId, isActive);

      logger.info(`User ${isActive ? 'activated' : 'deactivated'}: ${updatedUser.username}`);
      return updatedUser;
    }, 'Setting user active status');
  }

  /**
   * Delete user (soft delete)
   */
  async deleteUser(userId, requestingUserId) {
    return DatabaseErrorHandler.execute(async () => {
      // Check if requesting user is admin
      const requestingUser = await this.userRepository.findById(requestingUserId);
      if (!requestingUser || !requestingUser.roles.includes('admin')) {
        throw new ValidationError('Access denied - admin role required');
      }

      // Get existing user
      const existingUser = await this.userRepository.findById(userId);
      if (!existingUser) {
        throw new NotFoundError('User');
      }

      // Soft delete
      const deletedUser = await this.userRepository.updateById(userId, {
        isDeleted: true,
        deletedAt: new Date(),
        isActive: false
      });

      logger.info(`User soft deleted: ${deletedUser.username}`);
      return deletedUser;
    }, 'Deleting user');
  }

  /**
   * Update last login
   */
  async updateLastLogin(userId) {
    return DatabaseErrorHandler.execute(async () => {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new NotFoundError('User');
      }

      const updatedUser = await this.userRepository.updateLastLogin(userId);
      
      logger.info(`Last login updated for user: ${updatedUser.username}`);
      return updatedUser;
    }, 'Updating last login');
  }

  /**
   * Get users with pagination and filtering
   */
  async getUsersWithPagination(options = {}) {
    return DatabaseErrorHandler.execute(async () => {
      const sanitizedOptions = {
        page: DatabaseValidator.sanitizePagination(options.page, options.limit).page,
        limit: DatabaseValidator.sanitizePagination(options.page, options.limit).limit,
        search: DatabaseValidator.sanitizeSearchQuery(options.search),
        role: options.role,
        isActive: options.isActive,
        sortBy: options.sortBy || 'createdAt',
        sortOrder: options.sortOrder || 'desc'
      };

      return await this.userRepository.findUsersWithPagination(sanitizedOptions);
    }, 'Getting users with pagination');
  }

  /**
   * Search users with advanced filtering
   */
  async searchUsers(searchCriteria) {
    return DatabaseErrorHandler.execute(async () => {
      const sanitizedCriteria = {
        query: DatabaseValidator.sanitizeSearchQuery(searchCriteria.query),
        role: searchCriteria.role,
        isActive: searchCriteria.isActive,
        dateRange: searchCriteria.dateRange ? 
          DatabaseValidator.sanitizeDateRange(searchCriteria.dateRange.start, searchCriteria.dateRange.end) : 
          null,
        sortBy: searchCriteria.sortBy || 'createdAt',
        sortOrder: searchCriteria.sortOrder || 'desc'
      };

      const sanitizedOptions = {
        page: DatabaseValidator.sanitizePagination(searchCriteria.page, searchCriteria.limit).page,
        limit: DatabaseValidator.sanitizePagination(searchCriteria.page, searchCriteria.limit).limit
      };

      return await this.userRepository.searchUsers(sanitizedCriteria, sanitizedOptions);
    }, 'Searching users');
  }

  /**
   * Get user statistics
   */
  async getUserStatistics() {
    return DatabaseErrorHandler.execute(async () => {
      return await this.userRepository.getUserStatistics();
    }, 'Getting user statistics');
  }

  /**
   * Get users by role
   */
  async getUsersByRole(role) {
    return DatabaseErrorHandler.execute(async () => {
      const validRoles = ['user', 'admin', 'moderator'];
      if (!validRoles.includes(role)) {
        throw new ValidationError('Invalid role');
      }

      return await this.userRepository.getUsersByRole(role);
    }, 'Getting users by role');
  }

  /**
   * Get inactive users
   */
  async getInactiveUsers(daysSinceLastLogin = 30) {
    return DatabaseErrorHandler.execute(async () => {
      const sanitizedDays = Math.max(1, Math.min(365, parseInt(daysSinceLastLogin) || 30));
      return await this.userRepository.getInactiveUsers(sanitizedDays);
    }, 'Getting inactive users');
  }

  /**
   * Bulk update user status
   */
  async bulkUpdateUserStatus(userIds, isActive, requestingUserId) {
    return DatabaseErrorHandler.execute(async () => {
      // Check if requesting user is admin
      const requestingUser = await this.userRepository.findById(requestingUserId);
      if (!requestingUser || !requestingUser.roles.includes('admin')) {
        throw new ValidationError('Access denied - admin role required');
      }

      // Validate user IDs
      const sanitizedIds = userIds.map(id => DatabaseValidator.sanitizeObjectId(id));

      return await this.userRepository.bulkUpdateStatus(sanitizedIds, isActive);
    }, 'Bulk updating user status');
  }

  /**
   * Create admin user
   */
  async createAdminUser(username, email, password) {
    return DatabaseErrorHandler.execute(async () => {
      // Check if admin already exists
      const existingAdmin = await this.userRepository.findOne({ roles: 'admin' });
      if (existingAdmin) {
        throw new ValidationError('Admin user already exists');
      }

      // Sanitize input data
      const sanitizedUsername = DatabaseValidator.sanitizeUsername(username);
      const sanitizedEmail = DatabaseValidator.sanitizeEmail(email);
      const sanitizedPassword = DatabaseValidator.sanitizePassword(password);

      // Check if email or username already exists
      const emailExists = await this.userRepository.emailExists(sanitizedEmail);
      if (emailExists) {
        throw new ValidationError('Email is already in use');
      }

      const usernameExists = await this.userRepository.usernameExists(sanitizedUsername);
      if (usernameExists) {
        throw new ValidationError('Username is already in use');
      }

      // Create admin user
      const adminUser = await this.userRepository.createAdmin(
        sanitizedUsername, 
        sanitizedEmail, 
        sanitizedPassword
      );

      logger.info(`Admin user created: ${adminUser.username}`);
      return adminUser;
    }, 'Creating admin user');
  }

  /**
   * Create admin user if not exists
   */
  async createAdminIfNotExists() {
    return DatabaseErrorHandler.execute(async () => {
      return await this.userRepository.createAdminIfNotExists();
    }, 'Creating admin user if not exists');
  }

  /**
   * Check email availability
   */
  async checkEmailAvailability(email, excludeUserId = null) {
    return DatabaseErrorHandler.execute(async () => {
      const sanitizedEmail = DatabaseValidator.sanitizeEmail(email);
      const sanitizedExcludeId = excludeUserId ? 
        DatabaseValidator.sanitizeObjectId(excludeUserId) : null;

      const emailExists = await this.userRepository.emailExists(sanitizedEmail, sanitizedExcludeId);
      return !emailExists;
    }, 'Checking email availability');
  }

  /**
   * Check username availability
   */
  async checkUsernameAvailability(username, excludeUserId = null) {
    return DatabaseErrorHandler.execute(async () => {
      const sanitizedUsername = DatabaseValidator.sanitizeUsername(username);
      const sanitizedExcludeId = excludeUserId ? 
        DatabaseValidator.sanitizeObjectId(excludeUserId) : null;

      const usernameExists = await this.userRepository.usernameExists(sanitizedUsername, sanitizedExcludeId);
      return !usernameExists;
    }, 'Checking username availability');
  }
}

module.exports = ModernUserService;