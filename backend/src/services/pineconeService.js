import { Pinecone } from "@pinecone-database/pinecone";
import { logger } from "../utils/logger.js";
import {
  generateEmbedding,
  generateChunkEmbeddings,
  generatePlaceholderEmbedding,
  isEmbeddingServiceAvailable,
} from "./embeddingService.js";

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

// Re-export generatePlaceholderEmbedding for backward compatibility
export { generatePlaceholderEmbedding } from "./embeddingService.js";

/**
 * Upsert code chunks into Pinecone with real embeddings
 *
 * @param {string} repoId - Repository ID
 * @param {Array} chunks - Code chunks from codeAnalysisService
 * @param {object} options - Options
 * @param {boolean} options.useRealEmbeddings - Force use of placeholder embeddings if false
 */
export async function upsertCodeChunks(repoId, chunks, options = {}) {
  const { useRealEmbeddings = true } = options;
  const index = getIndex();

  if (chunks.length === 0) {
    logger.debug("No chunks to upsert", { repoId });
    return 0;
  }

  // Log embedding mode
  const usingRealEmbeddings = useRealEmbeddings && isEmbeddingServiceAvailable();
  logger.info("Generating embeddings for code chunks", {
    repoId,
    chunksCount: chunks.length,
    embeddingMode: usingRealEmbeddings ? "openai" : "placeholder",
  });

  // Generate embeddings - either real or placeholder
  let embeddings;
  if (usingRealEmbeddings) {
    embeddings = await generateChunkEmbeddings(chunks);
  } else {
    // Fallback to placeholder embeddings
    embeddings = chunks.map((chunk) => {
      const text = `${chunk.docstring || ""}\n${chunk.content}`.trim();
      return generatePlaceholderEmbedding(text);
    });
  }

  // Build vectors with embeddings
  const vectors = chunks.map((chunk, i) => {
    const id = `${repoId}-${chunk.path}-${chunk.startLine}`;

    return {
      id,
      values: embeddings[i],
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

  // Upsert in batches of 100 (Pinecone limit)
  const batchSize = 100;
  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize);
    await index.upsert(batch);
    logger.info("Upserted code chunks batch", {
      repoId,
      batchStart: i,
      batchSize: batch.length,
      totalChunks: vectors.length,
    });
  }

  logger.info("Code chunks upsert completed", {
    repoId,
    totalChunks: vectors.length,
    embeddingMode: usingRealEmbeddings ? "openai" : "placeholder",
  });

  return vectors.length;
}

/**
 * Search for relevant code chunks using semantic search
 *
 * @param {string} repoId - Repository ID to search within
 * @param {string} query - Search query
 * @param {number} topK - Number of results to return
 * @param {object} options - Options
 * @param {boolean} options.useRealEmbeddings - Force use of placeholder embeddings if false
 * @returns {Promise<Array>} Matching code chunks with scores
 */
export async function searchCodeChunks(repoId, query, topK = 5, options = {}) {
  const { useRealEmbeddings = true } = options;
  const index = getIndex();

  // Generate query embedding
  const usingRealEmbeddings = useRealEmbeddings && isEmbeddingServiceAvailable();
  let queryEmbedding;

  if (usingRealEmbeddings) {
    queryEmbedding = await generateEmbedding(query);
  } else {
    queryEmbedding = generatePlaceholderEmbedding(query);
  }

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
    embeddingMode: usingRealEmbeddings ? "openai" : "placeholder",
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
