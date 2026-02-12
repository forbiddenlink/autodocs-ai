import OpenAI from "openai";
import { logger } from "../utils/logger.js";

/**
 * Embedding Service for generating text embeddings using OpenAI
 *
 * Supports:
 * - text-embedding-ada-002 (1536 dimensions)
 * - text-embedding-3-small (1536 dimensions)
 * - text-embedding-3-large (3072 dimensions, but can be reduced)
 */

let openaiClient = null;

// Configuration
const DEFAULT_MODEL = "text-embedding-3-small";
const DEFAULT_DIMENSIONS = 1536;
const MAX_BATCH_SIZE = 2048; // OpenAI allows up to 2048 inputs per request
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

/**
 * Get or initialize the OpenAI client
 * @returns {OpenAI|null} OpenAI client or null if not configured
 */
function getOpenAIClient() {
  if (openaiClient) return openaiClient;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logger.warn(
      "OPENAI_API_KEY not configured - embedding service will use placeholder embeddings"
    );
    return null;
  }

  openaiClient = new OpenAI({ apiKey });
  return openaiClient;
}

/**
 * Check if OpenAI embeddings are available
 * @returns {boolean}
 */
export function isEmbeddingServiceAvailable() {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Sleep for a given number of milliseconds
 * @param {number} ms - Milliseconds to sleep
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a placeholder embedding for fallback
 * Uses character-level hashing (not semantically meaningful)
 *
 * @param {string} text - Text to embed
 * @param {number} dimensions - Embedding dimensions
 * @returns {number[]}
 */
export function generatePlaceholderEmbedding(text, dimensions = DEFAULT_DIMENSIONS) {
  const embedding = new Array(dimensions).fill(0);
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    embedding[i % dimensions] += charCode / 1000;
    embedding[(i + charCode) % dimensions] += 0.01;
  }
  // Normalize
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map((val) => val / (magnitude || 1));
}

/**
 * Generate embeddings for a single text
 *
 * @param {string} text - Text to embed
 * @param {object} options - Options
 * @param {string} options.model - Model to use (default: text-embedding-3-small)
 * @param {number} options.dimensions - Output dimensions (default: 1536)
 * @returns {Promise<number[]>} Embedding vector
 */
export async function generateEmbedding(text, options = {}) {
  const embeddings = await generateEmbeddings([text], options);
  return embeddings[0];
}

/**
 * Generate embeddings for multiple texts with batching and retry logic
 *
 * @param {string[]} texts - Array of texts to embed
 * @param {object} options - Options
 * @param {string} options.model - Model to use (default: text-embedding-3-small)
 * @param {number} options.dimensions - Output dimensions (default: 1536)
 * @param {boolean} options.logProgress - Whether to log progress (default: true)
 * @returns {Promise<number[][]>} Array of embedding vectors
 */
export async function generateEmbeddings(texts, options = {}) {
  const { model = DEFAULT_MODEL, dimensions = DEFAULT_DIMENSIONS, logProgress = true } = options;

  // Handle empty input
  if (!texts || texts.length === 0) {
    return [];
  }

  const client = getOpenAIClient();

  // Fall back to placeholder if OpenAI not configured
  if (!client) {
    logger.debug("Using placeholder embeddings (OpenAI not configured)", {
      textCount: texts.length,
    });
    return texts.map((text) => generatePlaceholderEmbedding(text, dimensions));
  }

  const allEmbeddings = [];
  const totalTexts = texts.length;
  const totalBatches = Math.ceil(totalTexts / MAX_BATCH_SIZE);

  if (logProgress && totalBatches > 1) {
    logger.info("Starting batch embedding generation", {
      totalTexts,
      totalBatches,
      model,
    });
  }

  // Process in batches
  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const start = batchIndex * MAX_BATCH_SIZE;
    const end = Math.min(start + MAX_BATCH_SIZE, totalTexts);
    const batch = texts.slice(start, end);

    if (logProgress) {
      logger.debug("Processing embedding batch", {
        batchIndex: batchIndex + 1,
        totalBatches,
        batchSize: batch.length,
        progress: `${end}/${totalTexts}`,
      });
    }

    // Retry logic with exponential backoff
    let lastError = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await client.embeddings.create({
          model,
          input: batch,
          dimensions: model === "text-embedding-ada-002" ? undefined : dimensions,
        });

        // Extract embeddings from response
        const batchEmbeddings = response.data
          .sort((a, b) => a.index - b.index) // Ensure correct order
          .map((item) => item.embedding);

        allEmbeddings.push(...batchEmbeddings);

        // Log token usage
        if (response.usage) {
          logger.debug("Embedding batch token usage", {
            promptTokens: response.usage.prompt_tokens,
            totalTokens: response.usage.total_tokens,
          });
        }

        break; // Success, exit retry loop
      } catch (error) {
        lastError = error;

        // Check if it's a rate limit error (429)
        if (error.status === 429) {
          const retryDelay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
          logger.warn("Rate limited by OpenAI, retrying", {
            attempt: attempt + 1,
            maxRetries: MAX_RETRIES,
            retryDelay,
          });
          await sleep(retryDelay);
          continue;
        }

        // For other errors, throw immediately
        throw error;
      }
    }

    // If we exhausted all retries
    if (lastError && allEmbeddings.length !== end) {
      logger.error("Failed to generate embeddings after retries", {
        batchIndex,
        error: lastError.message,
      });
      throw lastError;
    }

    // Small delay between batches to avoid rate limits
    if (batchIndex < totalBatches - 1) {
      await sleep(100);
    }
  }

  if (logProgress && totalBatches > 1) {
    logger.info("Batch embedding generation completed", {
      totalTexts,
      totalBatches,
      model,
    });
  }

  return allEmbeddings;
}

/**
 * Generate embeddings for code chunks
 * Prepares text by combining docstring and content
 *
 * @param {Array} chunks - Code chunks from codeAnalysisService
 * @param {object} options - Embedding options
 * @returns {Promise<number[][]>} Array of embedding vectors
 */
export async function generateChunkEmbeddings(chunks, options = {}) {
  const texts = chunks.map((chunk) => {
    // Combine docstring and content for richer embeddings
    const parts = [];
    if (chunk.docstring) {
      parts.push(chunk.docstring);
    }
    if (chunk.name) {
      parts.push(`Name: ${chunk.name}`);
    }
    if (chunk.type) {
      parts.push(`Type: ${chunk.type}`);
    }
    parts.push(chunk.content);
    return parts.join("\n").trim();
  });

  return generateEmbeddings(texts, options);
}

/**
 * Check embedding service health
 * @returns {Promise<object>} Health status
 */
export async function checkEmbeddingHealth() {
  const client = getOpenAIClient();

  if (!client) {
    return {
      status: "degraded",
      message: "OPENAI_API_KEY not configured - using placeholder embeddings",
      model: "placeholder",
    };
  }

  try {
    // Generate a test embedding
    const testEmbedding = await generateEmbedding("health check", { logProgress: false });

    return {
      status: "healthy",
      model: DEFAULT_MODEL,
      dimensions: testEmbedding.length,
    };
  } catch (error) {
    return {
      status: "unhealthy",
      error: error.message,
      model: DEFAULT_MODEL,
    };
  }
}

export default {
  generateEmbedding,
  generateEmbeddings,
  generateChunkEmbeddings,
  generatePlaceholderEmbedding,
  isEmbeddingServiceAvailable,
  checkEmbeddingHealth,
};
