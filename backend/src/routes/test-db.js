import express from "express";
import { findUserById, findUserByGithubId } from "../services/userService.js";
import { query } from "../config/database.js";
import { logger } from "../utils/logger.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

/**
 * GET /test-db/user/:id
 * Test endpoint to verify user data is stored correctly in database
 * This endpoint retrieves a user by ID and returns all fields for verification
 */
router.get("/user/:id", async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      return res.status(400).json({
        error: "Invalid user ID",
      });
    }

    const user = await findUserById(userId);

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    // Return all user fields for verification
    res.json({
      success: true,
      user: {
        id: user.id,
        github_id: user.github_id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      verification: {
        has_github_id: !!user.github_id,
        has_email: !!user.email,
        has_name: !!user.name,
        has_avatar_url: !!user.avatar_url,
        has_created_at: !!user.created_at,
      },
    });
  } catch (error) {
    logger.error("Error fetching user for verification", {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      error: "Failed to fetch user data",
      message: error.message,
    });
  }
});

/**
 * GET /test-db/user-by-github/:githubId
 * Test endpoint to retrieve user by GitHub ID
 */
router.get("/user-by-github/:githubId", async (req, res) => {
  try {
    const { githubId } = req.params;

    const user = await findUserByGithubId(githubId);

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    // Return all user fields for verification
    res.json({
      success: true,
      user: {
        id: user.id,
        github_id: user.github_id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      verification: {
        has_github_id: !!user.github_id,
        has_email: !!user.email,
        has_name: !!user.name,
        has_avatar_url: !!user.avatar_url,
        has_created_at: !!user.created_at,
      },
    });
  } catch (error) {
    logger.error("Error fetching user by GitHub ID for verification", {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      error: "Failed to fetch user data",
      message: error.message,
    });
  }
});

/**
 * GET /test-db/current-user
 * Test endpoint to verify currently authenticated user's data in database
 */
router.get("/current-user", authenticateToken, async (req, res) => {
  try {
    // req.user is set by authenticateToken middleware
    const userId = req.user.id;

    const user = await findUserById(userId);

    if (!user) {
      return res.status(404).json({
        error: "User not found in database",
        userId,
      });
    }

    // Return all user fields for verification
    res.json({
      success: true,
      user: {
        id: user.id,
        github_id: user.github_id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      verification: {
        has_github_id: !!user.github_id,
        has_email: !!user.email,
        has_name: !!user.name,
        has_avatar_url: !!user.avatar_url,
        has_created_at: !!user.created_at,
        all_fields_present:
          !!user.github_id && !!user.email && !!user.name && !!user.avatar_url && !!user.created_at,
      },
    });
  } catch (error) {
    logger.error("Error fetching current user for verification", {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      error: "Failed to fetch user data",
      message: error.message,
    });
  }
});

/**
 * GET /test-db/all-users
 * Test endpoint to list all users in database (for development/testing only)
 */
router.get("/all-users", async (req, res) => {
  try {
    const result = await query("SELECT * FROM users ORDER BY created_at DESC LIMIT 100");

    res.json({
      success: true,
      count: result.rows.length,
      users: result.rows.map((user) => ({
        id: user.id,
        github_id: user.github_id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
        updated_at: user.updated_at,
      })),
    });
  } catch (error) {
    logger.error("Error fetching all users", {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      error: "Failed to fetch users",
      message: error.message,
    });
  }
});

export default router;
