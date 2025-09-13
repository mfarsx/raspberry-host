const { Router } = require("express");
const ResponseHelper = require("../utils/responseHelper");
const MiddlewareComposer = require("../utils/middlewareComposer");
const ConfigController = require("../controllers/configController");

const router = Router();
const configController = new ConfigController();

// Application configuration endpoint
router.get(
  "/app",
  ...MiddlewareComposer.public(),
  ResponseHelper.asyncHandler(configController.getAppConfig.bind(configController))
);

// System configuration endpoint
router.get(
  "/system",
  ...MiddlewareComposer.public(),
  ResponseHelper.asyncHandler(configController.getSystemConfig.bind(configController))
);

// UI configuration endpoint
router.get(
  "/ui",
  ...MiddlewareComposer.public(),
  ResponseHelper.asyncHandler(configController.getUIConfig.bind(configController))
);

// All configuration endpoint (convenience endpoint)
router.get(
  "/",
  ...MiddlewareComposer.public(),
  ResponseHelper.asyncHandler(configController.getAllConfig.bind(configController))
);

module.exports = router;