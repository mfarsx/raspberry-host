const { Router } = require("express");
const AuthMiddleware = require("../middleware/auth");
const ValidationMiddleware = require("../middleware/validation");
const ResponseHelper = require("../utils/responseHelper");
const MiddlewareComposer = require("../utils/middlewareComposer");
const ProjectController = require("../controllers/projectController");
const projectSchemas = require("../schemas/projectSchemas");

const router = Router();
const projectController = new ProjectController();

// Get all hosted projects
router.get(
  "/",
  ...MiddlewareComposer.user(),
  ResponseHelper.asyncHandler(projectController.getAllProjects.bind(projectController))
);

// Search projects (must come before /:id route)
router.get(
  "/search",
  ...MiddlewareComposer.user(),
  ResponseHelper.asyncHandler(projectController.searchProjects.bind(projectController))
);

// Get project by ID
router.get(
  "/:id",
  AuthMiddleware.verifyToken,
  ValidationMiddleware.validateParams(projectSchemas.projectId),
  ResponseHelper.asyncHandler(projectController.getProjectById.bind(projectController))
);

// Deploy new project
router.post(
  "/deploy",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole("admin"),
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validateBody(projectSchemas.deployProject),
  ResponseHelper.asyncHandler(projectController.deployProject.bind(projectController))
);

// Update project
router.put(
  "/:id",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole("admin"),
  ValidationMiddleware.validateParams(projectSchemas.projectId),
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validateBody(projectSchemas.updateProject),
  ResponseHelper.asyncHandler(projectController.updateProject.bind(projectController))
);

// Delete project
router.delete(
  "/:id",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole("admin"),
  ValidationMiddleware.validateParams(projectSchemas.projectId),
  ResponseHelper.asyncHandler(projectController.deleteProject.bind(projectController))
);

// Restart project
router.post(
  "/:id/restart",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole("admin"),
  ValidationMiddleware.validateParams(projectSchemas.projectId),
  ResponseHelper.asyncHandler(projectController.restartProject.bind(projectController))
);

// Get project logs
router.get(
  "/:id/logs",
  AuthMiddleware.verifyToken,
  ValidationMiddleware.validateParams(projectSchemas.projectId),
  ValidationMiddleware.validateQuery(projectSchemas.logsQuery),
  ResponseHelper.asyncHandler(projectController.getProjectLogs.bind(projectController))
);

// Get project status
router.get(
  "/:id/status",
  AuthMiddleware.verifyToken,
  ValidationMiddleware.validateParams(projectSchemas.projectId),
  ResponseHelper.asyncHandler(projectController.getProjectStatus.bind(projectController))
);

// Get project statistics
router.get(
  "/stats/overview",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole("admin"),
  ResponseHelper.asyncHandler(projectController.getProjectStatistics.bind(projectController))
);

// Start project
router.post(
  "/:id/start",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole("admin"),
  ValidationMiddleware.validateParams(projectSchemas.projectId),
  ResponseHelper.asyncHandler(projectController.startProject.bind(projectController))
);

// Stop project
router.post(
  "/:id/stop",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole("admin"),
  ValidationMiddleware.validateParams(projectSchemas.projectId),
  ResponseHelper.asyncHandler(projectController.stopProject.bind(projectController))
);

module.exports = router;
