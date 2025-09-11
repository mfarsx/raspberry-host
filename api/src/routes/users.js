const { Router } = require("express");
const AuthMiddleware = require("../middleware/auth");
const ValidationMiddleware = require("../middleware/validation");
const ResponseHelper = require("../utils/responseHelper");
const MiddlewareComposer = require("../utils/middlewareComposer");
const UserController = require("../controllers/userController");
const userSchemas = require("../schemas/userSchemas");

const router = Router();
const userController = new UserController();

// Get all users (admin only)
router.get(
  "/",
  ...MiddlewareComposer.admin(),
  ResponseHelper.asyncHandler(userController.getAllUsers.bind(userController))
);

// Get user by ID
router.get(
  "/:id",
  ...MiddlewareComposer.authWithParamValidation(userSchemas.userId),
  ResponseHelper.asyncHandler(userController.getUserById.bind(userController))
);

// Create user (admin only)
router.post(
  "/",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole("admin"),
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validateBody(userSchemas.createUser),
  ResponseHelper.asyncHandler(userController.createUser.bind(userController))
);

// Update user
router.put(
  "/:id",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireOwnership("id"),
  ValidationMiddleware.validateParams(userSchemas.userId),
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validateBody(userSchemas.updateUser),
  ResponseHelper.asyncHandler(userController.updateUser.bind(userController))
);

// Delete user (soft delete)
router.delete(
  "/:id",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole("admin"),
  ValidationMiddleware.validateParams(userSchemas.userId),
  ResponseHelper.asyncHandler(userController.deleteUser.bind(userController))
);

// Assign roles to user (admin only)
router.post(
  "/:id/roles",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole("admin"),
  ValidationMiddleware.validateParams(userSchemas.userId),
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validateBody(userSchemas.assignRoles),
  ResponseHelper.asyncHandler(userController.assignRoles.bind(userController))
);

// Get user statistics (admin only)
router.get(
  "/stats/overview",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole("admin"),
  ResponseHelper.asyncHandler(userController.getUserStatistics.bind(userController))
);

module.exports = router;
