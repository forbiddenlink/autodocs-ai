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
          status: "completed",
          private: false,
          fileCount: 247,
          lineCount: 18543,
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
          status: "analyzing",
          private: false,
          fileCount: 156,
          lineCount: 12389,
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
          status: "completed",
          private: true,
          fileCount: 89,
          lineCount: 7621,
        },
        {
          id: 4,
          name: "mobile-app",
          description: "Cross-platform mobile application",
          url: "https://github.com/demo-user/mobile-app",
          fullName: "demo-user/mobile-app",
          language: "Swift",
          stars: 15,
          lastSync: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
          status: "pending",
          private: false,
          fileCount: 0,
          lineCount: 0,
        },
        {
          id: 5,
          name: "data-pipeline",
          description: "ETL pipeline for data processing",
          url: "https://github.com/demo-user/data-pipeline",
          fullName: "demo-user/data-pipeline",
          language: "Python",
          stars: 67,
          lastSync: new Date(Date.now() - 345600000).toISOString(), // 4 days ago
          status: "error",
          private: false,
          fileCount: 0,
          lineCount: 0,
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
 * GET /api/repos/:id/docs
 * Get all documentation for a specific repository
 *
 * Query parameters:
 *   - type: Filter by document type (readme, api, function, class, architecture)
 */
router.get("/:id/docs", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const repoId = parseInt(req.params.id);
    const { type } = req.query;

    if (isNaN(repoId)) {
      return res.status(400).json({
        error: "Invalid repository ID",
      });
    }

    logger.info("Fetching repository documentation", {
      userId,
      repoId,
      filterType: type,
    });

    // For development/testing, return mock documentation
    if (process.env.NODE_ENV !== "production") {
      const mockDocs = [
        {
          id: 1,
          repoId,
          path: "README.md",
          type: "readme",
          content: `# AutoDocs AI

## Overview
AI-powered documentation platform that automatically generates and maintains comprehensive code documentation for your repositories.

## Features
- Automatic code analysis using Tree-sitter
- AI-powered documentation generation with Claude
- Real-time updates via GitHub webhooks
- Interactive chat interface for code queries

## Getting Started
\`\`\`bash
npm install
npm run dev
\`\`\`

## Architecture
See the architecture documentation for detailed system design.`,
          generatedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          updatedAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 2,
          repoId,
          path: "api/authentication.md",
          type: "api",
          content: `# Authentication API

## POST /api/auth/github
Handles GitHub OAuth authentication flow.

### Request Body
\`\`\`json
{
  "code": "string"
}
\`\`\`

### Response
\`\`\`json
{
  "token": "jwt_token",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "User Name"
  }
}
\`\`\`

### Error Codes
- 400: Invalid or missing authorization code
- 500: Authentication failed`,
          generatedAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
          updatedAt: new Date(Date.now() - 7200000).toISOString(),
        },
        {
          id: 3,
          repoId,
          path: "functions/authenticateToken.md",
          type: "function",
          content: `# authenticateToken

Middleware function that validates JWT tokens from incoming requests.

## Signature
\`\`\`javascript
function authenticateToken(req, res, next)
\`\`\`

## Parameters
- \`req\` (Request): Express request object
- \`res\` (Response): Express response object
- \`next\` (Function): Next middleware function

## Returns
Calls \`next()\` if authentication succeeds, otherwise sends 401/403 error response.

## Usage
\`\`\`javascript
router.get('/protected', authenticateToken, (req, res) => {
  // req.user is populated with decoded token data
  res.json({ message: 'Protected route', user: req.user });
});
\`\`\``,
          generatedAt: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
          updatedAt: new Date(Date.now() - 10800000).toISOString(),
        },
        {
          id: 4,
          repoId,
          path: "classes/DatabaseConnection.md",
          type: "class",
          content: `# DatabaseConnection

Manages PostgreSQL database connections using connection pooling.

## Properties
- \`pool\`: pg.Pool - Connection pool instance
- \`connected\`: boolean - Connection status

## Methods

### constructor(config)
Initializes the database connection pool.

### async query(sql, params)
Executes a parameterized SQL query.

**Parameters:**
- \`sql\` (string): SQL query with placeholders
- \`params\` (Array): Query parameters

**Returns:** Promise<QueryResult>

### async close()
Closes all connections in the pool.`,
          generatedAt: new Date(Date.now() - 14400000).toISOString(), // 4 hours ago
          updatedAt: new Date(Date.now() - 14400000).toISOString(),
        },
        {
          id: 5,
          repoId,
          path: "architecture/system-overview.md",
          type: "architecture",
          content: `# System Architecture

## Overview
AutoDocs AI follows a microservices architecture with separate frontend and backend services.

## Components

### Frontend (Next.js)
- Server-side rendering
- API routes for backend proxying
- React components with TypeScript
- Tailwind CSS for styling

### Backend (Node.js/Express)
- RESTful API endpoints
- GitHub OAuth integration
- Database connections (PostgreSQL)
- AI service integration (Claude API)

### Database (PostgreSQL)
- User accounts and sessions
- Repository metadata
- Generated documentation
- Analysis job queue

## Data Flow
\`\`\`mermaid
graph LR
    A[User] --> B[Next.js Frontend]
    B --> C[Express Backend]
    C --> D[PostgreSQL]
    C --> E[Claude API]
    C --> F[GitHub API]
\`\`\`

## Security
- JWT-based authentication
- HTTP-only cookies
- CORS configuration
- Rate limiting`,
          generatedAt: new Date(Date.now() - 18000000).toISOString(), // 5 hours ago
          updatedAt: new Date(Date.now() - 18000000).toISOString(),
        },
      ];

      // Filter by type if specified
      let filteredDocs = mockDocs;
      if (type) {
        filteredDocs = mockDocs.filter((doc) => doc.type === type);
        logger.info("Filtered documentation by type", {
          userId,
          repoId,
          type,
          count: filteredDocs.length,
        });
      }

      logger.info("Returning mock documentation", {
        userId,
        repoId,
        docCount: filteredDocs.length,
      });

      return res.json({
        documents: filteredDocs,
        count: filteredDocs.length,
        repository: {
          id: repoId,
          name: "autodocs-ai",
        },
      });
    }

    // Production: Query database for documents
    // TODO: Implement database query when database is set up

    res.status(404).json({
      error: "Repository not found or no documentation available",
    });
  } catch (error) {
    logger.error("Error fetching repository documentation", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      repoId: req.params.id,
    });

    res.status(500).json({
      error: "Failed to fetch documentation",
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
