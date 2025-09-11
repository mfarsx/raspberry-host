const { Router } = require("express");
const AuthMiddleware = require("../middleware/auth");
const ValidationMiddleware = require("../middleware/validation");
const ResponseHelper = require("../utils/responseHelper");
const DockerController = require("../controllers/dockerController");

const router = Router();
const dockerController = new DockerController();

// Get all Docker containers
router.get(
  "/containers",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole("admin"),
  ResponseHelper.asyncHandler(dockerController.getAllContainers.bind(dockerController))
);

// Get all Docker images
router.get(
  "/images",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole("admin"),
  ResponseHelper.asyncHandler(dockerController.getAllImages.bind(dockerController))
);

// Get Docker networks
router.get(
  "/networks",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole("admin"),
  ResponseHelper.asyncHandler(dockerController.getAllNetworks.bind(dockerController))
);

// Get Docker volumes
router.get(
  "/volumes",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole("admin"),
  ResponseHelper.asyncHandler(dockerController.getAllVolumes.bind(dockerController))
);

// Get Docker system info
router.get(
  "/info",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole("admin"),
  ResponseHelper.asyncHandler(dockerController.getSystemInfo.bind(dockerController))
);

// Remove Docker image
router.delete(
  "/images/:id",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole("admin"),
  ValidationMiddleware.validateParams({
    id: { type: "string", required: true },
  }),
  ResponseHelper.asyncHandler(dockerController.removeImage.bind(dockerController))
);

module.exports = router;
