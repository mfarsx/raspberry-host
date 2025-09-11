const Joi = require("joi");
const CommonValidators = require("./common");

/**
 * Validation schemas for authentication-related operations
 * Uses CommonValidators to eliminate duplication and ensure consistency
 */
const authSchemas = {
  // Schema for user registration
  register: Joi.object({
    username: CommonValidators.username(true),
    email: CommonValidators.email(true),
    password: CommonValidators.password(true),
  }),

  // Schema for user login
  login: Joi.object({
    email: CommonValidators.email(true),
    password: Joi.string().required().messages({
      "any.required": "Password is required",
    }),
  }),

  // Schema for profile updates
  updateProfile: CommonValidators.requireAtLeastOne(
    Joi.object({
      username: CommonValidators.username(false),
      email: CommonValidators.email(false),
    })
  ),

  // Schema for password change
  changePassword: Joi.object({
    currentPassword: Joi.string().required().messages({
      "any.required": "Current password is required",
    }),
    newPassword: CommonValidators.password(true),
  }),
};

module.exports = authSchemas;
