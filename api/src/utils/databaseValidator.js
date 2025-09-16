const { ValidationError } = require('./databaseErrors');

/**
 * Modern Database Validator
 * Provides comprehensive validation and sanitization
 */
class DatabaseValidator {
  /**
   * Sanitize string input
   */
  static sanitizeString(input, options = {}) {
    if (typeof input !== 'string') {
      throw new ValidationError('Input must be a string');
    }

    const {
      trim = true,
      maxLength = null,
      minLength = null,
      allowEmpty = false,
      pattern = null
    } = options;

    let sanitized = input;

    if (trim) {
      sanitized = sanitized.trim();
    }

    if (!allowEmpty && sanitized.length === 0) {
      throw new ValidationError('Input cannot be empty');
    }

    if (minLength && sanitized.length < minLength) {
      throw new ValidationError(`Input must be at least ${minLength} characters long`);
    }

    if (maxLength && sanitized.length > maxLength) {
      throw new ValidationError(`Input cannot exceed ${maxLength} characters`);
    }

    if (pattern && !pattern.test(sanitized)) {
      throw new ValidationError('Input format is invalid');
    }

    return sanitized;
  }

  /**
   * Sanitize email
   */
  static sanitizeEmail(email) {
    const sanitized = this.sanitizeString(email, {
      trim: true,
      maxLength: 254,
      minLength: 5,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    });

    return sanitized.toLowerCase();
  }

  /**
   * Sanitize username
   */
  static sanitizeUsername(username) {
    return this.sanitizeString(username, {
      trim: true,
      maxLength: 50,
      minLength: 3,
      pattern: /^[a-zA-Z0-9_-]+$/
    });
  }

  /**
   * Sanitize password
   */
  static sanitizePassword(password) {
    return this.sanitizeString(password, {
      trim: false,
      maxLength: 128,
      minLength: 6
    });
  }

  /**
   * Sanitize domain
   */
  static sanitizeDomain(domain) {
    return this.sanitizeString(domain, {
      trim: true,
      maxLength: 255,
      minLength: 1,
      pattern: /^[a-zA-Z0-9.-]+(\.[a-zA-Z]{2,})?(:[0-9]{1,5})?$/
    }).toLowerCase();
  }

  /**
   * Sanitize project name
   */
  static sanitizeProjectName(name) {
    return this.sanitizeString(name, {
      trim: true,
      maxLength: 50,
      minLength: 1,
      pattern: /^[a-zA-Z0-9-_]+$/
    });
  }

  /**
   * Sanitize URL
   */
  static sanitizeUrl(url) {
    return this.sanitizeString(url, {
      trim: true,
      maxLength: 2048,
      minLength: 1,
      pattern: /^https?:\/\/[^\s]+$/
    });
  }

  /**
   * Sanitize Git repository URL
   */
  static sanitizeGitUrl(url) {
    return this.sanitizeString(url, {
      trim: true,
      maxLength: 2048,
      minLength: 1,
      pattern: /^https?:\/\/[^\s]+\.git$/
    });
  }

  /**
   * Sanitize port number
   */
  static sanitizePort(port) {
    const portNum = parseInt(port);
    
    if (isNaN(portNum)) {
      throw new ValidationError('Port must be a number');
    }
    
    if (portNum < 1 || portNum > 65535) {
      throw new ValidationError('Port must be between 1 and 65535');
    }
    
    return portNum;
  }

  /**
   * Sanitize environment variables
   */
  static sanitizeEnvironment(env) {
    if (!env || typeof env !== 'object') {
      return {};
    }

    const sanitized = {};
    
    for (const [key, value] of Object.entries(env)) {
      if (typeof key === 'string' && typeof value === 'string') {
        const sanitizedKey = this.sanitizeString(key, {
          trim: true,
          maxLength: 100,
          minLength: 1,
          pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/
        });
        
        const sanitizedValue = this.sanitizeString(value, {
          trim: true,
          maxLength: 1000,
          allowEmpty: true
        });
        
        sanitized[sanitizedKey] = sanitizedValue;
      }
    }
    
    return sanitized;
  }

  /**
   * Sanitize pagination parameters
   */
  static sanitizePagination(page, limit, maxLimit = 100) {
    const sanitizedPage = Math.max(1, parseInt(page) || 1);
    const sanitizedLimit = Math.min(maxLimit, Math.max(1, parseInt(limit) || 10));
    
    return {
      page: sanitizedPage,
      limit: sanitizedLimit,
      skip: (sanitizedPage - 1) * sanitizedLimit
    };
  }

  /**
   * Sanitize sort parameters
   */
  static sanitizeSort(sortBy, sortOrder, allowedFields = []) {
    const sanitizedSortBy = allowedFields.includes(sortBy) ? sortBy : 'createdAt';
    const sanitizedSortOrder = sortOrder === 'asc' ? 1 : -1;
    
    return {
      [sanitizedSortBy]: sanitizedSortOrder
    };
  }

  /**
   * Sanitize search query
   */
  static sanitizeSearchQuery(query) {
    if (!query || typeof query !== 'string') {
      return '';
    }
    
    return this.sanitizeString(query, {
      trim: true,
      maxLength: 100,
      allowEmpty: true
    });
  }

  /**
   * Sanitize date range
   */
  static sanitizeDateRange(startDate, endDate) {
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    
    if (start && isNaN(start.getTime())) {
      throw new ValidationError('Invalid start date');
    }
    
    if (end && isNaN(end.getTime())) {
      throw new ValidationError('Invalid end date');
    }
    
    if (start && end && start > end) {
      throw new ValidationError('Start date cannot be after end date');
    }
    
    return { start, end };
  }

  /**
   * Sanitize MongoDB ObjectId
   */
  static sanitizeObjectId(id) {
    if (!id) {
      throw new ValidationError('ID is required');
    }
    
    const sanitized = this.sanitizeString(id.toString(), {
      trim: true,
      maxLength: 24,
      minLength: 24,
      pattern: /^[0-9a-fA-F]{24}$/
    });
    
    return sanitized;
  }

  /**
   * Validate and sanitize project data
   */
  static sanitizeProjectData(data) {
    const sanitized = {};
    
    if (data.name) {
      sanitized.name = this.sanitizeProjectName(data.name);
    }
    
    if (data.domain) {
      sanitized.domain = this.sanitizeDomain(data.domain);
    }
    
    if (data.repository) {
      sanitized.repository = this.sanitizeGitUrl(data.repository);
    }
    
    if (data.branch) {
      sanitized.branch = this.sanitizeString(data.branch, {
        trim: true,
        maxLength: 100,
        minLength: 1,
        pattern: /^[a-zA-Z0-9/._-]+$/
      });
    }
    
    if (data.buildCommand) {
      sanitized.buildCommand = this.sanitizeString(data.buildCommand, {
        trim: true,
        maxLength: 500,
        allowEmpty: true
      });
    }
    
    if (data.startCommand) {
      sanitized.startCommand = this.sanitizeString(data.startCommand, {
        trim: true,
        maxLength: 500,
        allowEmpty: true
      });
    }
    
    if (data.port) {
      sanitized.port = this.sanitizePort(data.port);
    }
    
    if (data.environment) {
      sanitized.environment = this.sanitizeEnvironment(data.environment);
    }
    
    if (typeof data.autoPort === 'boolean') {
      sanitized.autoPort = data.autoPort;
    }
    
    return sanitized;
  }

  /**
   * Validate and sanitize user data
   */
  static sanitizeUserData(data) {
    const sanitized = {};
    
    if (data.username) {
      sanitized.username = this.sanitizeUsername(data.username);
    }
    
    if (data.email) {
      sanitized.email = this.sanitizeEmail(data.email);
    }
    
    if (data.password) {
      sanitized.password = this.sanitizePassword(data.password);
    }
    
    if (data.roles && Array.isArray(data.roles)) {
      const validRoles = ['user', 'admin', 'moderator'];
      sanitized.roles = data.roles.filter(role => validRoles.includes(role));
    }
    
    if (typeof data.isActive === 'boolean') {
      sanitized.isActive = data.isActive;
    }
    
    return sanitized;
  }
}

module.exports = DatabaseValidator;