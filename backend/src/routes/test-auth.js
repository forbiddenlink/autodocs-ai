import express from "express";
import { generateToken } from "../middleware/auth.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

/**
 * Test authentication endpoint
 * Creates a mock session for testing without OAuth
 * DEVELOPMENT ONLY
 */
if (process.env.NODE_ENV !== "production") {
  router.get("/create-session", (req, res) => {
    try {
      logger.info("Creating test session");

      // Create a mock user object
      const mockUser = {
        id: 1,
        github_id: "12345678",
        email: "demo@autodocs.ai",
        name: "Demo User",
        avatar_url: "https://github.com/identicons/demo.png",
      };

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
      res.redirect(dashboardUrl);
    } catch (error) {
      logger.error("Test auth error", { error: error.message });
      res.status(500).json({ error: "Failed to create test session" });
    }
  });
}

export default router;
