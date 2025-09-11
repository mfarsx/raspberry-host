const bcrypt = require("bcryptjs");
const { logger, securityLogger } = require("../config/logger");
const ResponseHelper = require("../utils/responseHelper");

class UserController {
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
        isActive: true,
      },
    ];
  }

  /**
   * Get all users (admin only)
   */
  async getAllUsers(req, res) {
    const { page = 1, limit = 10, search } = req.query;

    let filteredUsers = this.users.filter((user) => user.isActive);

    // Search functionality
    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = filteredUsers.filter(
        (user) =>
          user.username.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower)
      );
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    // Remove passwords from response
    const safeUsers = paginatedUsers.map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      isActive: user.isActive,
    }));

    return ResponseHelper.successWithPagination(res, safeUsers, {
      page: parseInt(page),
      limit: parseInt(limit),
      total: filteredUsers.length,
      pages: Math.ceil(filteredUsers.length / limit),
    });
  }

  /**
   * Get user by ID
   */
  async getUserById(req, res) {
    const { id } = req.params;
    const user = this.users.find((u) => u.id === id && u.isActive);

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
      isActive: user.isActive,
    });
  }

  /**
   * Create user (admin only)
   */
  async createUser(req, res) {
    const { username, email, password, roles = ["user"] } = req.body;

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
      roles,
      createdAt: new Date(),
      lastLogin: null,
      isActive: true,
    };

    this.users.push(user);

    logger.info(`User created by admin: ${username} (${email})`);

    return ResponseHelper.created(
      res,
      {
        id: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles,
        createdAt: user.createdAt,
        isActive: user.isActive,
      },
      "User created successfully"
    );
  }

  /**
   * Update user
   */
  async updateUser(req, res) {
    const { id } = req.params;
    const user = this.users.find((u) => u.id === id && u.isActive);

    if (!user) {
      return ResponseHelper.notFound(res, "User not found");
    }

    const { username, email, roles } = req.body;

    // Check if username/email is already taken by another user
    if (username && username !== user.username) {
      const existingUser = this.users.find(
        (u) => u.username === username && u.id !== id
      );
      if (existingUser) {
        return ResponseHelper.conflict(res, "Username already taken");
      }
      user.username = username;
    }

    if (email && email !== user.email) {
      const existingUser = this.users.find(
        (u) => u.email === email && u.id !== id
      );
      if (existingUser) {
        return ResponseHelper.conflict(res, "Email already taken");
      }
      user.email = email;
    }

    // Only admins can change roles
    if (roles && req.user.roles.includes("admin")) {
      user.roles = roles;
    }

    logger.info(`User updated: ${user.username} (${user.email})`);

    return ResponseHelper.success(
      res,
      {
        id: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        isActive: user.isActive,
      },
      { message: "User updated successfully" }
    );
  }

  /**
   * Delete user (soft delete)
   */
  async deleteUser(req, res) {
    const { id } = req.params;
    const user = this.users.find((u) => u.id === id);

    if (!user) {
      return ResponseHelper.notFound(res, "User not found");
    }

    // Prevent admin from deleting themselves
    if (req.user.id === id) {
      return ResponseHelper.error(
        res,
        400,
        "Cannot delete your own account",
        "VALIDATION_ERROR"
      );
    }

    // Soft delete
    user.isActive = false;

    logger.info(`User deleted by admin: ${user.username} (${user.email})`);

    return ResponseHelper.success(res, null, {
      message: "User deleted successfully",
    });
  }

  /**
   * Assign roles to user (admin only)
   */
  async assignRoles(req, res) {
    const { id } = req.params;
    const { roles } = req.body;
    const user = this.users.find((u) => u.id === id && u.isActive);

    if (!user) {
      return ResponseHelper.notFound(res, "User not found");
    }

    user.roles = roles;

    logger.info(`Roles assigned to user ${user.username}: ${roles.join(", ")}`);

    return ResponseHelper.success(
      res,
      {
        id: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles,
      },
      { message: "Roles assigned successfully" }
    );
  }

  /**
   * Get user statistics (admin only)
   */
  async getUserStatistics(req, res) {
    const activeUsers = this.users.filter((u) => u.isActive);
    const adminUsers = activeUsers.filter((u) => u.roles.includes("admin"));
    const regularUsers = activeUsers.filter((u) => !u.roles.includes("admin"));

    const stats = {
      total: activeUsers.length,
      admins: adminUsers.length,
      users: regularUsers.length,
      recentLogins: activeUsers.filter(
        (u) =>
          u.lastLogin &&
          Date.now() - u.lastLogin.getTime() < 24 * 60 * 60 * 1000
      ).length,
      createdAt: {
        today: activeUsers.filter(
          (u) => u.createdAt.toDateString() === new Date().toDateString()
        ).length,
        thisWeek: activeUsers.filter(
          (u) => Date.now() - u.createdAt.getTime() < 7 * 24 * 60 * 60 * 1000
        ).length,
        thisMonth: activeUsers.filter(
          (u) => Date.now() - u.createdAt.getTime() < 30 * 24 * 60 * 60 * 1000
        ).length,
      },
    };

    return ResponseHelper.success(res, stats);
  }
}

module.exports = UserController;