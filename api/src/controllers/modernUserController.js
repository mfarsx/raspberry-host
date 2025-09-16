const { logger } = require("../config/logger");
const ResponseHelper = require("../utils/responseHelper");
const BaseController = require("../utils/baseController");
const ModernUserService = require("../services/modernUserService");
const { DatabaseErrorHandler } = require("../utils/databaseErrors");

/**
 * Modern User Controller
 * Uses the new repository pattern and modern error handling
 */
class ModernUserController extends BaseController {
  constructor() {
    super('ModernUserController');
    this.userService = new ModernUserService();
  }

  /**
   * Create a new user
   */
  async createUser(req, res) {
    return this.handleCreate(req, res, async (req, res) => {
      const userData = req.body;
      
      const user = await this.userService.createUser(userData);
      
      this.logger.info(`User created: ${user.username}`);
      return user;
    }, 'User', 'User created successfully');
  }

  /**
   * Get user by ID
   */
  async getUserById(req, res) {
    return this.handleSingleResource(req, res, async (req, res) => {
      const { id } = req.params;
      
      return await this.userService.getUserById(id);
    }, 'User');
  }

  /**
   * Get user by email or username
   */
  async getUserByIdentifier(req, res) {
    try {
      const { identifier } = req.params;
      
      if (!identifier) {
        return ResponseHelper.badRequest(res, 'Identifier is required');
      }
      
      const user = await this.userService.getUserByIdentifier(identifier);
      
      return ResponseHelper.success(res, user, 'User retrieved successfully');
    } catch (error) {
      logger.error('Get user by identifier error:', error);
      return ResponseHelper.error(res, error);
    }
  }

  /**
   * Update user
   */
  async updateUser(req, res) {
    return this.handleUpdate(req, res, async (req, res) => {
      const { id } = req.params;
      const updateData = req.body;
      const requestingUserId = req.user.id;
      
      return await this.userService.updateUser(id, updateData, requestingUserId);
    }, 'User', 'User updated successfully');
  }

  /**
   * Update user password
   */
  async updateUserPassword(req, res) {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;
      const requestingUserId = req.user.id;
      
      if (!newPassword) {
        return ResponseHelper.badRequest(res, 'New password is required');
      }
      
      const updatedUser = await this.userService.updateUserPassword(id, newPassword, requestingUserId);
      
      return ResponseHelper.success(res, updatedUser, 'Password updated successfully');
    } catch (error) {
      logger.error('Update user password error:', error);
      return ResponseHelper.error(res, error);
    }
  }

  /**
   * Update user roles
   */
  async updateUserRoles(req, res) {
    try {
      const { id } = req.params;
      const { roles } = req.body;
      const requestingUserId = req.user.id;
      
      if (!roles || !Array.isArray(roles)) {
        return ResponseHelper.badRequest(res, 'Roles array is required');
      }
      
      const updatedUser = await this.userService.updateUserRoles(id, roles, requestingUserId);
      
      return ResponseHelper.success(res, updatedUser, 'User roles updated successfully');
    } catch (error) {
      logger.error('Update user roles error:', error);
      return ResponseHelper.error(res, error);
    }
  }

  /**
   * Activate/Deactivate user
   */
  async setUserActiveStatus(req, res) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      const requestingUserId = req.user.id;
      
      if (typeof isActive !== 'boolean') {
        return ResponseHelper.badRequest(res, 'isActive boolean value is required');
      }
      
      const updatedUser = await this.userService.setUserActiveStatus(id, isActive, requestingUserId);
      
      return ResponseHelper.success(res, updatedUser, `User ${isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      logger.error('Set user active status error:', error);
      return ResponseHelper.error(res, error);
    }
  }

  /**
   * Delete user (soft delete)
   */
  async deleteUser(req, res) {
    return this.handleDelete(req, res, async (req, res) => {
      const { id } = req.params;
      const requestingUserId = req.user.id;
      
      const deletedUser = await this.userService.deleteUser(id, requestingUserId);
      
      this.logger.info(`User soft deleted: ${deletedUser.username}`);
      return deletedUser;
    }, 'User', 'User deleted successfully');
  }

  /**
   * Update last login
   */
  async updateLastLogin(req, res) {
    try {
      const { id } = req.params;
      
      const updatedUser = await this.userService.updateLastLogin(id);
      
      return ResponseHelper.success(res, updatedUser, 'Last login updated successfully');
    } catch (error) {
      logger.error('Update last login error:', error);
      return ResponseHelper.error(res, error);
    }
  }

  /**
   * Get users with pagination and filtering
   */
  async getUsersWithPagination(req, res) {
    return this.handlePaginatedList(req, res, async (req, res) => {
      const { page, limit } = this.extractPaginationParams(req);
      const filters = this.extractFilterParams(req, ['search', 'role', 'isActive']);
      
      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        search: filters.search,
        role: filters.role,
        isActive: filters.isActive !== undefined ? filters.isActive === 'true' : undefined,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder || 'desc'
      };

      const result = await this.userService.getUsersWithPagination(options);
      
      return {
        data: result.documents,
        pagination: result.pagination
      };
    }, 'Users');
  }

  /**
   * Search users with advanced filtering
   */
  async searchUsers(req, res) {
    try {
      const {
        q: query,
        role,
        isActive,
        dateRange,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 10
      } = req.query;

      const searchCriteria = {
        query,
        role,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        dateRange: dateRange ? JSON.parse(dateRange) : null,
        sortBy,
        sortOrder,
        page: parseInt(page),
        limit: parseInt(limit)
      };

      const result = await this.userService.searchUsers(searchCriteria);

      return ResponseHelper.successWithPagination(res, result.documents, result.pagination);
    } catch (error) {
      logger.error('Search users error:', error);
      return ResponseHelper.error(res, error);
    }
  }

  /**
   * Get user statistics
   */
  async getUserStatistics(req, res) {
    try {
      const statistics = await this.userService.getUserStatistics();
      
      return ResponseHelper.success(res, statistics, 'User statistics retrieved successfully');
    } catch (error) {
      logger.error('Get user statistics error:', error);
      return ResponseHelper.error(res, error);
    }
  }

  /**
   * Get users by role
   */
  async getUsersByRole(req, res) {
    try {
      const { role } = req.params;
      
      if (!role) {
        return ResponseHelper.badRequest(res, 'Role is required');
      }
      
      const users = await this.userService.getUsersByRole(role);
      
      return ResponseHelper.success(res, users, 'Users by role retrieved successfully');
    } catch (error) {
      logger.error('Get users by role error:', error);
      return ResponseHelper.error(res, error);
    }
  }

  /**
   * Get inactive users
   */
  async getInactiveUsers(req, res) {
    try {
      const { daysSinceLastLogin = 30 } = req.query;
      
      const users = await this.userService.getInactiveUsers(parseInt(daysSinceLastLogin));
      
      return ResponseHelper.success(res, users, 'Inactive users retrieved successfully');
    } catch (error) {
      logger.error('Get inactive users error:', error);
      return ResponseHelper.error(res, error);
    }
  }

  /**
   * Bulk update user status
   */
  async bulkUpdateUserStatus(req, res) {
    try {
      const { userIds, isActive } = req.body;
      const requestingUserId = req.user.id;
      
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return ResponseHelper.badRequest(res, 'User IDs array is required');
      }
      
      if (typeof isActive !== 'boolean') {
        return ResponseHelper.badRequest(res, 'isActive boolean value is required');
      }
      
      const result = await this.userService.bulkUpdateUserStatus(userIds, isActive, requestingUserId);
      
      return ResponseHelper.success(res, result, 'User statuses updated successfully');
    } catch (error) {
      logger.error('Bulk update user status error:', error);
      return ResponseHelper.error(res, error);
    }
  }

  /**
   * Create admin user
   */
  async createAdminUser(req, res) {
    try {
      const { username, email, password } = req.body;
      
      if (!username || !email || !password) {
        return ResponseHelper.badRequest(res, 'Username, email, and password are required');
      }
      
      const adminUser = await this.userService.createAdminUser(username, email, password);
      
      return ResponseHelper.success(res, adminUser, 'Admin user created successfully');
    } catch (error) {
      logger.error('Create admin user error:', error);
      return ResponseHelper.error(res, error);
    }
  }

  /**
   * Create admin user if not exists
   */
  async createAdminIfNotExists(req, res) {
    try {
      const adminUser = await this.userService.createAdminIfNotExists();
      
      return ResponseHelper.success(res, adminUser, 'Admin user setup completed');
    } catch (error) {
      logger.error('Create admin if not exists error:', error);
      return ResponseHelper.error(res, error);
    }
  }

  /**
   * Check email availability
   */
  async checkEmailAvailability(req, res) {
    try {
      const { email } = req.query;
      const { id: excludeUserId } = req.params;
      
      if (!email) {
        return ResponseHelper.badRequest(res, 'Email is required');
      }
      
      const isAvailable = await this.userService.checkEmailAvailability(email, excludeUserId);
      
      return ResponseHelper.success(res, { 
        email, 
        available: isAvailable 
      }, 'Email availability checked successfully');
    } catch (error) {
      logger.error('Check email availability error:', error);
      return ResponseHelper.error(res, error);
    }
  }

  /**
   * Check username availability
   */
  async checkUsernameAvailability(req, res) {
    try {
      const { username } = req.query;
      const { id: excludeUserId } = req.params;
      
      if (!username) {
        return ResponseHelper.badRequest(res, 'Username is required');
      }
      
      const isAvailable = await this.userService.checkUsernameAvailability(username, excludeUserId);
      
      return ResponseHelper.success(res, { 
        username, 
        available: isAvailable 
      }, 'Username availability checked successfully');
    } catch (error) {
      logger.error('Check username availability error:', error);
      return ResponseHelper.error(res, error);
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUserProfile(req, res) {
    try {
      const userId = req.user.id;
      
      const user = await this.userService.getUserById(userId);
      
      return ResponseHelper.success(res, user, 'User profile retrieved successfully');
    } catch (error) {
      logger.error('Get current user profile error:', error);
      return ResponseHelper.error(res, error);
    }
  }

  /**
   * Update current user profile
   */
  async updateCurrentUserProfile(req, res) {
    try {
      const userId = req.user.id;
      const updateData = req.body;
      
      // Remove sensitive fields that shouldn't be updated via profile
      delete updateData.password;
      delete updateData.roles;
      delete updateData.isActive;
      
      const updatedUser = await this.userService.updateUser(userId, updateData, userId);
      
      return ResponseHelper.success(res, updatedUser, 'User profile updated successfully');
    } catch (error) {
      logger.error('Update current user profile error:', error);
      return ResponseHelper.error(res, error);
    }
  }

  /**
   * Change current user password
   */
  async changeCurrentUserPassword(req, res) {
    try {
      const userId = req.user.id;
      const { newPassword } = req.body;
      
      if (!newPassword) {
        return ResponseHelper.badRequest(res, 'New password is required');
      }
      
      const updatedUser = await this.userService.updateUserPassword(userId, newPassword, userId);
      
      return ResponseHelper.success(res, updatedUser, 'Password changed successfully');
    } catch (error) {
      logger.error('Change current user password error:', error);
      return ResponseHelper.error(res, error);
    }
  }
}

module.exports = ModernUserController;