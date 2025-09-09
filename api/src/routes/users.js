const { Router } = require('express');
const bcrypt = require('bcryptjs');
const { logger, securityLogger } = require('../config/logger');
const AuthMiddleware = require('../middleware/auth');
const ValidationMiddleware = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const userSchemas = require('../schemas/userSchemas');

const router = Router();

// Mock user database (in production, this would be MongoDB)
const users = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@example.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    roles: ['admin'],
    createdAt: new Date(),
    lastLogin: null,
    isActive: true
  }
];

// Get all users (admin only)
router.get('/',
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, search } = req.query;
    
    let filteredUsers = users.filter(user => user.isActive);
    
    // Search functionality
    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = filteredUsers.filter(user => 
        user.username.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower)
      );
    }
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
    
    // Remove passwords from response
    const safeUsers = paginatedUsers.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      isActive: user.isActive
    }));
    
    res.json({
      success: true,
      data: safeUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredUsers.length,
        pages: Math.ceil(filteredUsers.length / limit)
      }
    });
  })
);

// Get user by ID
router.get('/:id',
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireOwnership('id'),
  ValidationMiddleware.validateParams(userSchemas.userId),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = users.find(u => u.id === id && u.isActive);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        category: 'NOT_FOUND'
      });
    }
    
    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        isActive: user.isActive
      }
    });
  })
);

// Create user (admin only)
router.post('/',
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole('admin'),
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validateBody(userSchemas.createUser),
  asyncHandler(async (req, res) => {
    const { username, email, password, roles = ['user'] } = req.body;
    
    // Check if user already exists
    const existingUser = users.find(u => u.email === email || u.username === username);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User already exists',
        category: 'VALIDATION_ERROR'
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = {
      id: (users.length + 1).toString(),
      username,
      email,
      password: hashedPassword,
      roles,
      createdAt: new Date(),
      lastLogin: null,
      isActive: true
    };
    
    users.push(user);
    
    logger.info(`User created by admin: ${username} (${email})`);
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles,
        createdAt: user.createdAt,
        isActive: user.isActive
      }
    });
  })
);

// Update user
router.put('/:id',
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireOwnership('id'),
  ValidationMiddleware.validateParams(userSchemas.userId),
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validateBody(userSchemas.updateUser),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = users.find(u => u.id === id && u.isActive);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        category: 'NOT_FOUND'
      });
    }
    
    const { username, email, roles } = req.body;
    
    // Check if username/email is already taken by another user
    if (username && username !== user.username) {
      const existingUser = users.find(u => u.username === username && u.id !== id);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'Username already taken',
          category: 'VALIDATION_ERROR'
        });
      }
      user.username = username;
    }
    
    if (email && email !== user.email) {
      const existingUser = users.find(u => u.email === email && u.id !== id);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'Email already taken',
          category: 'VALIDATION_ERROR'
        });
      }
      user.email = email;
    }
    
    // Only admins can change roles
    if (roles && req.user.roles.includes('admin')) {
      user.roles = roles;
    }
    
    logger.info(`User updated: ${user.username} (${user.email})`);
    
    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        isActive: user.isActive
      }
    });
  })
);

// Delete user (soft delete)
router.delete('/:id',
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole('admin'),
  ValidationMiddleware.validateParams(userSchemas.userId),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = users.find(u => u.id === id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        category: 'NOT_FOUND'
      });
    }
    
    // Prevent admin from deleting themselves
    if (req.user.id === id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account',
        category: 'VALIDATION_ERROR'
      });
    }
    
    // Soft delete
    user.isActive = false;
    
    logger.info(`User deleted by admin: ${user.username} (${user.email})`);
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  })
);

// Assign roles to user (admin only)
router.post('/:id/roles',
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole('admin'),
  ValidationMiddleware.validateParams(userSchemas.userId),
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validateBody(userSchemas.assignRoles),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { roles } = req.body;
    const user = users.find(u => u.id === id && u.isActive);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        category: 'NOT_FOUND'
      });
    }
    
    user.roles = roles;
    
    logger.info(`Roles assigned to user ${user.username}: ${roles.join(', ')}`);
    
    res.json({
      success: true,
      message: 'Roles assigned successfully',
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles
      }
    });
  })
);

// Get user statistics (admin only)
router.get('/stats/overview',
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole('admin'),
  asyncHandler(async (req, res) => {
    const activeUsers = users.filter(u => u.isActive);
    const adminUsers = activeUsers.filter(u => u.roles.includes('admin'));
    const regularUsers = activeUsers.filter(u => !u.roles.includes('admin'));
    
    const stats = {
      total: activeUsers.length,
      admins: adminUsers.length,
      users: regularUsers.length,
      recentLogins: activeUsers.filter(u => 
        u.lastLogin && (Date.now() - u.lastLogin.getTime()) < 24 * 60 * 60 * 1000
      ).length,
      createdAt: {
        today: activeUsers.filter(u => 
          u.createdAt.toDateString() === new Date().toDateString()
        ).length,
        thisWeek: activeUsers.filter(u => 
          (Date.now() - u.createdAt.getTime()) < 7 * 24 * 60 * 60 * 1000
        ).length,
        thisMonth: activeUsers.filter(u => 
          (Date.now() - u.createdAt.getTime()) < 30 * 24 * 60 * 60 * 1000
        ).length
      }
    };
    
    res.json({
      success: true,
      data: stats
    });
  })
);

module.exports = router;