const Joi = require("joi");

/**
 * Common Validation Schemas
 *
 * Provides reusable validation components to eliminate duplication
 * across different schema files and ensure consistency.
 */
class CommonValidators {
  /**
   * Username validation schema
   * @param {boolean} required - Whether the field is required
   * @returns {Joi.Schema} Username validation schema
   */
  static username(required = true) {
    let schema = Joi.string()
      .min(3)
      .max(30)
      .pattern(/^[a-zA-Z0-9_-]+$/)
      .messages({
        "string.pattern.base":
          "Username can only contain letters, numbers, hyphens, and underscores",
        "string.min": "Username must be at least 3 characters long",
        "string.max": "Username cannot exceed 30 characters",
      });

    return required
      ? schema.required().messages({
          "any.required": "Username is required",
        })
      : schema.optional();
  }

  /**
   * Email validation schema
   * @param {boolean} required - Whether the field is required
   * @returns {Joi.Schema} Email validation schema
   */
  static email(required = true) {
    let schema = Joi.string().email().messages({
      "string.email": "Email must be a valid email address",
    });

    return required
      ? schema.required().messages({
          "any.required": "Email is required",
        })
      : schema.optional();
  }

  /**
   * Password validation schema
   * @param {boolean} required - Whether the field is required
   * @returns {Joi.Schema} Password validation schema
   */
  static password(required = true) {
    let schema = Joi.string()
      .min(8)
      .max(128)
      .pattern(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
      )
      .messages({
        "string.pattern.base":
          "Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character",
        "string.min": "Password must be at least 8 characters long",
        "string.max": "Password cannot exceed 128 characters",
      });

    return required
      ? schema.required().messages({
          "any.required": "Password is required",
        })
      : schema.optional();
  }

  /**
   * Generic ID validation schema
   * @param {boolean} required - Whether the field is required
   * @param {number} maxLength - Maximum length for the ID
   * @returns {Joi.Schema} ID validation schema
   */
  static id(required = true, maxLength = 100) {
    let schema = Joi.string()
      .min(1)
      .max(maxLength)
      .pattern(/^[a-zA-Z0-9-_]+$/)
      .messages({
        "string.pattern.base":
          "ID can only contain letters, numbers, hyphens, and underscores",
        "string.min": "ID cannot be empty",
        "string.max": `ID cannot exceed ${maxLength} characters`,
      });

    return required
      ? schema.required().messages({
          "any.required": "ID is required",
        })
      : schema.optional();
  }

  /**
   * User roles validation schema
   * @param {boolean} required - Whether the field is required
   * @param {Array} allowedRoles - Array of allowed role values
   * @returns {Joi.Schema} Roles validation schema
   */
  static roles(
    required = false,
    allowedRoles = ["admin", "user", "developer"]
  ) {
    let schema = Joi.array()
      .items(Joi.string().valid(...allowedRoles))
      .messages({
        "array.items": `Roles must be valid (${allowedRoles.join(", ")})`,
      });

    if (!required) {
      schema = schema.default(["user"]);
    }

    return required
      ? schema.required().messages({
          "any.required": "Roles are required",
        })
      : schema.optional();
  }

  /**
   * Project name validation schema
   * @param {boolean} required - Whether the field is required
   * @param {number} maxLength - Maximum length for project name
   * @returns {Joi.Schema} Project name validation schema
   */
  static projectName(required = true, maxLength = 50) {
    let schema = Joi.string()
      .min(1)
      .max(maxLength)
      .pattern(/^[a-zA-Z0-9-_]+$/)
      .messages({
        "string.pattern.base":
          "Project name can only contain letters, numbers, hyphens, and underscores",
        "string.min": "Project name must be at least 1 character long",
        "string.max": `Project name cannot exceed ${maxLength} characters`,
      });

    return required
      ? schema.required().messages({
          "any.required": "Project name is required",
        })
      : schema.optional();
  }

  /**
   * Domain validation schema
   * @param {boolean} required - Whether the field is required
   * @returns {Joi.Schema} Domain validation schema
   */
  static domain(required = true) {
    let schema = Joi.string()
      .min(1)
      .max(255)
      .pattern(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
      .messages({
        "string.pattern.base": "Domain must be a valid domain name",
        "string.min": "Domain cannot be empty",
        "string.max": "Domain cannot exceed 255 characters",
      });

    return required
      ? schema.required().messages({
          "any.required": "Domain is required",
        })
      : schema.optional();
  }

  /**
   * Repository URL validation schema
   * @param {boolean} required - Whether the field is required
   * @returns {Joi.Schema} Repository URL validation schema
   */
  static repositoryUrl(required = true) {
    let schema = Joi.string()
      .uri({ scheme: ["http", "https", "git"] })
      .messages({
        "string.uri": "Repository must be a valid URL",
      });

    return required
      ? schema.required().messages({
          "any.required": "Repository URL is required",
        })
      : schema.optional();
  }

  /**
   * Git branch name validation schema
   * @param {boolean} required - Whether the field is required
   * @returns {Joi.Schema} Branch name validation schema
   */
  static branchName(required = false) {
    let schema = Joi.string()
      .min(1)
      .max(100)
      .pattern(/^[a-zA-Z0-9/._-]+$/)
      .messages({
        "string.pattern.base": "Branch name contains invalid characters",
        "string.min": "Branch name cannot be empty",
        "string.max": "Branch name cannot exceed 100 characters",
      });

    if (!required) {
      schema = schema.default("main");
    }

    return required
      ? schema.required().messages({
          "any.required": "Branch name is required",
        })
      : schema.optional();
  }

  /**
   * Command string validation schema
   * @param {boolean} required - Whether the field is required
   * @param {number} maxLength - Maximum length for command
   * @returns {Joi.Schema} Command validation schema
   */
  static command(required = false, maxLength = 500) {
    let schema = Joi.string()
      .max(maxLength)
      .allow(null)
      .messages({
        "string.max": `Command cannot exceed ${maxLength} characters`,
      });

    return required
      ? schema.required().messages({
          "any.required": "Command is required",
        })
      : schema.optional();
  }

  /**
   * Port number validation schema
   * @param {boolean} required - Whether the field is required
   * @param {number} defaultPort - Default port value
   * @returns {Joi.Schema} Port validation schema
   */
  static port(required = false, defaultPort = 3000) {
    let schema = Joi.number().integer().min(1).max(65535).messages({
      "number.base": "Port must be a number",
      "number.integer": "Port must be an integer",
      "number.min": "Port must be at least 1",
      "number.max": "Port cannot exceed 65535",
    });

    if (!required) {
      schema = schema.default(defaultPort);
    }

    return required
      ? schema.required().messages({
          "any.required": "Port is required",
        })
      : schema.optional();
  }

  /**
   * Environment variables validation schema
   * @param {boolean} required - Whether the field is required
   * @returns {Joi.Schema} Environment variables validation schema
   */
  static environmentVariables(required = false) {
    let schema = Joi.object()
      .pattern(Joi.string().min(1).max(100), Joi.string().max(1000))
      .messages({
        "object.pattern":
          "Environment variable names must be 1-100 characters, values must be max 1000 characters",
      });

    if (!required) {
      schema = schema.default({});
    }

    return required
      ? schema.required().messages({
          "any.required": "Environment variables are required",
        })
      : schema.optional();
  }

  /**
   * Pagination parameters validation schema
   * @returns {Joi.Schema} Pagination validation schema
   */
  static pagination() {
    return Joi.object({
      page: Joi.number().integer().min(1).default(1).messages({
        "number.base": "Page must be a number",
        "number.integer": "Page must be an integer",
        "number.min": "Page must be at least 1",
      }),
      limit: Joi.number().integer().min(1).max(100).default(10).messages({
        "number.base": "Limit must be a number",
        "number.integer": "Limit must be an integer",
        "number.min": "Limit must be at least 1",
        "number.max": "Limit cannot exceed 100",
      }),
    });
  }

  /**
   * Search query validation schema
   * @param {number} maxLength - Maximum length for search term
   * @returns {Joi.Schema} Search validation schema
   */
  static searchQuery(maxLength = 100) {
    return Joi.object({
      ...this.pagination().describe().keys,
      search: Joi.string()
        .min(1)
        .max(maxLength)
        .optional()
        .messages({
          "string.min": "Search term must be at least 1 character",
          "string.max": `Search term cannot exceed ${maxLength} characters`,
        }),
    });
  }

  /**
   * Log lines query validation schema
   * @returns {Joi.Schema} Log lines validation schema
   */
  static logLinesQuery() {
    return Joi.object({
      lines: Joi.number().integer().min(1).max(10000).default(100).messages({
        "number.base": "Lines must be a number",
        "number.integer": "Lines must be an integer",
        "number.min": "Lines must be at least 1",
        "number.max": "Lines cannot exceed 10000",
      }),
    });
  }

  /**
   * Create a schema that requires at least one field for updates
   * @param {Joi.Schema} schema - Base schema object
   * @returns {Joi.Schema} Schema with minimum one field requirement
   */
  static requireAtLeastOne(schema) {
    return schema.min(1).messages({
      "object.min": "At least one field must be provided for update",
    });
  }

  /**
   * Create a parameter validation schema for route params
   * @param {string} paramName - Name of the parameter
   * @param {Joi.Schema} paramSchema - Schema for the parameter
   * @returns {Joi.Schema} Parameter validation schema
   */
  static paramSchema(paramName, paramSchema) {
    return Joi.object({
      [paramName]: paramSchema,
    });
  }
}

module.exports = CommonValidators;
