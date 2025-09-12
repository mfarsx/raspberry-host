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
  ...MiddlewareComposer.authWithParamValidation(projectSchemas.projectId),
  ResponseHelper.asyncHandler(projectController.getProjectById.bind(projectController))
);

// Deploy new project
router.post(
  "/deploy",
  ...MiddlewareComposer.createResource(
    projectController.deployProject.bind(projectController),
    projectSchemas.deployProject,
    "admin"
  )
);

// Update project
router.put(
  "/:id",
  ...MiddlewareComposer.updateResource(
    projectController.updateProject.bind(projectController),
    projectSchemas.projectId,
    projectSchemas.updateProject,
    "admin"
  )
);

// Delete project
router.delete(
  "/:id",
  ...MiddlewareComposer.deleteResource(
    projectController.deleteProject.bind(projectController),
    projectSchemas.projectId,
    "admin"
  )
);

// Restart project
router.post(
  "/:id/restart",
  ...MiddlewareComposer.getResource(
    projectController.restartProject.bind(projectController),
    projectSchemas.projectId,
    "admin"
  )
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
  ...MiddlewareComposer.getResource(
    projectController.getProjectStatus.bind(projectController),
    projectSchemas.projectId
  )
);

// Get project statistics
router.get(
  "/stats/overview",
  ...MiddlewareComposer.admin(),
  ResponseHelper.asyncHandler(projectController.getProjectStatistics.bind(projectController))
);

// Start project
router.post(
  "/:id/start",
  ...MiddlewareComposer.getResource(
    projectController.startProject.bind(projectController),
    projectSchemas.projectId,
    "admin"
  )
);

// Stop project
router.post(
  "/:id/stop",
  ...MiddlewareComposer.getResource(
    projectController.stopProject.bind(projectController),
    projectSchemas.projectId,
    "admin"
  )
);

// Update project port
router.put(
  "/:id/port",
  ...MiddlewareComposer.updateResource(
    projectController.updateProjectPort.bind(projectController),
    projectSchemas.projectId,
    projectSchemas.updatePort,
    "admin"
  )
);

module.exports = router;
