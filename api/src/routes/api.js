const { Router } = require("express");
const ResponseHelper = require("../utils/responseHelper");
const MiddlewareComposer = require("../utils/middlewareComposer");
const ApiController = require("../controllers/apiController");

const router = Router();
const apiController = new ApiController();

// Basic API routes
router.get(
  "/",
  ...MiddlewareComposer.public(),
  ResponseHelper.asyncHandler(apiController.getApiInfo.bind(apiController))
);

// Simple health check for clients
router.get(
  "/health-check",
  ...MiddlewareComposer.public(),
  ResponseHelper.asyncHandler(apiController.getHealthCheck.bind(apiController))
);

// System stats endpoint
router.get(
  "/stats",
  ...MiddlewareComposer.public(),
  ResponseHelper.asyncHandler(apiController.getStats.bind(apiController))
);

// System information endpoint
router.get(
  "/system",
  ...MiddlewareComposer.public(),
  ResponseHelper.asyncHandler(apiController.getSystemInfo.bind(apiController))
);

// System status endpoint
router.get(
  "/system/status",
  ...MiddlewareComposer.public(),
  ResponseHelper.asyncHandler(apiController.getSystemStatus.bind(apiController))
);

// System info endpoint for frontend dashboard
router.get(
  "/system-info",
  ...MiddlewareComposer.public(),
  ResponseHelper.asyncHandler(apiController.getDetailedSystemInfo.bind(apiController))
);

module.exports = router;
