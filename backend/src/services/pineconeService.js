import { Pinecone } from "@pinecone-database/pinecone";
import { logger } from "../utils/logger.js";

let pineconeClient = null;
let pineconeIndex = null;

/**
 * Initialize Pinecone client
 */
function getClient() {
  if (!pineconeClient) {
    const apiKey = process.env.PINECONE_API_KEY;
    if (!apiKey) {
      throw new Error("PINECONE_API_KEY environment variable is required");
    }
    pineconeClient = new Pinecone({ apiKey });
  }
  return pineconeClient;
}

/**
 * Get the Pinecone index for code embeddings
 */
export function getIndex() {
  if (!pineconeIndex) {
    const client = getClient();
    const indexName = process.env.PINECONE_INDEX_NAME || "autodocs";
    pineconeIndex = client.index(indexName);
  }
  return pineconeIndex;
}

/**
 * Generate a simple embedding using character-level hashing
 * NOTE: This is a placeholder. In production, use a proper embedding model like:
 * - OpenAI text-embedding-3-small
 * - Voyage AI voyage-code-2
 * - Cohere embed-english-v3.0
 *
 * @param {string} text - Text to embed
 * @param {number} dimensions - Embedding dimensions (default 1536 for OpenAI compatibility)
 * @returns {number[]}
 */
export function generatePlaceholderEmbedding(text, dimensions = 1536) {
  // Simple hash-based embedding for development/testing
  // Replace with real embedding API in production
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
 * Upsert code chunks into Pinecone
 *
 * @param {string} repoId - Repository ID
 * @param {Array} chunks - Code chunks from codeAnalysisService
 * @param {function} embedFn - Function to generate embeddings (optional, uses placeholder if not provided)
 */
export async function upsertCodeChunks(repoId, chunks, embedFn = generatePlaceholderEmbedding) {
  const index = getIndex();

  const vectors = chunks.map((chunk, i) => {
    const id = `${repoId}-${chunk.path}-${chunk.startLine}`;
    const text = `${chunk.docstring || ""}\n${chunk.content}`.trim();

    return {
      id,
      values: embedFn(text),
      metadata: {
        repoId: String(repoId),
        path: chunk.path,
        type: chunk.type,
        name: chunk.name,
        language: chunk.language,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        content: chunk.content.substring(0, 1000), // Truncate for metadata size limits
      },
    };
  });

  // Upsert in batches of 100
  const batchSize = 100;
  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize);
    await index.upsert(batch);
    logger.info("Upserted code chunks batch", {
      repoId,
      batchStart: i,
      batchSize: batch.length,
    });
  }

  return vectors.length;
}

/**
 * Search for relevant code chunks
 *
 * @param {string} repoId - Repository ID to search within
 * @param {string} query - Search query
 * @param {number} topK - Number of results to return
 * @param {function} embedFn - Function to generate embeddings
 * @returns {Promise<Array>} Matching code chunks with scores
 */
export async function searchCodeChunks(
  repoId,
  query,
  topK = 5,
  embedFn = generatePlaceholderEmbedding
) {
  const index = getIndex();

  const queryEmbedding = embedFn(query);

  const results = await index.query({
    vector: queryEmbedding,
    topK,
    includeMetadata: true,
    filter: {
      repoId: { $eq: String(repoId) },
    },
  });

  logger.info("Code chunk search completed", {
    repoId,
    query: query.substring(0, 100),
    matchCount: results.matches?.length || 0,
  });

  return (results.matches || []).map((match) => ({
    id: match.id,
    score: match.score,
    path: match.metadata?.path,
    type: match.metadata?.type,
    name: match.metadata?.name,
    language: match.metadata?.language,
    content: match.metadata?.content,
    startLine: match.metadata?.startLine,
    endLine: match.metadata?.endLine,
  }));
}

/**
 * Delete all vectors for a repository
 *
 * @param {string} repoId - Repository ID
 */
export async function deleteRepoVectors(repoId) {
  const index = getIndex();

  // Delete by metadata filter
  await index.deleteMany({
    filter: {
      repoId: { $eq: String(repoId) },
    },
  });

  logger.info("Deleted repository vectors", { repoId });
}

/**
 * Check if Pinecone is configured and accessible
 */
export async function checkPineconeHealth() {
  try {
    const client = getClient();
    const indexes = await client.listIndexes();
    return {
      status: "healthy",
      indexCount: indexes.indexes?.length || 0,
    };
  } catch (error) {
    return {
      status: "unhealthy",
      error: error.message,
    };
  }
}
