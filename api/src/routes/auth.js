const { Router } = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { logger, securityLogger } = require('../config/logger');
const config = require('../config/environment');
const AuthMiddleware = require('../middleware/auth');
const ValidationMiddleware = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const authSchemas = require('../schemas/authSchemas');

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
    lastLogin: null
  }
];

// User registration
router.post('/register',
  AuthMiddleware.authRateLimit,
  AuthMiddleware.recordAuthAttempt,
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validateBody(authSchemas.register),
  asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;

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
      roles: ['user'],
      createdAt: new Date(),
      lastLogin: null
    };

    users.push(user);

    logger.info(`User registered: ${username} (${email})`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles,
        createdAt: user.createdAt
      }
    });
  })
);

// User login
router.post('/login',
  AuthMiddleware.authRateLimit,
  AuthMiddleware.recordAuthAttempt,
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validateBody(authSchemas.login),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Find user
    const user = users.find(u => u.email === email);
    if (!user) {
      securityLogger.suspiciousActivity(req.ip, 'login_user_not_found', {
        email,
        endpoint: req.path
      });
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        category: 'AUTH_ERROR'
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      securityLogger.suspiciousActivity(req.ip, 'login_invalid_password', {
        email,
        endpoint: req.path
      });
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        category: 'AUTH_ERROR'
      });
    }

    // Update last login
    user.lastLogin = new Date();

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles
      },
      config.jwtSecret,
      { expiresIn: '24h' }
    );

    logger.info(`User logged in: ${user.username} (${user.email})`);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          roles: user.roles,
          lastLogin: user.lastLogin
        }
      }
    });
  })
);

// Get current user profile
router.get('/me',
  AuthMiddleware.verifyToken,
  asyncHandler(async (req, res) => {
    const user = users.find(u => u.id === req.user.id);
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
        lastLogin: user.lastLogin
      }
    });
  })
);

// Update user profile
router.put('/profile',
  AuthMiddleware.verifyToken,
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validateBody(authSchemas.updateProfile),
  asyncHandler(async (req, res) => {
    const user = users.find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        category: 'NOT_FOUND'
      });
    }

    const { username, email } = req.body;

    // Check if username/email is already taken by another user
    if (username && username !== user.username) {
      const existingUser = users.find(u => u.username === username && u.id !== user.id);
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
      const existingUser = users.find(u => u.email === email && u.id !== user.id);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'Email already taken',
          category: 'VALIDATION_ERROR'
        });
      }
      user.email = email;
    }

    logger.info(`User profile updated: ${user.username} (${user.email})`);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });
  })
);

// Change password
router.put('/password',
  AuthMiddleware.verifyToken,
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validateBody(authSchemas.changePassword),
  asyncHandler(async (req, res) => {
    const user = users.find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        category: 'NOT_FOUND'
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      securityLogger.suspiciousActivity(req.ip, 'password_change_invalid_current', {
        userId: user.id,
        endpoint: req.path
      });
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect',
        category: 'AUTH_ERROR'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    logger.info(`Password changed for user: ${user.username}`);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  })
);

// Refresh token
router.post('/refresh',
  AuthMiddleware.verifyToken,
  asyncHandler(async (req, res) => {

    // Generate new token
    const token = jwt.sign(
      {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        roles: req.user.roles
      },
      config.jwtSecret,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: { token }
    });
  })
);

// Logout (client-side token invalidation)
router.post('/logout',
  AuthMiddleware.verifyToken,
  asyncHandler(async (req, res) => {
    logger.info(`User logged out: ${req.user.username} (${req.user.email})`);
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  })
);

module.exports = router;