const { Router } = require("express");
const ResponseHelper = require("../utils/responseHelper");
const MiddlewareComposer = require("../utils/middlewareComposer");
const HealthController = require("../controllers/healthController");

const router = Router();
const healthController = new HealthController();

// Health check endpoint
router.get(
  "/",
  ...MiddlewareComposer.public(),
  ResponseHelper.asyncHandler(healthController.getHealthStatus.bind(healthController))
);

// Detailed health check
router.get(
  "/detailed",
  ...MiddlewareComposer.public(),
  ResponseHelper.asyncHandler(healthController.getDetailedHealth.bind(healthController))
);

module.exports = router;
