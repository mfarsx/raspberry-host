// Import setup first
require('./setup');

const ProjectController = require('../../controllers/projectController');
const { ProjectService } = require('../../services/projectService');
const ResponseHelper = require('../../utils/responseHelper');

describe("ProjectController", () => {
  let projectController;
  let mockReq;
  let mockRes;
  let mockProjectService;

  beforeEach(() => {
    projectController = new ProjectController();
    mockProjectService = new ProjectService();
    projectController.projectService = mockProjectService;

    mockReq = {
      params: {},
      body: {},
      query: {},
      user: { id: "1", roles: ["admin"] },
    };

    mockRes = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
    };

    // Reset mocks
    jest.clearAllMocks();
  });

  describe("getAllProjects", () => {
    it("should return all projects", async () => {
      const mockProjects = [
        { id: "1", name: "project1", status: "running" },
        { id: "2", name: "project2", status: "stopped" },
      ];

      mockProjectService.getAllProjects.mockResolvedValue(mockProjects);
      ResponseHelper.successWithCount.mockReturnValue(mockRes);

      await projectController.getAllProjects(mockReq, mockRes);

      expect(mockProjectService.getAllProjects).toHaveBeenCalled();
      expect(ResponseHelper.successWithCount).toHaveBeenCalledWith(
        mockRes,
        mockProjects
      );
    });
  });

  describe("searchProjects", () => {
    it("should search projects with query parameters", async () => {
      mockReq.query = { q: "test", status: "running", page: 1, limit: 10 };
      const mockProjects = [
        { id: "1", name: "test-project", status: "running" },
      ];

      mockProjectService.searchProjects.mockResolvedValue(mockProjects);
      ResponseHelper.successWithPagination.mockReturnValue(mockRes);

      await projectController.searchProjects(mockReq, mockRes);

      expect(mockProjectService.searchProjects).toHaveBeenCalledWith({
        search: "test",
        status: "running",
      });
      expect(ResponseHelper.successWithPagination).toHaveBeenCalledWith(
        mockRes,
        mockProjects,
        expect.objectContaining({
          page: 1,
          limit: 10,
          total: 1,
          pages: 1,
        })
      );
    });
  });

  describe("getProjectById", () => {
    it("should return project by id", async () => {
      mockReq.params.id = "project123";
      const mockProject = { id: "project123", name: "test-project" };

      mockProjectService.getProjectById.mockResolvedValue(mockProject);
      ResponseHelper.success.mockReturnValue(mockRes);

      await projectController.getProjectById(mockReq, mockRes);

      expect(mockProjectService.getProjectById).toHaveBeenCalledWith("project123");
      expect(ResponseHelper.success).toHaveBeenCalledWith(mockRes, mockProject);
    });

    it("should return not found for non-existent project", async () => {
      mockReq.params.id = "nonexistent";
      mockProjectService.getProjectById.mockResolvedValue(null);
      ResponseHelper.notFound.mockReturnValue(mockRes);

      await projectController.getProjectById(mockReq, mockRes);

      expect(ResponseHelper.notFound).toHaveBeenCalledWith(mockRes, "Project not found");
    });
  });

  describe("deployProject", () => {
    it("should deploy project successfully", async () => {
      mockReq.body = {
        name: "new-project",
        domain: "example.com",
        repository: "https://github.com/user/repo.git",
      };
      const mockProject = { id: "1", name: "new-project" };

      mockProjectService.deployProject.mockResolvedValue(mockProject);
      ResponseHelper.created.mockReturnValue(mockRes);

      await projectController.deployProject(mockReq, mockRes);

      expect(mockProjectService.deployProject).toHaveBeenCalledWith(mockReq.body);
      expect(ResponseHelper.created).toHaveBeenCalledWith(
        mockRes,
        mockProject,
        "Project deployed successfully"
      );
    });
  });

  describe("updateProject", () => {
    it("should update project successfully", async () => {
      mockReq.params.id = "project123";
      mockReq.body = { name: "updated-project" };
      const mockProject = { id: "project123", name: "updated-project" };

      mockProjectService.updateProject.mockResolvedValue(mockProject);
      ResponseHelper.success.mockReturnValue(mockRes);

      await projectController.updateProject(mockReq, mockRes);

      expect(mockProjectService.updateProject).toHaveBeenCalledWith(
        "project123",
        mockReq.body
      );
      expect(ResponseHelper.success).toHaveBeenCalledWith(mockRes, mockProject, {
        message: "Project updated successfully",
      });
    });

    it("should return not found for non-existent project", async () => {
      mockReq.params.id = "nonexistent";
      mockReq.body = { name: "updated-project" };
      mockProjectService.updateProject.mockResolvedValue(null);
      ResponseHelper.notFound.mockReturnValue(mockRes);

      await projectController.updateProject(mockReq, mockRes);

      expect(ResponseHelper.notFound).toHaveBeenCalledWith(mockRes, "Project not found");
    });
  });

  describe("deleteProject", () => {
    it("should delete project successfully", async () => {
      mockReq.params.id = "project123";
      mockProjectService.deleteProject.mockResolvedValue(true);
      ResponseHelper.success.mockReturnValue(mockRes);

      await projectController.deleteProject(mockReq, mockRes);

      expect(mockProjectService.deleteProject).toHaveBeenCalledWith("project123");
      expect(ResponseHelper.success).toHaveBeenCalledWith(mockRes, null, {
        message: "Project deleted successfully",
      });
    });

    it("should return not found for non-existent project", async () => {
      mockReq.params.id = "nonexistent";
      mockProjectService.deleteProject.mockResolvedValue(false);
      ResponseHelper.notFound.mockReturnValue(mockRes);

      await projectController.deleteProject(mockReq, mockRes);

      expect(ResponseHelper.notFound).toHaveBeenCalledWith(mockRes, "Project not found");
    });
  });

  describe("restartProject", () => {
    it("should restart project successfully", async () => {
      mockReq.params.id = "project123";
      mockProjectService.restartProject.mockResolvedValue(true);
      ResponseHelper.success.mockReturnValue(mockRes);

      await projectController.restartProject(mockReq, mockRes);

      expect(mockProjectService.restartProject).toHaveBeenCalledWith("project123");
      expect(ResponseHelper.success).toHaveBeenCalledWith(mockRes, null, {
        message: "Project restarted successfully",
      });
    });
  });

  describe("getProjectLogs", () => {
    it("should return project logs", async () => {
      mockReq.params.id = "project123";
      mockReq.query.lines = "100";
      const mockLogs = ["log1", "log2", "log3"];

      mockProjectService.getProjectLogs.mockResolvedValue(mockLogs);
      ResponseHelper.success.mockReturnValue(mockRes);

      await projectController.getProjectLogs(mockReq, mockRes);

      expect(mockProjectService.getProjectLogs).toHaveBeenCalledWith("project123", "100");
      expect(ResponseHelper.success).toHaveBeenCalledWith(mockRes, mockLogs);
    });

    it("should return not found for non-existent project", async () => {
      mockReq.params.id = "nonexistent";
      mockProjectService.getProjectLogs.mockResolvedValue(null);
      ResponseHelper.notFound.mockReturnValue(mockRes);

      await projectController.getProjectLogs(mockReq, mockRes);

      expect(ResponseHelper.notFound).toHaveBeenCalledWith(mockRes, "Project not found");
    });
  });

  describe("getProjectStatus", () => {
    it("should return project status", async () => {
      mockReq.params.id = "project123";
      const mockStatus = { status: "running", uptime: 3600 };

      mockProjectService.getProjectStatus.mockResolvedValue(mockStatus);
      ResponseHelper.success.mockReturnValue(mockRes);

      await projectController.getProjectStatus(mockReq, mockRes);

      expect(mockProjectService.getProjectStatus).toHaveBeenCalledWith("project123");
      expect(ResponseHelper.success).toHaveBeenCalledWith(mockRes, mockStatus);
    });
  });

  describe("getProjectStatistics", () => {
    it("should return project statistics", async () => {
      const mockStats = {
        total: 10,
        running: 8,
        stopped: 2,
      };

      mockProjectService.getProjectStatistics.mockResolvedValue(mockStats);
      ResponseHelper.success.mockReturnValue(mockRes);

      await projectController.getProjectStatistics(mockReq, mockRes);

      expect(mockProjectService.getProjectStatistics).toHaveBeenCalled();
      expect(ResponseHelper.success).toHaveBeenCalledWith(mockRes, mockStats);
    });
  });

  describe("startProject", () => {
    it("should start project successfully", async () => {
      mockReq.params.id = "project123";
      mockProjectService.startProject.mockResolvedValue(true);
      ResponseHelper.success.mockReturnValue(mockRes);

      await projectController.startProject(mockReq, mockRes);

      expect(mockProjectService.startProject).toHaveBeenCalledWith("project123");
      expect(ResponseHelper.success).toHaveBeenCalledWith(mockRes, null, {
        message: "Project started successfully",
      });
    });
  });

  describe("stopProject", () => {
    it("should stop project successfully", async () => {
      mockReq.params.id = "project123";
      mockProjectService.stopProject.mockResolvedValue(true);
      ResponseHelper.success.mockReturnValue(mockRes);

      await projectController.stopProject(mockReq, mockRes);

      expect(mockProjectService.stopProject).toHaveBeenCalledWith("project123");
      expect(ResponseHelper.success).toHaveBeenCalledWith(mockRes, null, {
        message: "Project stopped successfully",
      });
    });
  });
});