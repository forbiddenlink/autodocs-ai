import express from "express";
import { logger } from "../utils/logger.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

/**
 * GET /api/repos
 * Get all repositories for the authenticated user
 *
 * In development mode, returns mock data
 * In production, fetches from database and GitHub API
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    logger.info("Fetching repositories for user", { userId });

    // For development/testing, return mock repository data
    if (process.env.NODE_ENV !== "production") {
      const mockRepos = [
        {
          id: 1,
          name: "autodocs-ai",
          description: "AI-powered documentation platform",
          url: "https://github.com/demo-user/autodocs-ai",
          fullName: "demo-user/autodocs-ai",
          language: "TypeScript",
          stars: 42,
          lastSync: new Date().toISOString(),
          status: "active",
          private: false,
        },
        {
          id: 2,
          name: "react-components",
          description: "Reusable React component library",
          url: "https://github.com/demo-user/react-components",
          fullName: "demo-user/react-components",
          language: "JavaScript",
          stars: 128,
          lastSync: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          status: "active",
          private: false,
        },
        {
          id: 3,
          name: "api-gateway",
          description: "Microservices API gateway with authentication",
          url: "https://github.com/demo-user/api-gateway",
          fullName: "demo-user/api-gateway",
          language: "Go",
          stars: 89,
          lastSync: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
          status: "active",
          private: true,
        },
      ];

      logger.info("Returning mock repository data", {
        userId,
        repoCount: mockRepos.length,
      });

      return res.json({
        repositories: mockRepos,
        count: mockRepos.length,
      });
    }

    // Production: Query database for user's repositories
    // TODO: Implement database query when database is set up
    const repositories = [];

    res.json({
      repositories,
      count: repositories.length,
    });
  } catch (error) {
    logger.error("Error fetching repositories", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });

    res.status(500).json({
      error: "Failed to fetch repositories",
      message: process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
});

/**
 * POST /api/repos
 * Add a repository to track for documentation
 *
 * Body: { githubRepoId, name, url, fullName, description, language, private }
 */
router.post("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      githubRepoId,
      name,
      url,
      fullName,
      description,
      language,
      private: isPrivate,
    } = req.body;

    // Validation
    if (!githubRepoId || !name || !url || !fullName) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["githubRepoId", "name", "url", "fullName"],
      });
    }

    logger.info("Adding repository", {
      userId,
      repoName: name,
      githubRepoId,
    });

    // For development/testing, return mock success response
    if (process.env.NODE_ENV !== "production") {
      const newRepo = {
        id: Math.floor(Math.random() * 10000),
        userId,
        githubRepoId,
        name,
        url,
        fullName,
        description: description || null,
        language: language || null,
        stars: 0,
        lastSync: null,
        status: "pending",
        private: isPrivate || false,
        createdAt: new Date().toISOString(),
      };

      logger.info("Repository added (mock)", {
        repoId: newRepo.id,
        userId,
      });

      return res.status(201).json({
        repository: newRepo,
        message: "Repository added successfully",
      });
    }

    // Production: Insert into database
    // TODO: Implement database insert when database is set up

    res.status(501).json({
      error: "Not implemented in production yet",
    });
  } catch (error) {
    logger.error("Error adding repository", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });

    res.status(500).json({
      error: "Failed to add repository",
      message: process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
});

/**
 * GET /api/repos/:id
 * Get details for a specific repository
 */
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const repoId = parseInt(req.params.id);

    if (isNaN(repoId)) {
      return res.status(400).json({
        error: "Invalid repository ID",
      });
    }

    logger.info("Fetching repository details", {
      userId,
      repoId,
    });

    // For development/testing, return mock data
    if (process.env.NODE_ENV !== "production") {
      const mockRepo = {
        id: repoId,
        name: "autodocs-ai",
        description: "AI-powered documentation platform",
        url: "https://github.com/demo-user/autodocs-ai",
        fullName: "demo-user/autodocs-ai",
        language: "TypeScript",
        stars: 42,
        lastSync: new Date().toISOString(),
        status: "active",
        private: false,
        createdAt: new Date(Date.now() - 7 * 86400000).toISOString(), // 7 days ago
      };

      return res.json({
        repository: mockRepo,
      });
    }

    // Production: Query database
    // TODO: Implement database query when database is set up

    res.status(404).json({
      error: "Repository not found",
    });
  } catch (error) {
    logger.error("Error fetching repository details", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      repoId: req.params.id,
    });

    res.status(500).json({
      error: "Failed to fetch repository",
      message: process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
});

/**
 * DELETE /api/repos/:id
 * Remove a repository from tracking
 */
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const repoId = parseInt(req.params.id);

    if (isNaN(repoId)) {
      return res.status(400).json({
        error: "Invalid repository ID",
      });
    }

    logger.info("Deleting repository", {
      userId,
      repoId,
    });

    // For development/testing, return success
    if (process.env.NODE_ENV !== "production") {
      return res.json({
        message: "Repository removed successfully",
        repoId,
      });
    }

    // Production: Delete from database
    // TODO: Implement database delete when database is set up

    res.status(501).json({
      error: "Not implemented in production yet",
    });
  } catch (error) {
    logger.error("Error deleting repository", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      repoId: req.params.id,
    });

    res.status(500).json({
      error: "Failed to delete repository",
      message: process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
});

export default router;
