const Joi = require('joi');

/**
 * Validation schemas for user-related operations
 */
const userSchemas = {
  // Schema for user creation
  createUser: Joi.object({
    username: Joi.string()
      .min(3)
      .max(30)
      .pattern(/^[a-zA-Z0-9_-]+$/)
      .required()
      .messages({
        'string.pattern.base': 'Username can only contain letters, numbers, hyphens, and underscores',
        'string.min': 'Username must be at least 3 characters long',
        'string.max': 'Username cannot exceed 30 characters',
        'any.required': 'Username is required'
      }),
    
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Email must be a valid email address',
        'any.required': 'Email is required'
      }),
    
    password: Joi.string()
      .min(8)
      .max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
        'string.min': 'Password must be at least 8 characters long',
        'string.max': 'Password cannot exceed 128 characters',
        'any.required': 'Password is required'
      }),
    
    roles: Joi.array()
      .items(Joi.string().valid('admin', 'user', 'developer'))
      .default(['user'])
      .messages({
        'array.items': 'Roles must be valid (admin, user, developer)'
      })
  }),

  // Schema for user updates
  updateUser: Joi.object({
    username: Joi.string()
      .min(3)
      .max(30)
      .pattern(/^[a-zA-Z0-9_-]+$/)
      .optional()
      .messages({
        'string.pattern.base': 'Username can only contain letters, numbers, hyphens, and underscores',
        'string.min': 'Username must be at least 3 characters long',
        'string.max': 'Username cannot exceed 30 characters'
      }),
    
    email: Joi.string()
      .email()
      .optional()
      .messages({
        'string.email': 'Email must be a valid email address'
      }),
    
    roles: Joi.array()
      .items(Joi.string().valid('admin', 'user', 'developer'))
      .optional()
      .messages({
        'array.items': 'Roles must be valid (admin, user, developer)'
      })
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update'
  }),

  // Schema for user ID parameter
  userId: Joi.object({
    id: Joi.string()
      .min(1)
      .max(100)
      .pattern(/^[a-zA-Z0-9_-]+$/)
      .required()
      .messages({
        'string.pattern.base': 'User ID can only contain letters, numbers, hyphens, and underscores',
        'string.min': 'User ID cannot be empty',
        'string.max': 'User ID cannot exceed 100 characters',
        'any.required': 'User ID is required'
      })
  }),

  // Schema for role assignment
  assignRoles: Joi.object({
    roles: Joi.array()
      .items(Joi.string().valid('admin', 'user', 'developer'))
      .min(1)
      .required()
      .messages({
        'array.items': 'Roles must be valid (admin, user, developer)',
        'array.min': 'At least one role must be provided',
        'any.required': 'Roles are required'
      })
  }),

  // Schema for user search query
  userSearchQuery: Joi.object({
    page: Joi.number()
      .integer()
      .min(1)
      .default(1)
      .messages({
        'number.base': 'Page must be a number',
        'number.integer': 'Page must be an integer',
        'number.min': 'Page must be at least 1'
      }),
    
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(10)
      .messages({
        'number.base': 'Limit must be a number',
        'number.integer': 'Limit must be an integer',
        'number.min': 'Limit must be at least 1',
        'number.max': 'Limit cannot exceed 100'
      }),
    
    search: Joi.string()
      .min(1)
      .max(100)
      .optional()
      .messages({
        'string.min': 'Search term must be at least 1 character',
        'string.max': 'Search term cannot exceed 100 characters'
      })
  })
};

module.exports = userSchemas;