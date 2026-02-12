import express from "express";
import { logger } from "../utils/logger.js";
import { authenticateToken } from "../middleware/auth.js";
import { query } from "../config/database.js";

const router = express.Router();

/**
 * @swagger
 * /api/github/repos:
 *   get:
 *     summary: Get authenticated user's GitHub repositories
 *     description: |
 *       Fetches the list of GitHub repositories accessible to the authenticated user.
 *       In development mode, returns mock repositories if GitHub token is not available.
 *     tags: [GitHub]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: per_page
 *         schema:
 *           type: integer
 *           default: 30
 *           maximum: 100
 *         description: Number of repositories per page
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [created, updated, pushed, full_name]
 *           default: pushed
 *         description: Sort field
 *       - in: query
 *         name: direction
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort direction
 *     responses:
 *       200:
 *         description: List of GitHub repositories
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 repositories:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       full_name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       html_url:
 *                         type: string
 *                       language:
 *                         type: string
 *                       stargazers_count:
 *                         type: integer
 *                       private:
 *                         type: boolean
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 per_page:
 *                   type: integer
 *       401:
 *         description: Authentication required
 *       503:
 *         description: GitHub API unavailable
 */
router.get("/repos", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, per_page = 30, sort = "pushed", direction = "desc" } = req.query;

    logger.info("Fetching GitHub repositories for user", {
      userId,
      page,
      per_page,
      sort,
      direction,
    });

    // Try to get GitHub access token from user record
    let githubAccessToken = null;
    try {
      const userResult = await query(`SELECT github_access_token FROM users WHERE id = $1`, [
        userId,
      ]);
      if (userResult.rows.length > 0) {
        githubAccessToken = userResult.rows[0].github_access_token;
      }
    } catch (dbError) {
      logger.warn("Could not fetch GitHub token from database", {
        error: dbError.message,
        userId,
      });
    }

    // If we have a GitHub access token, fetch real repos
    if (githubAccessToken) {
      try {
        const githubResponse = await fetch(
          `https://api.github.com/user/repos?page=${page}&per_page=${per_page}&sort=${sort}&direction=${direction}`,
          {
            headers: {
              Authorization: `Bearer ${githubAccessToken}`,
              Accept: "application/vnd.github.v3+json",
              "User-Agent": "AutoDocs-AI",
            },
          }
        );

        if (githubResponse.ok) {
          const repos = await githubResponse.json();

          // Transform to expected format
          const repositories = repos.map((repo) => ({
            id: repo.id,
            name: repo.name,
            full_name: repo.full_name,
            description: repo.description,
            html_url: repo.html_url,
            language: repo.language,
            stargazers_count: repo.stargazers_count,
            private: repo.private,
            default_branch: repo.default_branch,
            pushed_at: repo.pushed_at,
            updated_at: repo.updated_at,
          }));

          logger.info("Fetched GitHub repositories successfully", {
            userId,
            count: repositories.length,
          });

          return res.json({
            repositories,
            total: repositories.length,
            page: parseInt(page),
            per_page: parseInt(per_page),
          });
        }

        // Log GitHub API error but fall through to mock data
        logger.warn("GitHub API request failed", {
          status: githubResponse.status,
          userId,
        });
      } catch (githubError) {
        logger.warn("Error fetching from GitHub API", {
          error: githubError.message,
          userId,
        });
      }
    }

    // Return mock repositories for development or when GitHub token is unavailable
    if (process.env.NODE_ENV !== "production") {
      const mockRepositories = generateMockRepositories(userId);

      logger.info("Returning mock GitHub repositories", {
        userId,
        count: mockRepositories.length,
        reason: githubAccessToken ? "GitHub API failed" : "No GitHub token",
      });

      return res.json({
        repositories: mockRepositories,
        total: mockRepositories.length,
        page: parseInt(page),
        per_page: parseInt(per_page),
        mock: true,
      });
    }

    // In production without a token, return empty list or error
    if (!githubAccessToken) {
      logger.warn("No GitHub access token available for user", { userId });
      return res.status(503).json({
        error: "GitHub integration not available",
        message: "Please reconnect your GitHub account to access your repositories.",
      });
    }

    // GitHub API failure in production
    res.status(503).json({
      error: "GitHub API unavailable",
      message: "Unable to fetch repositories from GitHub. Please try again later.",
    });
  } catch (error) {
    logger.error("Error fetching GitHub repositories", {
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
 * Generate mock repositories for development/testing
 */
function generateMockRepositories(userId) {
  // Use userId to generate consistent mock data
  const baseId = userId * 10000;

  return [
    {
      id: baseId + 1,
      name: "my-awesome-project",
      full_name: "demo-user/my-awesome-project",
      description: "An awesome project that needs documentation",
      html_url: "https://github.com/demo-user/my-awesome-project",
      language: "TypeScript",
      stargazers_count: 15,
      private: false,
      default_branch: "main",
      pushed_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    },
    {
      id: baseId + 2,
      name: "backend-api",
      full_name: "demo-user/backend-api",
      description: "RESTful API built with Node.js and Express",
      html_url: "https://github.com/demo-user/backend-api",
      language: "JavaScript",
      stargazers_count: 8,
      private: true,
      default_branch: "main",
      pushed_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    },
    {
      id: baseId + 3,
      name: "data-processor",
      full_name: "demo-user/data-processor",
      description: "Python script for processing large datasets",
      html_url: "https://github.com/demo-user/data-processor",
      language: "Python",
      stargazers_count: 22,
      private: false,
      default_branch: "main",
      pushed_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    },
    {
      id: baseId + 4,
      name: "mobile-app",
      full_name: "demo-user/mobile-app",
      description: "Cross-platform mobile application",
      html_url: "https://github.com/demo-user/mobile-app",
      language: "Swift",
      stargazers_count: 5,
      private: true,
      default_branch: "main",
      pushed_at: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
    },
    {
      id: baseId + 5,
      name: "machine-learning-models",
      full_name: "demo-user/machine-learning-models",
      description: "Collection of ML models for various tasks",
      html_url: "https://github.com/demo-user/machine-learning-models",
      language: "Python",
      stargazers_count: 45,
      private: false,
      default_branch: "main",
      pushed_at: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
    },
    {
      id: baseId + 6,
      name: "react-components",
      full_name: "demo-user/react-components",
      description: "Reusable React component library with TypeScript",
      html_url: "https://github.com/demo-user/react-components",
      language: "TypeScript",
      stargazers_count: 32,
      private: false,
      default_branch: "main",
      pushed_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    },
    {
      id: baseId + 7,
      name: "devops-scripts",
      full_name: "demo-user/devops-scripts",
      description: "Collection of DevOps and CI/CD automation scripts",
      html_url: "https://github.com/demo-user/devops-scripts",
      language: "Shell",
      stargazers_count: 18,
      private: true,
      default_branch: "main",
      pushed_at: new Date(Date.now() - 1000 * 60 * 60 * 144).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 60 * 144).toISOString(),
    },
    {
      id: baseId + 8,
      name: "go-microservices",
      full_name: "demo-user/go-microservices",
      description: "Microservices architecture example in Go",
      html_url: "https://github.com/demo-user/go-microservices",
      language: "Go",
      stargazers_count: 67,
      private: false,
      default_branch: "main",
      pushed_at: new Date(Date.now() - 1000 * 60 * 60 * 168).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 60 * 168).toISOString(),
    },
  ];
}

export default router;
