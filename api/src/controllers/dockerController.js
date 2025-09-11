const { logger } = require("../config/logger");
const ResponseHelper = require("../utils/responseHelper");
const DockerService = require("../services/dockerService");

class DockerController {
  constructor() {
    this.dockerService = new DockerService();
  }

  /**
   * Get all Docker containers
   */
  async getAllContainers(req, res) {
    const containers = await this.dockerService.getAllContainers();
    return ResponseHelper.successWithCount(res, containers);
  }

  /**
   * Get all Docker images
   */
  async getAllImages(req, res) {
    const images = await this.dockerService.getAllImages();
    return ResponseHelper.successWithCount(res, images);
  }

  /**
   * Get Docker networks
   */
  async getAllNetworks(req, res) {
    const networks = await this.dockerService.getAllNetworks();
    return ResponseHelper.successWithCount(res, networks);
  }

  /**
   * Get Docker volumes
   */
  async getAllVolumes(req, res) {
    const volumes = await this.dockerService.getAllVolumes();
    return ResponseHelper.successWithCount(res, volumes);
  }

  /**
   * Get Docker system info
   */
  async getSystemInfo(req, res) {
    const info = await this.dockerService.getSystemInfo();
    return ResponseHelper.success(res, info);
  }

  /**
   * Remove Docker image
   */
  async removeImage(req, res) {
    const { id } = req.params;
    await this.dockerService.removeImage(id);

    logger.info(`Docker image removed: ${id}`);

    return ResponseHelper.success(res, null, {
      message: "Docker image removed successfully",
    });
  }
}

module.exports = DockerController;