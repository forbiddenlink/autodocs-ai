import express from "express";
import { logger } from "../utils/logger.js";
import { authenticateToken } from "../middleware/auth.js";
import { query } from "../config/database.js";
import { generateChatResponse } from "../services/claudeService.js";
import { searchCodeChunks } from "../services/pineconeService.js";
import {
  addDocumentationGenerationJob,
  addFullAnalysisJob,
  getJobStatus,
  QUEUE_NAMES,
} from "../services/jobQueueService.js";
import { isDocumentationServiceAvailable } from "../services/documentationService.js";

const router = express.Router();

/**
 * @swagger
 * /api/repos:
 *   get:
 *     summary: Get all repositories for the authenticated user
 *     tags: [Repositories]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of repositories
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 repositories:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Repository'
 *                 count:
 *                   type: integer
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @swagger
 * /api/repos:
 *   post:
 *     summary: Add a repository to track for documentation
 *     tags: [Repositories]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [githubRepoId, name, url, fullName]
 *             properties:
 *               githubRepoId:
 *                 type: string
 *               name:
 *                 type: string
 *               url:
 *                 type: string
 *                 format: uri
 *               fullName:
 *                 type: string
 *               description:
 *                 type: string
 *               language:
 *                 type: string
 *               private:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Repository added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 repository:
 *                   $ref: '#/components/schemas/Repository'
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Authentication required
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
 *   - type: Filter by document type (readme, api, function, class, architecture, module)
 *   - path: Filter by document path (partial match)
 *   - limit: Limit number of results (default: 50)
 *   - offset: Offset for pagination (default: 0)
 */
router.get("/:id/docs", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const repoId = parseInt(req.params.id);
    const { type, path: pathFilter, limit = 50, offset = 0 } = req.query;

    if (isNaN(repoId)) {
      return res.status(400).json({
        error: "Invalid repository ID",
      });
    }

    logger.info("Fetching repository documentation", {
      userId,
      repoId,
      filterType: type,
      pathFilter,
    });

    // Verify user owns this repository
    const repoCheck = await query(
      `SELECT id, name, full_name as "fullName" FROM repositories WHERE id = $1 AND user_id = $2`,
      [repoId, userId]
    );

    if (repoCheck.rows.length === 0) {
      return res.status(404).json({
        error: "Repository not found",
      });
    }

    const repo = repoCheck.rows[0];

    // Build query for documents
    let docQuery = `
      SELECT
        id,
        repo_id as "repoId",
        path,
        content,
        type,
        generated_at as "generatedAt",
        updated_at as "updatedAt"
      FROM documents
      WHERE repo_id = $1
    `;
    const params = [repoId];
    let paramIndex = 2;

    // Add type filter if specified
    if (type) {
      docQuery += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    // Add path filter if specified
    if (pathFilter) {
      docQuery += ` AND path ILIKE $${paramIndex}`;
      params.push(`%${pathFilter}%`);
      paramIndex++;
    }

    // Add ordering, limit, and offset
    docQuery += ` ORDER BY updated_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const docResult = await query(docQuery, params);

    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) as total FROM documents WHERE repo_id = $1`;
    const countParams = [repoId];
    let countParamIndex = 2;

    if (type) {
      countQuery += ` AND type = $${countParamIndex}`;
      countParams.push(type);
      countParamIndex++;
    }

    if (pathFilter) {
      countQuery += ` AND path ILIKE $${countParamIndex}`;
      countParams.push(`%${pathFilter}%`);
    }

    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0]?.total || 0);

    logger.info("Fetched repository documentation", {
      userId,
      repoId,
      docCount: docResult.rows.length,
      total,
    });

    res.json({
      documents: docResult.rows,
      count: docResult.rows.length,
      total,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + docResult.rows.length < total,
      },
      repository: {
        id: repo.id,
        name: repo.name,
        fullName: repo.fullName,
      },
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
 * GET /api/repos/:id/docs/:docId
 * Get a specific documentation document
 */
router.get("/:id/docs/:docId", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const repoId = parseInt(req.params.id);
    const docId = parseInt(req.params.docId);

    if (isNaN(repoId) || isNaN(docId)) {
      return res.status(400).json({
        error: "Invalid repository or document ID",
      });
    }

    // Verify user owns the repository and get the document
    const result = await query(
      `SELECT d.id, d.repo_id as "repoId", d.path, d.content, d.type,
              d.generated_at as "generatedAt", d.updated_at as "updatedAt"
       FROM documents d
       JOIN repositories r ON d.repo_id = r.id
       WHERE d.id = $1 AND d.repo_id = $2 AND r.user_id = $3`,
      [docId, repoId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Document not found",
      });
    }

    res.json({
      document: result.rows[0],
    });
  } catch (error) {
    logger.error("Error fetching document", {
      error: error.message,
      userId: req.user?.id,
      repoId: req.params.id,
      docId: req.params.docId,
    });

    res.status(500).json({
      error: "Failed to fetch document",
      message: process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
});

/**
 * @swagger
 * /api/repos/{id}/chat:
 *   post:
 *     summary: Send a chat message and get AI response
 *     description: Ask questions about the repository's codebase using AI
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Repository ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChatMessage'
 *     responses:
 *       200:
 *         description: AI-generated response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChatResponse'
 *       400:
 *         description: Invalid request (missing message, message too long)
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Repository not found
 *       503:
 *         description: AI service not configured
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

    // Get repository details for context
    const repoResult = await query(`SELECT name, description FROM repositories WHERE id = $1`, [
      repoId,
    ]);

    const repo = repoResult.rows[0] || { name: "Unknown", description: "" };

    // RAG: Search for relevant code chunks using Pinecone
    let codeChunks = [];
    try {
      if (process.env.PINECONE_API_KEY) {
        const searchResults = await searchCodeChunks(repoId, message, 5);
        codeChunks = searchResults.map((result) => ({
          path: result.path,
          content: result.content,
          language: result.language,
          type: result.type,
          name: result.name,
        }));
        logger.info("RAG search completed", {
          repoId,
          chunkCount: codeChunks.length,
        });
      }
    } catch (ragError) {
      logger.warn("RAG search failed, continuing without context", {
        error: ragError.message,
        repoId,
      });
    }

    try {
      const { response, usage } = await generateChatResponse(message, {
        repoName: repo.name,
        repoDescription: repo.description,
        codeChunks,
      });

      logger.info("AI chat response generated", {
        userId,
        repoId,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
      });

      res.json({
        response,
        timestamp: new Date().toISOString(),
        usage,
      });
    } catch (aiError) {
      // If Claude API fails, provide a helpful error
      if (aiError.message?.includes("ANTHROPIC_API_KEY")) {
        logger.warn("Claude API not configured", { repoId });
        return res.status(503).json({
          error: "AI service not configured",
          message: "The AI chat feature requires an Anthropic API key to be configured.",
        });
      }
      throw aiError;
    }
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
 * Trigger full analysis and documentation generation for a repository
 *
 * Body:
 *   - types: Array of doc types to generate (readme, architecture, function, class, module)
 *   - generateDocs: Whether to generate documentation (default: true)
 *   - force: Force re-analysis even if recently analyzed (default: false)
 */
router.post("/:id/analyze", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const repoId = parseInt(req.params.id);
    const { force = false, types = [], generateDocs = true } = req.body;

    if (isNaN(repoId)) {
      return res.status(400).json({
        error: "Invalid repository ID",
      });
    }

    // Validate types if provided
    const validTypes = ["readme", "api", "function", "class", "architecture", "module"];
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

    // Get repository details
    const repoResult = await query(
      `SELECT id, full_name as "fullName", default_branch as "defaultBranch", status
       FROM repositories WHERE id = $1 AND user_id = $2`,
      [repoId, userId]
    );

    if (repoResult.rows.length === 0) {
      return res.status(404).json({
        error: "Repository not found",
      });
    }

    const repo = repoResult.rows[0];

    // Check if already processing
    if (repo.status === "processing" && !force) {
      return res.status(409).json({
        error: "Repository is already being analyzed",
        message: "Use force=true to override",
      });
    }

    // Check if documentation service is available
    if (generateDocs && !isDocumentationServiceAvailable()) {
      logger.warn("Documentation service not available", { repoId });
    }

    logger.info("Triggering repository analysis", {
      userId,
      repoId,
      fullName: repo.fullName,
      types,
      generateDocs,
      force,
    });

    // Create analysis job in database
    const jobInsertResult = await query(
      `INSERT INTO analysis_jobs (repo_id, status, trigger_type, started_at)
       VALUES ($1, 'queued', 'manual', NOW())
       RETURNING id`,
      [repoId]
    ).catch((err) => {
      logger.debug("Could not insert analysis_job", { error: err.message });
      return { rows: [] };
    });

    // Add job to queue
    const job = await addFullAnalysisJob({
      repositoryId: repoId,
      repoFullName: repo.fullName,
      userId,
      defaultBranch: repo.defaultBranch || "main",
      generateDocs,
      types: types.length > 0 ? types : validTypes,
    });

    res.json({
      message: "Repository analysis started",
      repoId,
      jobId: job.id,
      analysisJobId: jobInsertResult.rows[0]?.id,
      status: "queued",
      types: types.length > 0 ? types : validTypes,
      generateDocs,
      documentationServiceAvailable: isDocumentationServiceAvailable(),
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
 * POST /api/repos/:id/generate-docs
 * Trigger documentation generation only (without re-analyzing code)
 */
router.post("/:id/generate-docs", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const repoId = parseInt(req.params.id);
    const { types = [] } = req.body;

    if (isNaN(repoId)) {
      return res.status(400).json({
        error: "Invalid repository ID",
      });
    }

    // Check if documentation service is available
    if (!isDocumentationServiceAvailable()) {
      return res.status(503).json({
        error: "Documentation service not available",
        message: "ANTHROPIC_API_KEY is not configured",
      });
    }

    // Validate types
    const validTypes = ["readme", "architecture", "function", "class", "module"];
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

    // Get repository details
    const repoResult = await query(
      `SELECT id, full_name as "fullName", default_branch as "defaultBranch", status
       FROM repositories WHERE id = $1 AND user_id = $2`,
      [repoId, userId]
    );

    if (repoResult.rows.length === 0) {
      return res.status(404).json({
        error: "Repository not found",
      });
    }

    const repo = repoResult.rows[0];

    logger.info("Triggering documentation generation", {
      userId,
      repoId,
      fullName: repo.fullName,
      types,
    });

    // Add documentation generation job to queue
    const job = await addDocumentationGenerationJob({
      repositoryId: repoId,
      repoFullName: repo.fullName,
      userId,
      defaultBranch: repo.defaultBranch || "main",
      types: types.length > 0 ? types : validTypes,
    });

    res.json({
      message: "Documentation generation started",
      repoId,
      jobId: job.id,
      status: "queued",
      types: types.length > 0 ? types : validTypes,
    });
  } catch (error) {
    logger.error("Error triggering documentation generation", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      repoId: req.params.id,
    });

    res.status(500).json({
      error: "Failed to start documentation generation",
      message: process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
});

/**
 * GET /api/repos/:id/jobs/:jobId
 * Get the status of an analysis or documentation generation job
 */
router.get("/:id/jobs/:jobId", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const repoId = parseInt(req.params.id);
    const { jobId } = req.params;

    if (isNaN(repoId)) {
      return res.status(400).json({
        error: "Invalid repository ID",
      });
    }

    // Verify user owns the repository
    const repoCheck = await query(`SELECT id FROM repositories WHERE id = $1 AND user_id = $2`, [
      repoId,
      userId,
    ]);

    if (repoCheck.rows.length === 0) {
      return res.status(404).json({
        error: "Repository not found",
      });
    }

    // Get job status from queue
    const jobStatus = await getJobStatus(QUEUE_NAMES.DOCUMENTATION_ANALYSIS, jobId);

    if (!jobStatus) {
      return res.status(404).json({
        error: "Job not found",
      });
    }

    // Verify job belongs to this repository
    if (String(jobStatus.data?.repositoryId) !== String(repoId)) {
      return res.status(404).json({
        error: "Job not found for this repository",
      });
    }

    res.json({
      job: {
        id: jobStatus.id,
        name: jobStatus.name,
        status: jobStatus.state,
        progress: jobStatus.progress,
        result: jobStatus.returnvalue,
        error: jobStatus.failedReason,
        attempts: jobStatus.attemptsMade,
        createdAt: new Date(jobStatus.timestamp).toISOString(),
        finishedAt: jobStatus.finishedOn ? new Date(jobStatus.finishedOn).toISOString() : null,
        processedAt: jobStatus.processedOn ? new Date(jobStatus.processedOn).toISOString() : null,
      },
    });
  } catch (error) {
    logger.error("Error fetching job status", {
      error: error.message,
      userId: req.user?.id,
      repoId: req.params.id,
      jobId: req.params.jobId,
    });

    res.status(500).json({
      error: "Failed to fetch job status",
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
