const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { logger, securityLogger } = require("../config/logger");
const config = require("../config/environment");
const ResponseHelper = require("../utils/responseHelper");
const userRepository = require("../repositories/userRepository");

class AuthController {
  constructor() {
    // Initialize default admin user if needed
    this.initializeDefaultAdmin();
  }

  /**
   * Initialize default admin user
   */
  async initializeDefaultAdmin() {
    try {
      await userRepository.createAdminIfNotExists();
    } catch (error) {
      logger.error('Failed to initialize default admin:', error);
    }
  }

  /**
   * User registration
   */
  async register(req, res) {
    try {
      const { username, email, password } = req.body;

      // Check if user already exists
      const emailExists = await userRepository.emailExists(email);
      const usernameExists = await userRepository.usernameExists(username);
      
      if (emailExists || usernameExists) {
        return ResponseHelper.conflict(res, "User already exists");
      }

      // Create user
      const user = await userRepository.create({
        username,
        email,
        password,
        roles: ["user"]
      });

      logger.info(`User registered: ${username} (${email})`);

      return ResponseHelper.created(
        res,
        {
          id: user._id,
          username: user.username,
          email: user.email,
          roles: user.roles,
          createdAt: user.createdAt,
        },
        "User registered successfully"
      );
    } catch (error) {
      logger.error('Registration error:', error);
      return ResponseHelper.internalError(res, "Registration failed");
    }
  }

  /**
   * User login
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await userRepository.findByEmail(email);
      if (!user) {
        securityLogger.suspiciousActivity(req.ip, "login_user_not_found", {
          email,
          endpoint: req.path,
        });
        return ResponseHelper.unauthorized(
          res,
          "Invalid credentials",
          "AUTH_ERROR"
        );
      }

      // Check password
      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        securityLogger.suspiciousActivity(req.ip, "login_invalid_password", {
          email,
          endpoint: req.path,
        });
        return ResponseHelper.unauthorized(
          res,
          "Invalid credentials",
          "AUTH_ERROR"
        );
      }

      // Update last login
      await userRepository.updateLastLogin(user._id);

      // Generate JWT token
      const token = jwt.sign(
        {
          id: user._id,
          username: user.username,
          email: user.email,
          roles: user.roles,
        },
        config.jwtSecret,
        { expiresIn: "24h" }
      );

      logger.info(`User logged in: ${user.username} (${user.email})`);

      return ResponseHelper.success(
        res,
        {
          token,
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            roles: user.roles,
            lastLogin: new Date(),
          },
        },
        { message: "Login successful" }
      );
    } catch (error) {
      logger.error('Login error:', error);
      return ResponseHelper.internalError(res, "Login failed");
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(req, res) {
    try {
      const user = await userRepository.findById(req.user.id);
      if (!user) {
        return ResponseHelper.notFound(res, "User not found", "NOT_FOUND");
      }

      return ResponseHelper.success(res, {
        id: user._id,
        username: user.username,
        email: user.email,
        roles: user.roles,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      });
    } catch (error) {
      logger.error('Get current user error:', error);
      return ResponseHelper.internalError(res, "Failed to get user profile");
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(req, res) {
    try {
      const { username, email } = req.body;

      // Check if username/email is already taken by another user
      if (username) {
        const usernameExists = await userRepository.usernameExists(username);
        if (usernameExists) {
          return ResponseHelper.conflict(res, "Username already taken");
        }
      }

      if (email) {
        const emailExists = await userRepository.emailExists(email);
        if (emailExists) {
          return ResponseHelper.conflict(res, "Email already taken");
        }
      }

      const user = await userRepository.update(req.user.id, { username, email });
      if (!user) {
        return ResponseHelper.notFound(res, "User not found", "NOT_FOUND");
      }

      logger.info(`User profile updated: ${user.username} (${user.email})`);

      return ResponseHelper.success(
        res,
        {
          id: user._id,
          username: user.username,
          email: user.email,
          roles: user.roles,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
        },
        { message: "Profile updated successfully" }
      );
    } catch (error) {
      logger.error('Update profile error:', error);
      return ResponseHelper.internalError(res, "Failed to update profile");
    }
  }

  /**
   * Change password
   */
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;

      const user = await userRepository.findById(req.user.id);
      if (!user) {
        return ResponseHelper.notFound(res, "User not found");
      }

      // Verify current password
      const isValidPassword = await user.comparePassword(currentPassword);
      if (!isValidPassword) {
        securityLogger.suspiciousActivity(
          req.ip,
          "password_change_invalid_current",
          {
            userId: user._id,
            endpoint: req.path,
          }
        );
        return ResponseHelper.unauthorized(
          res,
          "Current password is incorrect",
          "AUTH_ERROR"
        );
      }

      // Update password
      await userRepository.updatePassword(user._id, newPassword);

      logger.info(`Password changed for user: ${user.username}`);

      return ResponseHelper.success(res, null, {
        message: "Password changed successfully",
      });
    } catch (error) {
      logger.error('Change password error:', error);
      return ResponseHelper.internalError(res, "Failed to change password");
    }
  }

  /**
   * Refresh token
   */
  async refreshToken(req, res) {
    try {
      // Generate new token
      const token = jwt.sign(
        {
          id: req.user.id,
          username: req.user.username,
          email: req.user.email,
          roles: req.user.roles,
        },
        config.jwtSecret,
        { expiresIn: "24h" }
      );

      return ResponseHelper.success(res, { token }, {
        message: "Token refreshed successfully",
      });
    } catch (error) {
      logger.error('Refresh token error:', error);
      return ResponseHelper.internalError(res, "Failed to refresh token");
    }
  }

  /**
   * Logout (client-side token invalidation)
   */
  async logout(req, res) {
    try {
      logger.info(`User logged out: ${req.user.username} (${req.user.email})`);

      return ResponseHelper.success(res, null, {
        message: "Logged out successfully",
      });
    } catch (error) {
      logger.error('Logout error:', error);
      return ResponseHelper.internalError(res, "Logout failed");
    }
  }
}

module.exports = AuthController;