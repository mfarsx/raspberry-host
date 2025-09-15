const Joi = require('joi');

/**
 * Validation schemas for project-related operations
 */
const projectSchemas = {
  // Schema for project deployment
  deployProject: Joi.object({
    name: Joi.string()
      .min(1)
      .max(50)
      .pattern(/^[a-zA-Z0-9-_]+$/)
      .required()
      .messages({
        'string.pattern.base': 'Project name can only contain letters, numbers, hyphens, and underscores',
        'string.min': 'Project name must be at least 1 character long',
        'string.max': 'Project name cannot exceed 50 characters'
      }),
    
    domain: Joi.string()
      .min(1)
      .max(255)
      .pattern(/^[a-zA-Z0-9.-]+(\.[a-zA-Z]{2,})?(:[0-9]{1,5})?$/)
      .required()
      .messages({
        'string.pattern.base': 'Domain must be a valid domain name (e.g., example.com, localhost:3000, or myapp.local)',
        'string.min': 'Domain cannot be empty',
        'string.max': 'Domain cannot exceed 255 characters'
      }),
    
    repository: Joi.string()
      .uri({ scheme: ['http', 'https', 'git'] })
      .required()
      .messages({
        'string.uri': 'Repository must be a valid URL',
        'any.required': 'Repository URL is required'
      }),
    
    branch: Joi.string()
      .min(1)
      .max(100)
      .pattern(/^[a-zA-Z0-9/._-]+$/)
      .default('main')
      .messages({
        'string.pattern.base': 'Branch name contains invalid characters',
        'string.min': 'Branch name cannot be empty',
        'string.max': 'Branch name cannot exceed 100 characters'
      }),
    
    buildCommand: Joi.string()
      .max(500)
      .optional()
      .messages({
        'string.max': 'Build command cannot exceed 500 characters'
      }),
    
    startCommand: Joi.string()
      .max(500)
      .optional()
      .messages({
        'string.max': 'Start command cannot exceed 500 characters'
      }),
    
    environment: Joi.object()
      .pattern(Joi.string().min(1).max(100), Joi.string().max(1000))
      .default({})
      .messages({
        'object.pattern': 'Environment variable names must be 1-100 characters, values must be max 1000 characters'
      }),
    
    port: Joi.number()
      .integer()
      .min(1)
      .max(65535)
      .default(3000)
      .messages({
        'number.base': 'Port must be a number',
        'number.integer': 'Port must be an integer',
        'number.min': 'Port must be at least 1',
        'number.max': 'Port cannot exceed 65535'
      })
  }),

  // Schema for project updates
  updateProject: Joi.object({
    name: Joi.string()
      .min(1)
      .max(50)
      .pattern(/^[a-zA-Z0-9-_]+$/)
      .optional()
      .messages({
        'string.pattern.base': 'Project name can only contain letters, numbers, hyphens, and underscores',
        'string.min': 'Project name must be at least 1 character long',
        'string.max': 'Project name cannot exceed 50 characters'
      }),
    
    domain: Joi.string()
      .min(1)
      .max(255)
      .pattern(/^[a-zA-Z0-9.-]+(\.[a-zA-Z]{2,})?(:[0-9]{1,5})?$/)
      .optional()
      .messages({
        'string.pattern.base': 'Domain must be a valid domain name (e.g., example.com, localhost:3000, or myapp.local)',
        'string.min': 'Domain cannot be empty',
        'string.max': 'Domain cannot exceed 255 characters'
      }),
    
    repository: Joi.string()
      .uri({ scheme: ['http', 'https', 'git'] })
      .optional()
      .messages({
        'string.uri': 'Repository must be a valid URL'
      }),
    
    branch: Joi.string()
      .min(1)
      .max(100)
      .pattern(/^[a-zA-Z0-9/._-]+$/)
      .optional()
      .messages({
        'string.pattern.base': 'Branch name contains invalid characters',
        'string.min': 'Branch name cannot be empty',
        'string.max': 'Branch name cannot exceed 100 characters'
      }),
    
    buildCommand: Joi.string()
      .max(500)
      .allow(null)
      .optional()
      .messages({
        'string.max': 'Build command cannot exceed 500 characters'
      }),
    
    startCommand: Joi.string()
      .max(500)
      .allow(null)
      .optional()
      .messages({
        'string.max': 'Start command cannot exceed 500 characters'
      }),
    
    environment: Joi.object()
      .pattern(Joi.string().min(1).max(100), Joi.string().max(1000))
      .optional()
      .messages({
        'object.pattern': 'Environment variable names must be 1-100 characters, values must be max 1000 characters'
      }),
    
    port: Joi.number()
      .integer()
      .min(1)
      .max(65535)
      .optional()
      .messages({
        'number.base': 'Port must be a number',
        'number.integer': 'Port must be an integer',
        'number.min': 'Port must be at least 1',
        'number.max': 'Port cannot exceed 65535'
      })
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update'
  }),

  // Schema for project ID parameter
  projectId: Joi.object({
    id: Joi.string()
      .min(1)
      .max(100)
      .pattern(/^[a-zA-Z0-9-_]+$/)
      .required()
      .messages({
        'string.pattern.base': 'Project ID can only contain letters, numbers, hyphens, and underscores',
        'string.min': 'Project ID cannot be empty',
        'string.max': 'Project ID cannot exceed 100 characters',
        'any.required': 'Project ID is required'
      })
  }),

  // Schema for logs query parameters
  logsQuery: Joi.object({
    lines: Joi.number()
      .integer()
      .min(1)
      .max(10000)
      .default(100)
      .messages({
        'number.base': 'Lines must be a number',
        'number.integer': 'Lines must be an integer',
        'number.min': 'Lines must be at least 1',
        'number.max': 'Lines cannot exceed 10000'
      })
  }),

  updatePort: Joi.object({
    port: Joi.number()
      .integer()
      .min(1)
      .max(65535)
      .required()
      .messages({
        'number.base': 'Port must be a number',
        'number.integer': 'Port must be an integer',
        'number.min': 'Port must be at least 1',
        'number.max': 'Port cannot exceed 65535',
        'any.required': 'Port is required'
      })
  })
};

module.exports = projectSchemas;
