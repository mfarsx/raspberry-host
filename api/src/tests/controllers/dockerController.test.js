// Import setup first
require('./setup');

const DockerController = require("../../controllers/dockerController");
const DockerService = require("../../services/dockerService");
const ResponseHelper = require("../../utils/responseHelper");

describe("DockerController", () => {
  let dockerController;
  let mockReq;
  let mockRes;
  let mockDockerService;

  beforeEach(() => {
    dockerController = new DockerController();
    mockDockerService = new DockerService();
    dockerController.dockerService = mockDockerService;

    mockReq = {
      params: {},
      body: {},
      user: { id: "1", roles: ["admin"] },
    };

    mockRes = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
    };

    // Reset mocks
    jest.clearAllMocks();
  });

  describe("getAllContainers", () => {
    it("should return all containers", async () => {
      const mockContainers = [
        { id: "1", name: "container1", status: "running" },
        { id: "2", name: "container2", status: "stopped" },
      ];

      mockDockerService.getAllContainers.mockResolvedValue(mockContainers);
      ResponseHelper.successWithCount.mockReturnValue(mockRes);

      await dockerController.getAllContainers(mockReq, mockRes);

      expect(mockDockerService.getAllContainers).toHaveBeenCalled();
      expect(ResponseHelper.successWithCount).toHaveBeenCalledWith(
        mockRes,
        mockContainers
      );
    });

    it("should handle service errors", async () => {
      const error = new Error("Docker service error");
      mockDockerService.getAllContainers.mockRejectedValue(error);

      await expect(
        dockerController.getAllContainers(mockReq, mockRes)
      ).rejects.toThrow("Docker service error");
    });
  });

  describe("getAllImages", () => {
    it("should return all images", async () => {
      const mockImages = [
        { id: "1", repository: "nginx", tag: "latest" },
        { id: "2", repository: "node", tag: "18" },
      ];

      mockDockerService.getAllImages.mockResolvedValue(mockImages);
      ResponseHelper.successWithCount.mockReturnValue(mockRes);

      await dockerController.getAllImages(mockReq, mockRes);

      expect(mockDockerService.getAllImages).toHaveBeenCalled();
      expect(ResponseHelper.successWithCount).toHaveBeenCalledWith(
        mockRes,
        mockImages
      );
    });
  });

  describe("getAllNetworks", () => {
    it("should return all networks", async () => {
      const mockNetworks = [
        { id: "1", name: "bridge", driver: "bridge" },
        { id: "2", name: "host", driver: "host" },
      ];

      mockDockerService.getAllNetworks.mockResolvedValue(mockNetworks);
      ResponseHelper.successWithCount.mockReturnValue(mockRes);

      await dockerController.getAllNetworks(mockReq, mockRes);

      expect(mockDockerService.getAllNetworks).toHaveBeenCalled();
      expect(ResponseHelper.successWithCount).toHaveBeenCalledWith(
        mockRes,
        mockNetworks
      );
    });
  });

  describe("getAllVolumes", () => {
    it("should return all volumes", async () => {
      const mockVolumes = [
        { id: "1", name: "volume1", driver: "local" },
        { id: "2", name: "volume2", driver: "local" },
      ];

      mockDockerService.getAllVolumes.mockResolvedValue(mockVolumes);
      ResponseHelper.successWithCount.mockReturnValue(mockRes);

      await dockerController.getAllVolumes(mockReq, mockRes);

      expect(mockDockerService.getAllVolumes).toHaveBeenCalled();
      expect(ResponseHelper.successWithCount).toHaveBeenCalledWith(
        mockRes,
        mockVolumes
      );
    });
  });

  describe("getSystemInfo", () => {
    it("should return system info", async () => {
      const mockInfo = {
        containers: 5,
        images: 10,
        networks: 3,
        volumes: 2,
      };

      mockDockerService.getSystemInfo.mockResolvedValue(mockInfo);
      ResponseHelper.success.mockReturnValue(mockRes);

      await dockerController.getSystemInfo(mockReq, mockRes);

      expect(mockDockerService.getSystemInfo).toHaveBeenCalled();
      expect(ResponseHelper.success).toHaveBeenCalledWith(mockRes, mockInfo);
    });
  });

  describe("removeImage", () => {
    it("should remove image successfully", async () => {
      mockReq.params.id = "image123";
      mockDockerService.removeImage.mockResolvedValue();
      ResponseHelper.success.mockReturnValue(mockRes);

      await dockerController.removeImage(mockReq, mockRes);

      expect(mockDockerService.removeImage).toHaveBeenCalledWith("image123");
      expect(ResponseHelper.success).toHaveBeenCalledWith(mockRes, null, {
        message: "Docker image removed successfully",
      });
    });

    it("should handle removal errors", async () => {
      mockReq.params.id = "image123";
      const error = new Error("Image not found");
      mockDockerService.removeImage.mockRejectedValue(error);

      await expect(
        dockerController.removeImage(mockReq, mockRes)
      ).rejects.toThrow("Image not found");
    });
  });
});