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
  ...MiddlewareComposer.createResource(
    userController.createUser.bind(userController),
    userSchemas.createUser,
    "admin"
  )
);

// Update user
router.put(
  "/:id",
  ...MiddlewareComposer.ownership("id"),
  ValidationMiddleware.validateParams(userSchemas.userId),
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validateBody(userSchemas.updateUser),
  ResponseHelper.asyncHandler(userController.updateUser.bind(userController))
);

// Delete user (soft delete)
router.delete(
  "/:id",
  ...MiddlewareComposer.deleteResource(
    userController.deleteUser.bind(userController),
    userSchemas.userId,
    "admin"
  )
);

// Assign roles to user (admin only)
router.post(
  "/:id/roles",
  ...MiddlewareComposer.updateResource(
    userController.assignRoles.bind(userController),
    userSchemas.userId,
    userSchemas.assignRoles,
    "admin"
  )
);

// Get user statistics (admin only)
router.get(
  "/stats/overview",
  ...MiddlewareComposer.admin(),
  ResponseHelper.asyncHandler(userController.getUserStatistics.bind(userController))
);

module.exports = router;
