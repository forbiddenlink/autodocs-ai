import { Worker } from "bullmq";
import axios from "axios";
import { createRedisConnection } from "../config/redis.js";
import { logger } from "../utils/logger.js";
import { query } from "../config/database.js";
import { QUEUE_NAMES, JOB_TYPES } from "../services/jobQueueService.js";
import { extractCodeChunks, detectLanguage } from "../services/codeAnalysisService.js";
import { upsertCodeChunks, deleteRepoVectors } from "../services/pineconeService.js";
import {
  generateAllDocumentation,
  generateBatchDocumentation,
  DOC_TYPES,
} from "../services/documentationService.js";

/**
 * GitHub API client with authentication
 */
function getGitHubClient(accessToken) {
  return axios.create({
    baseURL: "https://api.github.com",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github.v3+json",
    },
  });
}

/**
 * Fetch file content from GitHub
 * @param {object} github - GitHub API client
 * @param {string} repoFullName - Repository full name (owner/repo)
 * @param {string} filePath - File path in the repository
 * @param {string} ref - Branch or commit ref
 * @returns {Promise<string|null>}
 */
async function fetchFileContent(github, repoFullName, filePath, ref = "main") {
  try {
    const response = await github.get(`/repos/${repoFullName}/contents/${filePath}`, {
      params: { ref },
    });

    if (response.data.encoding === "base64") {
      return Buffer.from(response.data.content, "base64").toString("utf-8");
    }

    return null;
  } catch (error) {
    if (error.response?.status === 404) {
      logger.debug("File not found in repository", { repoFullName, filePath });
      return null;
    }
    throw error;
  }
}

/**
 * Get user's GitHub access token from database
 * @param {string} userId - User ID
 * @returns {Promise<string|null>}
 */
async function getUserAccessToken(userId) {
  const result = await query("SELECT access_token FROM users WHERE id = $1", [userId]);
  return result.rows[0]?.access_token || null;
}

/**
 * Update repository status in database
 * @param {string} repositoryId - Repository ID
 * @param {string} status - New status
 * @param {string|null} errorMessage - Optional error message
 */
async function updateRepositoryStatus(repositoryId, status, errorMessage = null) {
  await query(
    `UPDATE repositories
     SET status = $1,
         last_analysis_error = $2,
         last_analyzed_at = CASE WHEN $1 = 'ready' THEN NOW() ELSE last_analyzed_at END,
         updated_at = NOW()
     WHERE id = $3`,
    [status, errorMessage, repositoryId]
  );
}

/**
 * Update analysis job status in database
 * @param {string} repositoryId - Repository ID
 * @param {string} status - New status
 * @param {object|null} _result - Optional result data (unused, kept for API compatibility)
 */
async function updateAnalysisJobStatus(repositoryId, status, _result = null) {
  await query(
    `UPDATE analysis_jobs
     SET status = $1,
         completed_at = CASE WHEN $1 IN ('completed', 'failed') THEN NOW() ELSE completed_at END
     WHERE repo_id = $2 AND status = 'processing'`,
    [status, repositoryId]
  ).catch((err) => {
    // Table might not exist yet
    logger.debug("Could not update analysis_jobs", { error: err.message });
  });
}

/**
 * Store generated documentation in database
 * @param {string} repositoryId - Repository ID
 * @param {string} path - Document path (e.g., "README.md" or "functions/myFunc.md")
 * @param {string} content - Documentation content
 * @param {string} type - Document type (readme, api, function, class, architecture, module)
 */
async function storeDocumentation(repositoryId, path, content, type) {
  try {
    await query(
      `INSERT INTO documents (repo_id, path, content, type, generated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (repo_id, path, type)
       DO UPDATE SET content = $3, updated_at = NOW()`,
      [repositoryId, path, content, type]
    );
    logger.debug("Stored documentation", { repositoryId, path, type });
  } catch (error) {
    logger.error("Failed to store documentation", {
      repositoryId,
      path,
      type,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Store all generated documentation results
 * @param {string} repositoryId - Repository ID
 * @param {object} results - Documentation generation results
 */
async function storeAllDocumentation(repositoryId, results) {
  const stored = {
    readme: false,
    architecture: false,
    modules: 0,
    chunks: 0,
  };

  // Store README
  if (results.readme?.documentation) {
    await storeDocumentation(repositoryId, "README.md", results.readme.documentation, "readme");
    stored.readme = true;
  }

  // Store Architecture
  if (results.architecture?.documentation) {
    await storeDocumentation(
      repositoryId,
      "ARCHITECTURE.md",
      results.architecture.documentation,
      "architecture"
    );
    stored.architecture = true;
  }

  // Store Module docs
  for (const module of results.modules || []) {
    if (module.documentation) {
      const docPath = `modules/${module.path.replace(/\//g, "_")}.md`;
      await storeDocumentation(repositoryId, docPath, module.documentation, "module");
      stored.modules++;
    }
  }

  // Store chunk docs (functions, classes)
  for (const chunk of results.chunks || []) {
    if (chunk.documentation) {
      const docPath = `${chunk.type}s/${chunk.chunk.path.replace(/\//g, "_")}_${chunk.chunk.name}.md`;
      await storeDocumentation(repositoryId, docPath, chunk.documentation, chunk.type);
      stored.chunks++;
    }
  }

  logger.info("Stored all documentation", { repositoryId, stored });
  return stored;
}

/**
 * Process changed files for a repository
 * @param {object} job - BullMQ job
 */
async function processChangedFiles(job) {
  const { repositoryId, repoFullName, userId, changedFiles, defaultBranch, webhookDeliveryId } =
    job.data;

  logger.info("Processing changed files", {
    jobId: job.id,
    repositoryId,
    repoFullName,
    changedFilesCount: changedFiles.length,
    webhookDeliveryId,
  });

  // Get user's access token
  const accessToken = await getUserAccessToken(userId);
  if (!accessToken) {
    throw new Error(`No access token found for user ${userId}`);
  }

  const github = getGitHubClient(accessToken);

  // Update status to processing
  await updateRepositoryStatus(repositoryId, "processing");
  await updateAnalysisJobStatus(repositoryId, "processing");

  // Process each changed file
  const processedFiles = [];
  const allChunks = [];
  let processed = 0;

  for (const filePath of changedFiles) {
    // Skip non-code files
    const language = detectLanguage(filePath);
    if (!language) {
      logger.debug("Skipping non-code file", { filePath });
      continue;
    }

    try {
      // Fetch file content from GitHub
      const content = await fetchFileContent(github, repoFullName, filePath, defaultBranch);

      if (!content) {
        logger.debug("File content not available", { filePath });
        continue;
      }

      // Extract code chunks using tree-sitter
      const chunks = extractCodeChunks(content, language, filePath);

      if (chunks.length > 0) {
        allChunks.push(...chunks);
        processedFiles.push({
          path: filePath,
          language,
          chunksCount: chunks.length,
        });
      }

      processed++;
      await job.updateProgress({
        processed,
        total: changedFiles.length,
        currentFile: filePath,
      });
    } catch (error) {
      logger.warn("Error processing file", {
        filePath,
        error: error.message,
      });
    }
  }

  // Upsert embeddings to Pinecone
  if (allChunks.length > 0) {
    logger.info("Upserting code chunks to Pinecone", {
      repositoryId,
      chunksCount: allChunks.length,
    });

    await upsertCodeChunks(repositoryId, allChunks);
  }

  // Generate documentation for changed chunks if generateDocs flag is set
  let docsGenerated = 0;
  const generateDocs = job.data.generateDocs !== false; // Default to true

  if (generateDocs && allChunks.length > 0 && process.env.ANTHROPIC_API_KEY) {
    const documentableChunks = allChunks.filter(
      (c) => c.type === "function" || c.type === "class" || c.type === "method"
    );

    if (documentableChunks.length > 0) {
      logger.info("Generating documentation for changed chunks", {
        repositoryId,
        documentableChunks: documentableChunks.length,
      });

      try {
        // Get repository info for context
        const repoResult = await query(`SELECT name, description FROM repositories WHERE id = $1`, [
          repositoryId,
        ]);
        const repoInfo = repoResult.rows[0] || { name: repoFullName, description: "" };

        const docResults = await generateBatchDocumentation(documentableChunks, {
          repoName: repoInfo.name,
          repoDescription: repoInfo.description,
        });

        // Store generated documentation
        for (const result of docResults) {
          if (result.documentation) {
            const docPath = `${result.type}s/${result.chunk.path.replace(/\//g, "_")}_${result.chunk.name}.md`;
            await storeDocumentation(repositoryId, docPath, result.documentation, result.type);
            docsGenerated++;
          }
        }

        logger.info("Documentation generation completed for changed files", {
          repositoryId,
          docsGenerated,
        });
      } catch (docError) {
        logger.warn("Documentation generation failed, continuing without docs", {
          repositoryId,
          error: docError.message,
        });
      }
    }
  }

  // Update status to ready
  await updateRepositoryStatus(repositoryId, "ready");
  await updateAnalysisJobStatus(repositoryId, "completed", {
    processedFiles: processedFiles.length,
    chunksCreated: allChunks.length,
    docsGenerated,
  });

  logger.info("Changed files processing completed", {
    jobId: job.id,
    repositoryId,
    processedFiles: processedFiles.length,
    chunksCreated: allChunks.length,
    docsGenerated,
  });

  return {
    processedFiles: processedFiles.length,
    chunksCreated: allChunks.length,
    docsGenerated,
    files: processedFiles,
  };
}

/**
 * Process full repository analysis
 * @param {object} job - BullMQ job
 */
async function processFullRepository(job) {
  const { repositoryId, repoFullName, userId, defaultBranch } = job.data;

  logger.info("Processing full repository analysis", {
    jobId: job.id,
    repositoryId,
    repoFullName,
  });

  // Get user's access token
  const accessToken = await getUserAccessToken(userId);
  if (!accessToken) {
    throw new Error(`No access token found for user ${userId}`);
  }

  const github = getGitHubClient(accessToken);

  // Update status to processing
  await updateRepositoryStatus(repositoryId, "processing");

  // Clear existing vectors for this repository
  await deleteRepoVectors(repositoryId);

  // Get repository tree
  const treeResponse = await github.get(`/repos/${repoFullName}/git/trees/${defaultBranch}`, {
    params: { recursive: 1 },
  });

  const tree = treeResponse.data.tree || [];

  // Filter to only code files
  const codeFiles = tree.filter((item) => {
    if (item.type !== "blob") return false;
    return detectLanguage(item.path) !== null;
  });

  logger.info("Found code files", {
    repositoryId,
    totalFiles: tree.length,
    codeFiles: codeFiles.length,
  });

  // Process each code file
  const processedFiles = [];
  const allChunks = [];
  let processed = 0;

  for (const file of codeFiles) {
    const language = detectLanguage(file.path);

    try {
      const content = await fetchFileContent(github, repoFullName, file.path, defaultBranch);

      if (!content) {
        continue;
      }

      const chunks = extractCodeChunks(content, language, file.path);

      if (chunks.length > 0) {
        allChunks.push(...chunks);
        processedFiles.push({
          path: file.path,
          language,
          chunksCount: chunks.length,
        });
      }

      processed++;
      await job.updateProgress({
        processed,
        total: codeFiles.length,
        currentFile: file.path,
      });

      // Rate limiting - avoid hitting GitHub API limits
      if (processed % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (error) {
      logger.warn("Error processing file", {
        filePath: file.path,
        error: error.message,
      });
    }
  }

  // Upsert embeddings to Pinecone in batches
  if (allChunks.length > 0) {
    logger.info("Upserting code chunks to Pinecone", {
      repositoryId,
      chunksCount: allChunks.length,
    });

    await upsertCodeChunks(repositoryId, allChunks);
  }

  // Generate documentation if generateDocs flag is set
  let docsGenerated = { readme: false, architecture: false, chunks: 0 };
  const generateDocs = job.data.generateDocs !== false; // Default to true

  if (generateDocs && allChunks.length > 0 && process.env.ANTHROPIC_API_KEY) {
    logger.info("Generating full documentation for repository", {
      repositoryId,
      totalChunks: allChunks.length,
    });

    try {
      // Get repository info for context
      const repoResult = await query(`SELECT name, description FROM repositories WHERE id = $1`, [
        repositoryId,
      ]);
      const repoInfo = repoResult.rows[0] || { name: repoFullName, description: "" };

      // Generate all documentation types
      const results = await generateAllDocumentation(allChunks, {
        repoName: repoInfo.name,
        repoDescription: repoInfo.description,
        types: [DOC_TYPES.README, DOC_TYPES.ARCHITECTURE, DOC_TYPES.FUNCTION, DOC_TYPES.CLASS],
        onProgress: (completed, total) => {
          job.updateProgress({
            phase: "documentation",
            processed: completed,
            total,
          });
        },
      });

      // Store all documentation
      docsGenerated = await storeAllDocumentation(repositoryId, results);

      logger.info("Full repository documentation generated", {
        repositoryId,
        docsGenerated,
        usage: results.usage,
      });
    } catch (docError) {
      logger.warn("Documentation generation failed, embeddings still saved", {
        repositoryId,
        error: docError.message,
      });
    }
  }

  // Update status to ready
  await updateRepositoryStatus(repositoryId, "ready");

  logger.info("Full repository analysis completed", {
    jobId: job.id,
    repositoryId,
    processedFiles: processedFiles.length,
    chunksCreated: allChunks.length,
    docsGenerated,
  });

  return {
    processedFiles: processedFiles.length,
    chunksCreated: allChunks.length,
    docsGenerated,
    files: processedFiles,
  };
}

/**
 * Process documentation generation for a repository
 * @param {object} job - BullMQ job
 */
async function processDocumentationGeneration(job) {
  const { repositoryId, repoFullName, userId, defaultBranch, types = [] } = job.data;

  logger.info("Starting documentation generation", {
    jobId: job.id,
    repositoryId,
    repoFullName,
    types,
  });

  // Get user's access token
  const accessToken = await getUserAccessToken(userId);
  if (!accessToken) {
    throw new Error(`No access token found for user ${userId}`);
  }

  const github = getGitHubClient(accessToken);

  // Update status to processing
  await updateRepositoryStatus(repositoryId, "processing");

  // Get repository info
  const repoResult = await query(`SELECT name, description FROM repositories WHERE id = $1`, [
    repositoryId,
  ]);
  const repoInfo = repoResult.rows[0] || { name: repoFullName, description: "" };

  // Get repository tree
  const treeResponse = await github.get(`/repos/${repoFullName}/git/trees/${defaultBranch}`, {
    params: { recursive: 1 },
  });

  const tree = treeResponse.data.tree || [];

  // Filter to only code files
  const codeFiles = tree.filter((item) => {
    if (item.type !== "blob") return false;
    return detectLanguage(item.path) !== null;
  });

  logger.info("Found code files for documentation", {
    repositoryId,
    totalFiles: tree.length,
    codeFiles: codeFiles.length,
  });

  // Fetch and parse all code files
  const allChunks = [];
  let processed = 0;

  for (const file of codeFiles) {
    const language = detectLanguage(file.path);

    try {
      const content = await fetchFileContent(github, repoFullName, file.path, defaultBranch);

      if (!content) {
        continue;
      }

      const chunks = extractCodeChunks(content, language, file.path);
      allChunks.push(...chunks);

      processed++;
      await job.updateProgress({
        phase: "parsing",
        processed,
        total: codeFiles.length,
        currentFile: file.path,
      });

      // Rate limiting
      if (processed % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (error) {
      logger.warn("Error processing file for documentation", {
        filePath: file.path,
        error: error.message,
      });
    }
  }

  logger.info("Code parsing completed, generating documentation", {
    repositoryId,
    totalChunks: allChunks.length,
  });

  // Determine doc types to generate
  const docTypes =
    types.length > 0
      ? types
      : [DOC_TYPES.README, DOC_TYPES.ARCHITECTURE, DOC_TYPES.FUNCTION, DOC_TYPES.CLASS];

  // Generate documentation
  const results = await generateAllDocumentation(allChunks, {
    repoName: repoInfo.name,
    repoDescription: repoInfo.description,
    types: docTypes,
    onProgress: (completed, total) => {
      job.updateProgress({
        phase: "generating",
        processed: completed,
        total,
      });
    },
  });

  // Store documentation in database
  const stored = await storeAllDocumentation(repositoryId, results);

  // Update status to ready
  await updateRepositoryStatus(repositoryId, "ready");

  logger.info("Documentation generation completed", {
    jobId: job.id,
    repositoryId,
    stored,
    usage: results.usage,
  });

  return {
    stored,
    usage: results.usage,
    chunksProcessed: allChunks.length,
    filesProcessed: processed,
  };
}

/**
 * Process documentation regeneration (incremental update)
 * @param {object} job - BullMQ job
 */
async function processDocumentationRegeneration(job) {
  const {
    repositoryId,
    repoFullName,
    userId,
    changedFiles = [],
    defaultBranch,
    types = [],
  } = job.data;

  logger.info("Starting documentation regeneration", {
    jobId: job.id,
    repositoryId,
    repoFullName,
    changedFilesCount: changedFiles.length,
    types,
  });

  // Get user's access token
  const accessToken = await getUserAccessToken(userId);
  if (!accessToken) {
    throw new Error(`No access token found for user ${userId}`);
  }

  const github = getGitHubClient(accessToken);

  // Update status to processing
  await updateRepositoryStatus(repositoryId, "processing");

  // Get repository info
  const repoResult = await query(`SELECT name, description FROM repositories WHERE id = $1`, [
    repositoryId,
  ]);
  const repoInfo = repoResult.rows[0] || { name: repoFullName, description: "" };

  // Process only changed files
  const allChunks = [];
  let processed = 0;

  for (const filePath of changedFiles) {
    const language = detectLanguage(filePath);
    if (!language) {
      continue;
    }

    try {
      const content = await fetchFileContent(github, repoFullName, filePath, defaultBranch);

      if (!content) {
        continue;
      }

      const chunks = extractCodeChunks(content, language, filePath);
      allChunks.push(...chunks);

      processed++;
      await job.updateProgress({
        phase: "parsing",
        processed,
        total: changedFiles.length,
        currentFile: filePath,
      });
    } catch (error) {
      logger.warn("Error processing changed file", {
        filePath,
        error: error.message,
      });
    }
  }

  // Filter to documentable chunks
  const documentableChunks = allChunks.filter(
    (c) => c.type === "function" || c.type === "class" || c.type === "method"
  );

  if (documentableChunks.length === 0) {
    logger.info("No documentable chunks in changed files", {
      repositoryId,
      changedFiles: changedFiles.length,
    });
    await updateRepositoryStatus(repositoryId, "ready");
    return {
      stored: { chunks: 0 },
      usage: { inputTokens: 0, outputTokens: 0 },
      chunksProcessed: 0,
      filesProcessed: processed,
    };
  }

  // Generate documentation for changed chunks
  const results = await generateBatchDocumentation(documentableChunks, {
    repoName: repoInfo.name,
    repoDescription: repoInfo.description,
    onProgress: (completed, total) => {
      job.updateProgress({
        phase: "generating",
        processed: completed,
        total,
      });
    },
  });

  // Store documentation
  let storedCount = 0;
  const totalUsage = { inputTokens: 0, outputTokens: 0 };

  for (const result of results) {
    if (result.documentation) {
      const docPath = `${result.type}s/${result.chunk.path.replace(/\//g, "_")}_${result.chunk.name}.md`;
      await storeDocumentation(repositoryId, docPath, result.documentation, result.type);
      storedCount++;
      if (result.usage) {
        totalUsage.inputTokens += result.usage.inputTokens;
        totalUsage.outputTokens += result.usage.outputTokens;
      }
    }
  }

  // Update status to ready
  await updateRepositoryStatus(repositoryId, "ready");

  logger.info("Documentation regeneration completed", {
    jobId: job.id,
    repositoryId,
    storedCount,
    usage: totalUsage,
  });

  return {
    stored: { chunks: storedCount },
    usage: totalUsage,
    chunksProcessed: documentableChunks.length,
    filesProcessed: processed,
  };
}

/**
 * Create and start the documentation worker
 * @returns {Worker}
 */
export function createDocumentationWorker() {
  const connection = createRedisConnection();

  const worker = new Worker(
    QUEUE_NAMES.DOCUMENTATION_ANALYSIS,
    async (job) => {
      logger.info("Starting job processing", {
        jobId: job.id,
        jobName: job.name,
        repositoryId: job.data.repositoryId,
      });

      try {
        switch (job.name) {
          case JOB_TYPES.ANALYZE_CHANGED_FILES:
            return await processChangedFiles(job);

          case JOB_TYPES.ANALYZE_REPOSITORY:
            return await processFullRepository(job);

          case JOB_TYPES.GENERATE_EMBEDDINGS:
            // Future: standalone embedding generation
            logger.warn("GENERATE_EMBEDDINGS not yet implemented", { jobId: job.id });
            return { status: "not_implemented" };

          case JOB_TYPES.REGENERATE_DOCS:
            return await processDocumentationRegeneration(job);

          case JOB_TYPES.GENERATE_DOCUMENTATION:
            return await processDocumentationGeneration(job);

          default:
            logger.warn("Unknown job type", { jobName: job.name, jobId: job.id });
            throw new Error(`Unknown job type: ${job.name}`);
        }
      } catch (error) {
        logger.error("Job processing failed", {
          jobId: job.id,
          jobName: job.name,
          error: error.message,
          stack: error.stack,
        });

        // Update repository status to error
        if (job.data.repositoryId) {
          await updateRepositoryStatus(job.data.repositoryId, "error", error.message);
          await updateAnalysisJobStatus(job.data.repositoryId, "failed", {
            error: error.message,
          });
        }

        throw error; // Re-throw to trigger retry
      }
    },
    {
      connection,
      concurrency: parseInt(process.env.WORKER_CONCURRENCY || "3", 10),
      limiter: {
        max: 10, // Max 10 jobs per duration
        duration: 1000, // Per second
      },
    }
  );

  worker.on("completed", (job, result) => {
    logger.info("Job completed successfully", {
      jobId: job.id,
      jobName: job.name,
      result,
    });
  });

  worker.on("failed", (job, error) => {
    logger.error("Job failed", {
      jobId: job?.id,
      jobName: job?.name,
      error: error.message,
      attemptsMade: job?.attemptsMade,
    });
  });

  worker.on("error", (error) => {
    logger.error("Worker error", {
      error: error.message,
    });
  });

  worker.on("stalled", (jobId) => {
    logger.warn("Job stalled", { jobId });
  });

  logger.info("Documentation worker started", {
    queueName: QUEUE_NAMES.DOCUMENTATION_ANALYSIS,
    concurrency: process.env.WORKER_CONCURRENCY || "3",
  });

  return worker;
}

/**
 * Gracefully close the worker
 * @param {Worker} worker - Worker instance
 */
export async function closeWorker(worker) {
  if (worker) {
    await worker.close();
    logger.info("Documentation worker closed");
  }
}

export default {
  createDocumentationWorker,
  closeWorker,
};
