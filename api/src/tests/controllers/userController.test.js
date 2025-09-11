// Import setup first
require('./setup');

const UserController = require('../../controllers/userController');
const bcrypt = require('bcryptjs');
const ResponseHelper = require('../../utils/responseHelper');

describe("UserController", () => {
  let userController;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    userController = new UserController();
    
    mockReq = {
      params: {},
      body: {},
      query: {},
      user: { id: "1", username: "admin", email: "admin@example.com", roles: ["admin"] },
    };

    mockRes = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
    };

    // Reset mocks
    jest.clearAllMocks();
  });

  describe("getAllUsers", () => {
    it("should return all users with pagination", async () => {
      mockReq.query = { page: 1, limit: 10, search: "" };
      ResponseHelper.successWithPagination.mockReturnValue(mockRes);

      await userController.getAllUsers(mockReq, mockRes);

      expect(ResponseHelper.successWithPagination).toHaveBeenCalledWith(
        mockRes,
        expect.arrayContaining([
          expect.objectContaining({
            id: "1",
            username: "admin",
            email: "admin@example.com",
            roles: ["admin"],
            isActive: true,
          }),
        ]),
        expect.objectContaining({
          page: 1,
          limit: 10,
          total: expect.any(Number),
          pages: expect.any(Number),
        })
      );
    });

    it("should filter users by search term", async () => {
      mockReq.query = { page: 1, limit: 10, search: "admin" };
      ResponseHelper.successWithPagination.mockReturnValue(mockRes);

      await userController.getAllUsers(mockReq, mockRes);

      expect(ResponseHelper.successWithPagination).toHaveBeenCalledWith(
        mockRes,
        expect.arrayContaining([
          expect.objectContaining({
            username: "admin",
            email: "admin@example.com",
          }),
        ]),
        expect.any(Object)
      );
    });
  });

  describe("getUserById", () => {
    it("should return user by id", async () => {
      mockReq.params.id = "1";
      ResponseHelper.success.mockReturnValue(mockRes);

      await userController.getUserById(mockReq, mockRes);

      expect(ResponseHelper.success).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({
          id: "1",
          username: "admin",
          email: "admin@example.com",
          roles: ["admin"],
          isActive: true,
        })
      );
    });

    it("should return not found for non-existent user", async () => {
      mockReq.params.id = "999";
      ResponseHelper.notFound.mockReturnValue(mockRes);

      await userController.getUserById(mockReq, mockRes);

      expect(ResponseHelper.notFound).toHaveBeenCalledWith(
        mockRes,
        "User not found",
        "NOT_FOUND"
      );
    });
  });

  describe("createUser", () => {
    it("should create user successfully", async () => {
      mockReq.body = {
        username: "newuser",
        email: "newuser@example.com",
        password: "password123",
        roles: ["user"],
      };

      bcrypt.hash.mockResolvedValue("hashed-password");
      ResponseHelper.created.mockReturnValue(mockRes);

      await userController.createUser(mockReq, mockRes);

      expect(bcrypt.hash).toHaveBeenCalledWith("password123", 10);
      expect(ResponseHelper.created).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({
          username: "newuser",
          email: "newuser@example.com",
          roles: ["user"],
          isActive: true,
        }),
        "User created successfully"
      );
    });

    it("should return conflict for existing user", async () => {
      mockReq.body = {
        username: "admin",
        email: "admin@example.com",
        password: "password123",
        roles: ["user"],
      };

      ResponseHelper.conflict.mockReturnValue(mockRes);

      await userController.createUser(mockReq, mockRes);

      expect(ResponseHelper.conflict).toHaveBeenCalledWith(mockRes, "User already exists");
    });
  });

  describe("updateUser", () => {
    it("should update user successfully", async () => {
      mockReq.params.id = "1";
      mockReq.body = {
        username: "updatedadmin",
        email: "updatedadmin@example.com",
      };

      ResponseHelper.success.mockReturnValue(mockRes);

      await userController.updateUser(mockReq, mockRes);

      expect(ResponseHelper.success).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({
          id: "1",
          username: "updatedadmin",
          email: "updatedadmin@example.com",
          roles: ["admin"],
          isActive: true,
        }),
        { message: "User updated successfully" }
      );
    });

    it("should update user roles if admin", async () => {
      mockReq.params.id = "1";
      mockReq.body = {
        roles: ["admin", "user"],
      };

      ResponseHelper.success.mockReturnValue(mockRes);

      await userController.updateUser(mockReq, mockRes);

      expect(ResponseHelper.success).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({
          roles: ["admin", "user"],
        }),
        { message: "User updated successfully" }
      );
    });

    it("should return not found for non-existent user", async () => {
      mockReq.params.id = "999";
      mockReq.body = { username: "newname" };
      ResponseHelper.notFound.mockReturnValue(mockRes);

      await userController.updateUser(mockReq, mockRes);

      expect(ResponseHelper.notFound).toHaveBeenCalledWith(mockRes, "User not found");
    });
  });

  describe("deleteUser", () => {
    it("should soft delete user successfully", async () => {
      // Create a second user first
      userController.users.push({
        id: "2",
        username: "testuser",
        email: "test@example.com",
        password: "hashed",
        roles: ["user"],
        createdAt: new Date(),
        lastLogin: null,
        isActive: true,
      });

      mockReq.params.id = "2"; // Different from current user
      ResponseHelper.success.mockReturnValue(mockRes);

      await userController.deleteUser(mockReq, mockRes);

      expect(ResponseHelper.success).toHaveBeenCalledWith(mockRes, null, {
        message: "User deleted successfully",
      });
    });

    it("should prevent admin from deleting themselves", async () => {
      mockReq.params.id = "1"; // Same as current user
      ResponseHelper.error.mockReturnValue(mockRes);

      await userController.deleteUser(mockReq, mockRes);

      expect(ResponseHelper.error).toHaveBeenCalledWith(
        mockRes,
        400,
        "Cannot delete your own account",
        "VALIDATION_ERROR"
      );
    });

    it("should return not found for non-existent user", async () => {
      mockReq.params.id = "999";
      ResponseHelper.notFound.mockReturnValue(mockRes);

      await userController.deleteUser(mockReq, mockRes);

      expect(ResponseHelper.notFound).toHaveBeenCalledWith(mockRes, "User not found");
    });
  });

  describe("assignRoles", () => {
    it("should assign roles to user successfully", async () => {
      mockReq.params.id = "1";
      mockReq.body = { roles: ["admin", "user"] };
      ResponseHelper.success.mockReturnValue(mockRes);

      await userController.assignRoles(mockReq, mockRes);

      expect(ResponseHelper.success).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({
          id: "1",
          username: "admin",
          email: "admin@example.com",
          roles: ["admin", "user"],
        }),
        { message: "Roles assigned successfully" }
      );
    });

    it("should return not found for non-existent user", async () => {
      mockReq.params.id = "999";
      mockReq.body = { roles: ["user"] };
      ResponseHelper.notFound.mockReturnValue(mockRes);

      await userController.assignRoles(mockReq, mockRes);

      expect(ResponseHelper.notFound).toHaveBeenCalledWith(mockRes, "User not found");
    });
  });

  describe("getUserStatistics", () => {
    it("should return user statistics", async () => {
      ResponseHelper.success.mockReturnValue(mockRes);

      await userController.getUserStatistics(mockReq, mockRes);

      expect(ResponseHelper.success).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({
          total: expect.any(Number),
          admins: expect.any(Number),
          users: expect.any(Number),
          recentLogins: expect.any(Number),
          createdAt: expect.objectContaining({
            today: expect.any(Number),
            thisWeek: expect.any(Number),
            thisMonth: expect.any(Number),
          }),
        })
      );
    });
  });
});