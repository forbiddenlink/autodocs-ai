import express from "express";
import { logger } from "../utils/logger.js";
import { generateToken } from "../middleware/auth.js";

const router = express.Router();

/**
 * Development-only OAuth simulation
 * This route simulates a successful GitHub OAuth flow for testing
 * ONLY ENABLED IN DEVELOPMENT MODE
 */
if (process.env.NODE_ENV !== "production") {
  router.get("/github/dev-login", async (req, res) => {
    try {
      logger.warn("⚠️  Using development OAuth simulation - NOT FOR PRODUCTION");

      // Create a mock user object
      const mockUser = {
        id: 1,
        github_id: "12345678",
        email: "demo@autodocs.ai",
        name: "Demo User",
        avatar_url: "https://avatars.githubusercontent.com/u/1?v=4",
      };

      logger.info("Creating dev session for mock user", {
        userId: mockUser.id,
        email: mockUser.email,
      });

      // Generate JWT token
      const token = generateToken(mockUser, "7d");

      // Set secure HTTP-only cookie
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Redirect to dashboard
      const dashboardUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard`;
      logger.info("Dev login successful, redirecting to dashboard");

      res.redirect(dashboardUrl);
    } catch (error) {
      logger.error("Dev login error", {
        error: error.message,
        stack: error.stack,
      });

      res.redirect(`${process.env.FRONTEND_URL || "http://localhost:3000"}?error=dev_login_failed`);
    }
  });

  // Dev auth status endpoint that doesn't require database
  router.get("/status-dev", async (req, res) => {
    try {
      const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];

      if (!token) {
        return res.json({
          authenticated: false,
          user: null,
        });
      }

      const jwt = (await import("jsonwebtoken")).default;
      const secret = process.env.JWT_SECRET;

      if (!secret) {
        return res.status(500).json({
          authenticated: false,
          error: "JWT_SECRET not configured",
        });
      }

      try {
        const decoded = jwt.verify(token, secret);

        // Return mock user data
        res.json({
          authenticated: true,
          user: {
            id: decoded.id,
            name: decoded.name || "Demo User",
            email: decoded.email || "demo@autodocs.ai",
            avatarUrl: "https://avatars.githubusercontent.com/u/1?v=4",
            githubId: decoded.githubId || "12345678",
          },
        });
      } catch (error) {
        res.json({
          authenticated: false,
          user: null,
        });
      }
    } catch (error) {
      logger.error("Error in dev auth status", {
        error: error.message,
      });

      res.status(500).json({
        error: "Failed to check authentication status",
      });
    }
  });

  logger.info("✅ Development auth routes enabled at /api/auth-dev/*");
}

export default router;
