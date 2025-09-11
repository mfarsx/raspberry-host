const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { logger, securityLogger } = require("../config/logger");
const config = require("../config/environment");
const ResponseHelper = require("../utils/responseHelper");

class AuthController {
  constructor() {
    // Mock user database (in production, this would be MongoDB)
    this.users = [
      {
        id: "1",
        username: "admin",
        email: "admin@example.com",
        password: "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password
        roles: ["admin"],
        createdAt: new Date(),
        lastLogin: null,
      },
    ];
  }

  /**
   * User registration
   */
  async register(req, res) {
    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = this.users.find(
      (u) => u.email === email || u.username === username
    );
    if (existingUser) {
      return ResponseHelper.conflict(res, "User already exists");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = {
      id: (this.users.length + 1).toString(),
      username,
      email,
      password: hashedPassword,
      roles: ["user"],
      createdAt: new Date(),
      lastLogin: null,
    };

    this.users.push(user);

    logger.info(`User registered: ${username} (${email})`);

    return ResponseHelper.created(
      res,
      {
        id: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles,
        createdAt: user.createdAt,
      },
      "User registered successfully"
    );
  }

  /**
   * User login
   */
  async login(req, res) {
    const { email, password } = req.body;

    // Find user
    const user = this.users.find((u) => u.email === email);
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
    const isValidPassword = await bcrypt.compare(password, user.password);
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
    user.lastLogin = new Date();

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
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
          id: user.id,
          username: user.username,
          email: user.email,
          roles: user.roles,
          lastLogin: user.lastLogin,
        },
      },
      { message: "Login successful" }
    );
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(req, res) {
    const user = this.users.find((u) => u.id === req.user.id);
    if (!user) {
      return ResponseHelper.notFound(res, "User not found", "NOT_FOUND");
    }

    return ResponseHelper.success(res, {
      id: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
    });
  }

  /**
   * Update user profile
   */
  async updateProfile(req, res) {
    const user = this.users.find((u) => u.id === req.user.id);
    if (!user) {
      return ResponseHelper.notFound(res, "User not found", "NOT_FOUND");
    }

    const { username, email } = req.body;

    // Check if username/email is already taken by another user
    if (username && username !== user.username) {
      const existingUser = this.users.find(
        (u) => u.username === username && u.id !== user.id
      );
      if (existingUser) {
        return ResponseHelper.conflict(res, "Username already taken");
      }
      user.username = username;
    }

    if (email && email !== user.email) {
      const existingUser = this.users.find(
        (u) => u.email === email && u.id !== user.id
      );
      if (existingUser) {
        return ResponseHelper.conflict(res, "Email already taken");
      }
      user.email = email;
    }

    logger.info(`User profile updated: ${user.username} (${user.email})`);

    return ResponseHelper.success(
      res,
      {
        id: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
      { message: "Profile updated successfully" }
    );
  }

  /**
   * Change password
   */
  async changePassword(req, res) {
    const user = this.users.find((u) => u.id === req.user.id);
    if (!user) {
      return ResponseHelper.notFound(res, "User not found");
    }

    const { currentPassword, newPassword } = req.body;

    // Verify current password
    const isValidPassword = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isValidPassword) {
      securityLogger.suspiciousActivity(
        req.ip,
        "password_change_invalid_current",
        {
          userId: user.id,
          endpoint: req.path,
        }
      );
      return ResponseHelper.unauthorized(
        res,
        "Current password is incorrect",
        "AUTH_ERROR"
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    logger.info(`Password changed for user: ${user.username}`);

    return ResponseHelper.success(res, null, {
      message: "Password changed successfully",
    });
  }

  /**
   * Refresh token
   */
  async refreshToken(req, res) {
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
  }

  /**
   * Logout (client-side token invalidation)
   */
  async logout(req, res) {
    logger.info(`User logged out: ${req.user.username} (${req.user.email})`);

    return ResponseHelper.success(res, null, {
      message: "Logged out successfully",
    });
  }
}

module.exports = AuthController;