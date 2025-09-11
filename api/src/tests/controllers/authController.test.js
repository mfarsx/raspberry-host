// Import setup first
require('./setup');

const AuthController = require('../../controllers/authController');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const ResponseHelper = require('../../utils/responseHelper');

describe("AuthController", () => {
  let authController;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    authController = new AuthController();
    
    mockReq = {
      body: {},
      user: { id: "1", username: "admin", email: "admin@example.com", roles: ["admin"] },
      ip: "127.0.0.1",
      path: "/api/auth/login",
    };

    mockRes = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
    };

    // Reset mocks
    jest.clearAllMocks();
  });

  describe("register", () => {
    it("should register new user successfully", async () => {
      mockReq.body = {
        username: "newuser",
        email: "newuser@example.com",
        password: "password123",
      };

      bcrypt.hash.mockResolvedValue("hashed-password");
      ResponseHelper.created.mockReturnValue(mockRes);

      await authController.register(mockReq, mockRes);

      expect(bcrypt.hash).toHaveBeenCalledWith("password123", 10);
      expect(ResponseHelper.created).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({
          username: "newuser",
          email: "newuser@example.com",
          roles: ["user"],
        }),
        "User registered successfully"
      );
    });

    it("should return conflict for existing user", async () => {
      mockReq.body = {
        username: "admin",
        email: "admin@example.com",
        password: "password123",
      };

      ResponseHelper.conflict.mockReturnValue(mockRes);

      await authController.register(mockReq, mockRes);

      expect(ResponseHelper.conflict).toHaveBeenCalledWith(mockRes, "User already exists");
    });
  });

  describe("login", () => {
    it("should login user successfully", async () => {
      mockReq.body = {
        email: "admin@example.com",
        password: "password",
      };

      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue("mock-jwt-token");
      ResponseHelper.success.mockReturnValue(mockRes);

      await authController.login(mockReq, mockRes);

      expect(bcrypt.compare).toHaveBeenCalledWith("password", expect.any(String));
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "1",
          username: "admin",
          email: "admin@example.com",
          roles: ["admin"],
        }),
        "test-secret",
        { expiresIn: "24h" }
      );
      expect(ResponseHelper.success).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({
          token: "mock-jwt-token",
          user: expect.objectContaining({
            id: "1",
            username: "admin",
            email: "admin@example.com",
            roles: ["admin"],
          }),
        }),
        { message: "Login successful" }
      );
    });

    it("should return unauthorized for invalid email", async () => {
      mockReq.body = {
        email: "nonexistent@example.com",
        password: "password",
      };

      ResponseHelper.unauthorized.mockReturnValue(mockRes);

      await authController.login(mockReq, mockRes);

      expect(ResponseHelper.unauthorized).toHaveBeenCalledWith(
        mockRes,
        "Invalid credentials",
        "AUTH_ERROR"
      );
    });

    it("should return unauthorized for invalid password", async () => {
      mockReq.body = {
        email: "admin@example.com",
        password: "wrongpassword",
      };

      bcrypt.compare.mockResolvedValue(false);
      ResponseHelper.unauthorized.mockReturnValue(mockRes);

      await authController.login(mockReq, mockRes);

      expect(ResponseHelper.unauthorized).toHaveBeenCalledWith(
        mockRes,
        "Invalid credentials",
        "AUTH_ERROR"
      );
    });
  });

  describe("getCurrentUser", () => {
    it("should return current user profile", async () => {
      ResponseHelper.success.mockReturnValue(mockRes);

      await authController.getCurrentUser(mockReq, mockRes);

      expect(ResponseHelper.success).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({
          id: "1",
          username: "admin",
          email: "admin@example.com",
          roles: ["admin"],
        })
      );
    });

    it("should return not found for non-existent user", async () => {
      mockReq.user.id = "999";
      ResponseHelper.notFound.mockReturnValue(mockRes);

      await authController.getCurrentUser(mockReq, mockRes);

      expect(ResponseHelper.notFound).toHaveBeenCalledWith(
        mockRes,
        "User not found",
        "NOT_FOUND"
      );
    });
  });

  describe("updateProfile", () => {
    it("should update user profile successfully", async () => {
      mockReq.body = {
        username: "newusername",
        email: "newemail@example.com",
      };

      ResponseHelper.success.mockReturnValue(mockRes);

      await authController.updateProfile(mockReq, mockRes);

      expect(ResponseHelper.success).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({
          id: "1",
          username: "newusername",
          email: "newemail@example.com",
          roles: ["admin"],
        }),
        { message: "Profile updated successfully" }
      );
    });

    it("should return conflict for duplicate username", async () => {
      // Create a second user first
      authController.users.push({
        id: "2",
        username: "testuser",
        email: "test@example.com",
        password: "hashed",
        roles: ["user"],
        createdAt: new Date(),
        lastLogin: null,
      });

      mockReq.body = {
        username: "testuser", // Same as another user
        email: "newemail@example.com",
      };

      ResponseHelper.conflict.mockReturnValue(mockRes);

      await authController.updateProfile(mockReq, mockRes);

      expect(ResponseHelper.conflict).toHaveBeenCalledWith(mockRes, "Username already taken");
    });

    it("should return conflict for duplicate email", async () => {
      // Create a second user first
      authController.users.push({
        id: "3",
        username: "testuser2",
        email: "test2@example.com",
        password: "hashed",
        roles: ["user"],
        createdAt: new Date(),
        lastLogin: null,
      });

      mockReq.body = {
        username: "newusername",
        email: "test2@example.com", // Same as another user
      };

      ResponseHelper.conflict.mockReturnValue(mockRes);

      await authController.updateProfile(mockReq, mockRes);

      expect(ResponseHelper.conflict).toHaveBeenCalledWith(mockRes, "Email already taken");
    });
  });

  describe("changePassword", () => {
    it("should change password successfully", async () => {
      mockReq.body = {
        currentPassword: "password",
        newPassword: "newpassword123",
      };

      bcrypt.compare.mockResolvedValue(true);
      bcrypt.hash.mockResolvedValue("new-hashed-password");
      ResponseHelper.success.mockReturnValue(mockRes);

      await authController.changePassword(mockReq, mockRes);

      expect(bcrypt.compare).toHaveBeenCalledWith("password", expect.any(String));
      expect(bcrypt.hash).toHaveBeenCalledWith("newpassword123", 10);
      expect(ResponseHelper.success).toHaveBeenCalledWith(mockRes, null, {
        message: "Password changed successfully",
      });
    });

    it("should return unauthorized for incorrect current password", async () => {
      mockReq.body = {
        currentPassword: "wrongpassword",
        newPassword: "newpassword123",
      };

      bcrypt.compare.mockResolvedValue(false);
      ResponseHelper.unauthorized.mockReturnValue(mockRes);

      await authController.changePassword(mockReq, mockRes);

      expect(ResponseHelper.unauthorized).toHaveBeenCalledWith(
        mockRes,
        "Current password is incorrect",
        "AUTH_ERROR"
      );
    });
  });

  describe("refreshToken", () => {
    it("should refresh token successfully", async () => {
      jwt.sign.mockReturnValue("new-jwt-token");
      ResponseHelper.success.mockReturnValue(mockRes);

      await authController.refreshToken(mockReq, mockRes);

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "1",
          username: "admin",
          email: "admin@example.com",
          roles: ["admin"],
        }),
        "test-secret",
        { expiresIn: "24h" }
      );
      expect(ResponseHelper.success).toHaveBeenCalledWith(
        mockRes,
        { token: "new-jwt-token" },
        { message: "Token refreshed successfully" }
      );
    });
  });

  describe("logout", () => {
    it("should logout successfully", async () => {
      ResponseHelper.success.mockReturnValue(mockRes);

      await authController.logout(mockReq, mockRes);

      expect(ResponseHelper.success).toHaveBeenCalledWith(mockRes, null, {
        message: "Logged out successfully",
      });
    });
  });
});