import express from "express";
import { logger } from "../utils/logger.js";
import { authenticateToken } from "../middleware/auth.js";
import { query } from "../config/database.js";

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

    // Query database for user's repositories
    const result = await query(
      `SELECT 
        id,
        user_id as "userId",
        github_repo_id as "githubRepoId",
        name,
        full_name as "fullName",
        url,
        default_branch as "defaultBranch",
        status,
        last_sync as "lastSync",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM repositories 
      WHERE user_id = $1
      ORDER BY created_at DESC`,
      [userId]
    );

    const repositories = result.rows;

    logger.info("Fetched user repositories from database", {
      userId,
      repoCount: repositories.length,
    });

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

    // Insert repository into database
    try {
      const { query } = await import("../config/database.js");

      const result = await query(
        `INSERT INTO repositories 
         (user_id, github_repo_id, name, full_name, url, status, last_sync) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING id, user_id, github_repo_id, name, full_name, url, status, 
                   last_sync, created_at, updated_at`,
        [userId, githubRepoId, name, fullName, url, "pending", null]
      );

      const newRepo = result.rows[0];

      logger.info("Repository added to database", {
        repoId: newRepo.id,
        userId,
        githubRepoId,
      });

      return res.status(201).json({
        repository: {
          id: newRepo.id,
          userId: newRepo.user_id,
          githubRepoId: newRepo.github_repo_id,
          name: newRepo.name,
          fullName: newRepo.full_name,
          url: newRepo.url,
          status: newRepo.status,
          lastSync: newRepo.last_sync,
          createdAt: newRepo.created_at,
          updatedAt: newRepo.updated_at,
        },
        message: "Repository added successfully",
      });
    } catch (dbError) {
      // Check for unique constraint violation
      if (dbError.code === "23505") {
        logger.warn("Repository already exists", { githubRepoId, userId });
        return res.status(409).json({
          error: "Repository already added",
          message: "This repository has already been added to your account",
        });
      }

      throw dbError; // Re-throw other errors to be caught by outer catch
    }
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

    // Query database with ownership check
    const result = await query(
      `SELECT
        id,
        user_id as "userId",
        github_repo_id as "githubRepoId",
        name,
        full_name as "fullName",
        description,
        url,
        default_branch as "defaultBranch",
        status,
        last_sync as "lastSync",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM repositories
      WHERE id = $1 AND user_id = $2`,
      [repoId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Repository not found",
      });
    }

    res.json({
      repository: result.rows[0],
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

    // Verify user owns this repository
    const repoCheck = await query(`SELECT id FROM repositories WHERE id = $1 AND user_id = $2`, [
      repoId,
      userId,
    ]);

    if (repoCheck.rows.length === 0) {
      return res.status(404).json({
        error: "Repository not found",
      });
    }

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
 * POST /api/repos/:id/chat
 * Send a chat message and get AI response
 *
 * Body: { message: string }
 * Returns: { response: string, timestamp: string }
 */
router.post("/:id/chat", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const repoId = parseInt(req.params.id);
    const { message } = req.body;

    // Validation
    if (isNaN(repoId)) {
      return res.status(400).json({
        error: "Invalid repository ID",
      });
    }

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({
        error: "Message is required",
      });
    }

    if (message.length > 2000) {
      return res.status(400).json({
        error: "Message is too long (max 2000 characters)",
      });
    }

    logger.info("Processing chat message", {
      userId,
      repoId,
      messageLength: message.length,
    });

    // Verify user owns this repository
    const repoCheck = await query(`SELECT id FROM repositories WHERE id = $1 AND user_id = $2`, [
      repoId,
      userId,
    ]);

    if (repoCheck.rows.length === 0) {
      return res.status(404).json({
        error: "Repository not found",
      });
    }

    // For development/testing, return mock AI response
    if (process.env.NODE_ENV !== "production") {
      // Simulate processing delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Generate contextual mock responses based on keywords
      let mockResponse = "";

      const lowerMessage = message.toLowerCase();

      if (lowerMessage.includes("explain") || lowerMessage.includes("what is")) {
        mockResponse = `Great question! Based on the codebase analysis:\n\nThe component or function you're asking about is designed to handle specific business logic within the application. It follows best practices by:\n\n1. **Separating concerns** - keeping logic modular and maintainable\n2. **Error handling** - properly catching and logging errors\n3. **Type safety** - using TypeScript for better developer experience\n\n*Note: This is a mock response. Once the AI backend is integrated with Claude API and RAG, I'll provide detailed, code-specific answers.*`;
      } else if (lowerMessage.includes("how") || lowerMessage.includes("can i")) {
        mockResponse = `To accomplish what you're asking about, here's the recommended approach:\n\n\`\`\`typescript\n// Example implementation\nfunction handleTask() {\n  try {\n    // Your logic here\n    return result;\n  } catch (error) {\n    logger.error('Task failed', error);\n    throw error;\n  }\n}\n\`\`\`\n\n**Key considerations:**\n- Ensure proper error handling\n- Add logging for debugging\n- Include unit tests\n\n*Full AI-powered responses coming soon!*`;
      } else if (lowerMessage.includes("architecture") || lowerMessage.includes("structure")) {
        mockResponse = `The application follows a modern microservices architecture:\n\n**Frontend (Next.js)**\n- React components with TypeScript\n- App Router for navigation\n- Tailwind CSS for styling\n\n**Backend (Express)**\n- RESTful API endpoints\n- PostgreSQL for data persistence\n- JWT authentication\n\n**Integration**\n- GitHub OAuth for user authentication\n- Claude AI for documentation generation\n- Pinecone for vector embeddings (RAG)\n\n*Once fully integrated, I can provide specific code paths and interactions.*`;
      } else if (lowerMessage.includes("error") || lowerMessage.includes("bug")) {
        mockResponse = `Let me help you troubleshoot:\n\n**Common debugging steps:**\n1. Check the browser console for error messages\n2. Verify environment variables are set correctly\n3. Ensure the backend server is running\n4. Check network requests in DevTools\n\n**Error handling pattern:**\n\`\`\`typescript\ntry {\n  await operation();\n} catch (error) {\n  logger.error('Operation failed', { error });\n  // Handle gracefully\n}\n\`\`\`\n\n*With full AI integration, I'll be able to analyze your specific error context.*`;
      } else if (lowerMessage.includes("test")) {
        mockResponse = `Here's how to approach testing:\n\n**Unit Tests**\n- Test individual functions in isolation\n- Mock external dependencies\n- Use Jest or similar framework\n\n**Integration Tests**\n- Test API endpoints\n- Verify database operations\n- Check authentication flows\n\n**E2E Tests**\n- Use Playwright or Cypress\n- Test complete user workflows\n- Verify UI interactions\n\n*The AI will soon provide specific test cases for your code!*`;
      } else {
        mockResponse = `Thank you for your question! I'm here to help you understand the codebase.\n\nOnce the full AI integration is complete, I'll be able to:\n\n✓ **Search** through your entire codebase using vector embeddings\n✓ **Analyze** code context with Claude AI\n✓ **Provide** specific answers with code examples\n✓ **Reference** actual files and functions\n✓ **Suggest** improvements and best practices\n\nFor now, I can help with general questions about the architecture, common patterns, and development workflows.\n\n*Full RAG-powered responses coming soon!*`;
      }

      logger.info("Returning mock chat response", {
        userId,
        repoId,
        responseLength: mockResponse.length,
      });

      return res.json({
        response: mockResponse,
        timestamp: new Date().toISOString(),
        mock: true,
      });
    }

    // Production: Integrate with Claude API and RAG
    // TODO: Implement when AI backend is ready
    // 1. Perform vector search on embeddings to find relevant code chunks
    // 2. Send context + message to Claude API
    // 3. Store message and response in database
    // 4. Return AI-generated response

    res.status(501).json({
      error: "AI chat not yet implemented in production",
    });
  } catch (error) {
    logger.error("Error processing chat message", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      repoId: req.params.id,
    });

    res.status(500).json({
      error: "Failed to process chat message",
      message: process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
});

/**
 * POST /api/repos/:id/analyze
 * Trigger documentation regeneration for a repository
 */
router.post("/:id/analyze", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const repoId = parseInt(req.params.id);
    const { force = false, types = [] } = req.body;

    if (isNaN(repoId)) {
      return res.status(400).json({
        error: "Invalid repository ID",
      });
    }

    logger.info("Triggering documentation analysis", {
      userId,
      repoId,
      force,
      types,
    });

    // Validate types if provided
    const validTypes = ["readme", "api", "function", "class", "architecture"];
    if (types.length > 0) {
      const invalidTypes = types.filter((type) => !validTypes.includes(type));
      if (invalidTypes.length > 0) {
        return res.status(400).json({
          error: "Invalid documentation types",
          invalidTypes,
          validTypes,
        });
      }
    }

    // For development/testing, return success
    if (process.env.NODE_ENV !== "production") {
      return res.json({
        message: "Documentation regeneration started",
        repoId,
        jobId: `job_${Date.now()}`,
        estimatedTime: "2-5 minutes",
        types: types.length > 0 ? types : validTypes,
      });
    }

    // Production: Create analysis job in database
    // TODO: Implement job creation when database is set up
    // TODO: Trigger actual analysis with Claude AI

    res.status(501).json({
      error: "Not implemented in production yet",
    });
  } catch (error) {
    logger.error("Error triggering analysis", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      repoId: req.params.id,
    });

    res.status(500).json({
      error: "Failed to start analysis",
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

    // Delete from database with ownership check (returns the deleted row if it existed)
    const result = await query(
      `DELETE FROM repositories
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [repoId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Repository not found",
      });
    }

    logger.info("Repository deleted successfully", { userId, repoId });

    res.json({
      message: "Repository removed successfully",
      repoId,
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
