const { Router } = require("express");
const AuthMiddleware = require("../middleware/auth");
const ValidationMiddleware = require("../middleware/validation");
const ResponseHelper = require("../utils/responseHelper");
const MiddlewareComposer = require("../utils/middlewareComposer");
const AuthController = require("../controllers/authController");
const authSchemas = require("../schemas/authSchemas");

const router = Router();
const authController = new AuthController();

// User registration
router.post(
  "/register",
  ...MiddlewareComposer.authRoute(authController.register.bind(authController), authSchemas.register)
);

// User login
router.post(
  "/login",
  AuthMiddleware.authRateLimit,
  AuthMiddleware.recordAuthAttempt,
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validateBody(authSchemas.login),
  ResponseHelper.asyncHandler(authController.login.bind(authController))
);

// Get current user profile
router.get(
  "/me",
  ...MiddlewareComposer.user(),
  ResponseHelper.asyncHandler(authController.getCurrentUser.bind(authController))
);

// Update user profile
router.put(
  "/profile",
  ...MiddlewareComposer.authWithBodyValidation(authSchemas.updateProfile),
  ResponseHelper.asyncHandler(authController.updateProfile.bind(authController))
);

// Change password
router.put(
  "/password",
  AuthMiddleware.verifyToken,
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validateBody(authSchemas.changePassword),
  ResponseHelper.asyncHandler(authController.changePassword.bind(authController))
);

// Refresh token
router.post(
  "/refresh",
  AuthMiddleware.verifyToken,
  ResponseHelper.asyncHandler(authController.refreshToken.bind(authController))
);

// Logout (client-side token invalidation)
router.post(
  "/logout",
  AuthMiddleware.verifyToken,
  ResponseHelper.asyncHandler(authController.logout.bind(authController))
);

module.exports = router;
