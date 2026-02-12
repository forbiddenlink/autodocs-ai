import Anthropic from "@anthropic-ai/sdk";
import { logger } from "../utils/logger.js";

/**
 * Documentation Service
 *
 * Generates intelligent documentation for code using Claude AI.
 * Takes parsed code chunks from tree-sitter and generates various documentation types.
 */

// Constants
const CLAUDE_MODEL = "claude-sonnet-4-5-20250929";
const MAX_TOKENS_PER_REQUEST = 2000;
const BATCH_SIZE = 5; // Process 5 chunks at a time to avoid rate limits
const BATCH_DELAY_MS = 1000; // Delay between batches
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 2000;

// Documentation types
export const DOC_TYPES = {
  FUNCTION: "function",
  CLASS: "class",
  MODULE: "module",
  README: "readme",
  API: "api",
  ARCHITECTURE: "architecture",
};

let anthropicClient = null;

/**
 * Get or initialize the Anthropic client
 * @returns {Anthropic|null}
 */
function getClient() {
  if (anthropicClient) return anthropicClient;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    logger.warn("ANTHROPIC_API_KEY not configured - documentation service unavailable");
    return null;
  }

  anthropicClient = new Anthropic({ apiKey });
  return anthropicClient;
}

/**
 * Check if documentation service is available
 * @returns {boolean}
 */
export function isDocumentationServiceAvailable() {
  return !!process.env.ANTHROPIC_API_KEY;
}

/**
 * Sleep for a given number of milliseconds
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Build context from related code chunks for richer documentation
 * @param {object} chunk - The main chunk to document
 * @param {Array} allChunks - All chunks from the file/module
 * @returns {string} Context string
 */
function buildCodeContext(chunk, allChunks = []) {
  const parts = [];

  // Add file path context
  if (chunk.path) {
    parts.push(`File: ${chunk.path}`);
  }

  // Add imports from the same file
  const imports = allChunks.filter((c) => c.type === "import" && c.path === chunk.path);
  if (imports.length > 0) {
    parts.push("\nImports:");
    imports.forEach((imp) => {
      parts.push(imp.content);
    });
  }

  // Add docstring if present
  if (chunk.docstring) {
    parts.push("\nExisting docstring:");
    parts.push(chunk.docstring);
  }

  // Add related code (e.g., class methods if this is a class)
  if (chunk.type === "class") {
    const methods = allChunks.filter(
      (c) =>
        c.type === "method" &&
        c.path === chunk.path &&
        c.startLine > chunk.startLine &&
        c.endLine <= chunk.endLine
    );
    if (methods.length > 0) {
      parts.push(`\nClass has ${methods.length} method(s)`);
    }
  }

  return parts.join("\n");
}

/**
 * Generate documentation for a single code chunk
 *
 * @param {object} chunk - Code chunk from codeAnalysisService
 * @param {string} chunk.type - Type of code (function, class, method, etc.)
 * @param {string} chunk.name - Name of the code element
 * @param {string} chunk.content - Source code content
 * @param {string} chunk.language - Programming language
 * @param {string} chunk.path - File path
 * @param {string} chunk.docstring - Existing docstring if any
 * @param {object} options - Generation options
 * @param {string} options.repoName - Repository name for context
 * @param {string} options.repoDescription - Repository description
 * @param {Array} options.relatedChunks - Related code chunks for context
 * @returns {Promise<{documentation: string, type: string, usage: object}>}
 */
export async function generateChunkDocumentation(chunk, options = {}) {
  const client = getClient();

  if (!client) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const { repoName = "", repoDescription = "", relatedChunks = [] } = options;

  // Determine documentation type based on chunk type
  const docType = chunk.type === "class" ? DOC_TYPES.CLASS : DOC_TYPES.FUNCTION;

  // Build context
  const context = buildCodeContext(chunk, relatedChunks);

  // Build prompt based on chunk type
  let prompt;
  if (chunk.type === "class") {
    prompt = `Generate comprehensive documentation for this ${chunk.language} class.

${context ? `Context:\n${context}\n\n` : ""}
${repoName ? `Repository: ${repoName}` : ""}
${repoDescription ? `\nDescription: ${repoDescription}` : ""}

Class code:
\`\`\`${chunk.language}
${chunk.content}
\`\`\`

Generate documentation in Markdown format that includes:
1. **Overview**: Brief description of the class purpose and responsibility
2. **Constructor**: Parameters with types and descriptions
3. **Properties**: List of public properties/attributes
4. **Methods**: Each method with signature, parameters, return type, and description
5. **Usage Example**: A practical code example showing how to use the class
6. **Notes**: Any important considerations or gotchas

Keep it concise but complete. Use proper markdown formatting.`;
  } else {
    prompt = `Generate documentation for this ${chunk.language} ${chunk.type}.

${context ? `Context:\n${context}\n\n` : ""}
${repoName ? `Repository: ${repoName}` : ""}
${repoDescription ? `\nDescription: ${repoDescription}` : ""}

Code:
\`\`\`${chunk.language}
${chunk.content}
\`\`\`

Generate documentation in Markdown format that includes:
1. **Description**: What this ${chunk.type} does and why
2. **Parameters**: Each parameter with type and description (if applicable)
3. **Returns**: Return value type and description (if applicable)
4. **Throws**: Any exceptions that might be thrown (if applicable)
5. **Example**: A practical usage example
6. **Notes**: Any edge cases, performance considerations, or gotchas

Keep it concise but complete. Focus on the "why" not just the "what".`;
  }

  // Call Claude API with retry logic
  let lastError = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const message = await client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: MAX_TOKENS_PER_REQUEST,
        messages: [{ role: "user", content: prompt }],
      });

      const documentation = message.content[0]?.type === "text" ? message.content[0].text : "";

      logger.debug("Generated chunk documentation", {
        chunkName: chunk.name,
        chunkType: chunk.type,
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      });

      return {
        documentation,
        type: docType,
        chunk: {
          name: chunk.name,
          path: chunk.path,
          type: chunk.type,
          startLine: chunk.startLine,
          endLine: chunk.endLine,
        },
        usage: {
          inputTokens: message.usage.input_tokens,
          outputTokens: message.usage.output_tokens,
        },
      };
    } catch (error) {
      lastError = error;

      // Check for rate limit (429) or overload (529)
      if (error.status === 429 || error.status === 529) {
        const retryDelay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
        logger.warn("Rate limited, retrying", {
          attempt: attempt + 1,
          maxRetries: MAX_RETRIES,
          retryDelay,
          chunkName: chunk.name,
        });
        await sleep(retryDelay);
        continue;
      }

      throw error;
    }
  }

  logger.error("Failed to generate documentation after retries", {
    chunkName: chunk.name,
    error: lastError?.message,
  });
  throw lastError;
}

/**
 * Generate documentation for multiple code chunks with batching
 *
 * @param {Array} chunks - Array of code chunks
 * @param {object} options - Generation options
 * @param {string} options.repoName - Repository name
 * @param {string} options.repoDescription - Repository description
 * @param {function} options.onProgress - Progress callback (processed, total)
 * @returns {Promise<Array>} Array of documentation results
 */
export async function generateBatchDocumentation(chunks, options = {}) {
  const { repoName, repoDescription, onProgress } = options;

  if (!chunks || chunks.length === 0) {
    return [];
  }

  const client = getClient();
  if (!client) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const results = [];
  const totalChunks = chunks.length;
  let processed = 0;

  logger.info("Starting batch documentation generation", {
    totalChunks,
    batchSize: BATCH_SIZE,
    estimatedBatches: Math.ceil(totalChunks / BATCH_SIZE),
  });

  // Process in batches
  for (let i = 0; i < totalChunks; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(totalChunks / BATCH_SIZE);

    logger.debug("Processing documentation batch", {
      batchNumber,
      totalBatches,
      batchSize: batch.length,
    });

    // Process batch in parallel
    const batchPromises = batch.map((chunk) =>
      generateChunkDocumentation(chunk, {
        repoName,
        repoDescription,
        relatedChunks: chunks.filter((c) => c.path === chunk.path),
      }).catch((error) => {
        // Log error but don't fail the entire batch
        logger.warn("Failed to generate documentation for chunk", {
          chunkName: chunk.name,
          chunkPath: chunk.path,
          error: error.message,
        });
        return {
          documentation: null,
          error: error.message,
          chunk: {
            name: chunk.name,
            path: chunk.path,
            type: chunk.type,
          },
        };
      })
    );

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    processed += batch.length;
    if (onProgress) {
      onProgress(processed, totalChunks);
    }

    // Add delay between batches to avoid rate limits
    if (i + BATCH_SIZE < totalChunks) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  // Calculate totals
  const successful = results.filter((r) => r.documentation !== null);
  const failed = results.filter((r) => r.documentation === null);

  const totalUsage = successful.reduce(
    (acc, r) => ({
      inputTokens: acc.inputTokens + (r.usage?.inputTokens || 0),
      outputTokens: acc.outputTokens + (r.usage?.outputTokens || 0),
    }),
    { inputTokens: 0, outputTokens: 0 }
  );

  logger.info("Batch documentation generation completed", {
    totalChunks,
    successful: successful.length,
    failed: failed.length,
    totalInputTokens: totalUsage.inputTokens,
    totalOutputTokens: totalUsage.outputTokens,
  });

  return results;
}

/**
 * Generate module-level documentation for a file
 *
 * @param {Array} chunks - All chunks from a file
 * @param {object} options - Generation options
 * @returns {Promise<{documentation: string, type: string, usage: object}>}
 */
export async function generateModuleDocumentation(chunks, options = {}) {
  const client = getClient();

  if (!client) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  if (!chunks || chunks.length === 0) {
    throw new Error("No chunks provided for module documentation");
  }

  const { repoName = "", repoDescription = "" } = options;

  // Get file path from first chunk
  const filePath = chunks[0].path;
  const language = chunks[0].language;

  // Organize chunks by type
  const imports = chunks.filter((c) => c.type === "import");
  const exports = chunks.filter((c) => c.type === "export");
  const functions = chunks.filter((c) => c.type === "function" || c.type === "method");
  const classes = chunks.filter((c) => c.type === "class");

  // Build module overview
  const moduleOverview = `
File: ${filePath}
Language: ${language}

Imports (${imports.length}):
${imports.map((i) => i.content.trim()).join("\n")}

Exports (${exports.length}):
${exports.map((e) => e.content.substring(0, 100).trim()).join("\n")}

Functions (${functions.length}):
${functions.map((f) => `- ${f.name}`).join("\n")}

Classes (${classes.length}):
${classes.map((c) => `- ${c.name}`).join("\n")}
  `.trim();

  const prompt = `Generate module-level documentation for this ${language} file.

${repoName ? `Repository: ${repoName}` : ""}
${repoDescription ? `\nDescription: ${repoDescription}` : ""}

Module Overview:
${moduleOverview}

Generate documentation in Markdown format that includes:
1. **Purpose**: What this module/file is responsible for
2. **Dependencies**: Key imports and why they're used
3. **Exports**: What this module exports for use elsewhere
4. **Main Components**: Brief overview of key functions/classes
5. **Usage**: How to import and use this module
6. **Architecture Notes**: How this fits into the larger codebase

Keep it concise but informative. Focus on helping developers understand the module's role.`;

  const message = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: MAX_TOKENS_PER_REQUEST,
    messages: [{ role: "user", content: prompt }],
  });

  const documentation = message.content[0]?.type === "text" ? message.content[0].text : "";

  logger.debug("Generated module documentation", {
    filePath,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
  });

  return {
    documentation,
    type: DOC_TYPES.MODULE,
    path: filePath,
    usage: {
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    },
  };
}

/**
 * Generate README documentation for a repository
 *
 * @param {Array} chunks - All code chunks from the repository
 * @param {object} options - Generation options
 * @param {string} options.repoName - Repository name
 * @param {string} options.repoDescription - Repository description
 * @param {string} options.existingReadme - Existing README content for enhancement
 * @returns {Promise<{documentation: string, type: string, usage: object}>}
 */
export async function generateReadmeDocumentation(chunks, options = {}) {
  const client = getClient();

  if (!client) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const { repoName = "Project", repoDescription = "", existingReadme = "" } = options;

  // Analyze repository structure
  const files = [...new Set(chunks.map((c) => c.path))];
  const languages = [...new Set(chunks.map((c) => c.language))];
  const functions = chunks.filter((c) => c.type === "function" || c.type === "method");
  const classes = chunks.filter((c) => c.type === "class");

  // Identify key files by chunk count (more chunks = more important)
  const fileChunkCounts = {};
  chunks.forEach((c) => {
    fileChunkCounts[c.path] = (fileChunkCounts[c.path] || 0) + 1;
  });
  const keyFiles = Object.entries(fileChunkCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path]) => path);

  // Build repository overview
  const repoOverview = `
Repository: ${repoName}
${repoDescription ? `Description: ${repoDescription}` : ""}

Languages: ${languages.join(", ")}
Total Files: ${files.length}
Functions: ${functions.length}
Classes: ${classes.length}

Key Files:
${keyFiles.map((f) => `- ${f}`).join("\n")}

${existingReadme ? `\nExisting README content:\n${existingReadme.substring(0, 2000)}` : ""}
  `.trim();

  const prompt = `Generate a comprehensive README.md for this repository.

${repoOverview}

Sample of key functions/classes:
${functions
  .slice(0, 5)
  .map((f) => `- ${f.name} (${f.path})`)
  .join("\n")}
${classes
  .slice(0, 3)
  .map((c) => `- ${c.name} (${c.path})`)
  .join("\n")}

Generate a README in Markdown format that includes:
1. **Title and Badges**: Project name with relevant badges
2. **Overview**: What this project does and why
3. **Features**: Key features and capabilities
4. **Getting Started**: Installation and setup instructions
5. **Usage**: How to use the main functionality with examples
6. **Project Structure**: Overview of the directory structure
7. **API Reference**: Brief overview of main exports/APIs
8. **Configuration**: Environment variables and settings
9. **Contributing**: How to contribute to the project
10. **License**: Standard license section

${existingReadme ? "Enhance and improve upon the existing README while keeping any accurate information." : "Create a comprehensive README from scratch."}

Make it professional, clear, and developer-friendly.`;

  const message = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4000, // README can be longer
    messages: [{ role: "user", content: prompt }],
  });

  const documentation = message.content[0]?.type === "text" ? message.content[0].text : "";

  logger.info("Generated README documentation", {
    repoName,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
  });

  return {
    documentation,
    type: DOC_TYPES.README,
    path: "README.md",
    usage: {
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    },
  };
}

/**
 * Generate architecture documentation for a repository
 *
 * @param {Array} chunks - All code chunks from the repository
 * @param {object} options - Generation options
 * @returns {Promise<{documentation: string, type: string, usage: object}>}
 */
export async function generateArchitectureDocumentation(chunks, options = {}) {
  const client = getClient();

  if (!client) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const { repoName = "Project", repoDescription = "" } = options;

  // Analyze repository structure
  const files = [...new Set(chunks.map((c) => c.path))];
  const directories = [...new Set(files.map((f) => f.split("/").slice(0, -1).join("/")))];
  const imports = chunks.filter((c) => c.type === "import");
  const classes = chunks.filter((c) => c.type === "class");
  const functions = chunks.filter((c) => c.type === "function" || c.type === "method");

  // Analyze dependencies between files
  const importPatterns = imports
    .map((i) => i.content)
    .filter((c) => c.includes("from") || c.includes("require"))
    .slice(0, 20);

  const architectureOverview = `
Repository: ${repoName}
${repoDescription ? `Description: ${repoDescription}` : ""}

Directory Structure:
${directories
  .slice(0, 15)
  .map((d) => `- ${d || "/"}`)
  .join("\n")}

Files by Directory:
${directories
  .slice(0, 10)
  .map((dir) => {
    const dirFiles = files.filter((f) => f.startsWith(dir ? dir + "/" : ""));
    return `${dir || "root"}: ${dirFiles.length} files`;
  })
  .join("\n")}

Classes (${classes.length}):
${classes
  .slice(0, 10)
  .map((c) => `- ${c.name} (${c.path})`)
  .join("\n")}

Key Functions (${functions.length}):
${functions
  .slice(0, 10)
  .map((f) => `- ${f.name} (${f.path})`)
  .join("\n")}

Import Patterns:
${importPatterns.join("\n")}
  `.trim();

  const prompt = `Generate architecture documentation for this codebase.

${architectureOverview}

Generate documentation in Markdown format that includes:
1. **System Overview**: High-level description of what the system does
2. **Architecture Diagram**: ASCII or Mermaid diagram of component relationships
3. **Core Components**: Description of main modules and their responsibilities
4. **Data Flow**: How data moves through the system
5. **Directory Structure**: Explanation of the project layout
6. **Key Patterns**: Design patterns and architectural decisions used
7. **Dependencies**: External dependencies and their purposes
8. **API Boundaries**: How different parts of the system communicate
9. **Scalability Considerations**: How the architecture handles growth
10. **Technical Debt**: Any obvious areas for improvement

Focus on helping developers understand how the pieces fit together.`;

  const message = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }],
  });

  const documentation = message.content[0]?.type === "text" ? message.content[0].text : "";

  logger.info("Generated architecture documentation", {
    repoName,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
  });

  return {
    documentation,
    type: DOC_TYPES.ARCHITECTURE,
    path: "ARCHITECTURE.md",
    usage: {
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    },
  };
}

/**
 * Generate all documentation types for a repository
 *
 * @param {Array} chunks - All code chunks from the repository
 * @param {object} options - Generation options
 * @param {string[]} options.types - Types of documentation to generate
 * @param {function} options.onProgress - Progress callback
 * @returns {Promise<object>} All generated documentation
 */
export async function generateAllDocumentation(chunks, options = {}) {
  const {
    repoName,
    repoDescription,
    types = [DOC_TYPES.README, DOC_TYPES.ARCHITECTURE, DOC_TYPES.FUNCTION, DOC_TYPES.CLASS],
    onProgress,
  } = options;

  const results = {
    readme: null,
    architecture: null,
    modules: [],
    chunks: [],
    usage: {
      inputTokens: 0,
      outputTokens: 0,
    },
  };

  let totalSteps = 0;
  let completedSteps = 0;

  // Calculate total steps
  if (types.includes(DOC_TYPES.README)) totalSteps++;
  if (types.includes(DOC_TYPES.ARCHITECTURE)) totalSteps++;
  if (types.includes(DOC_TYPES.MODULE)) {
    const uniqueFiles = [...new Set(chunks.map((c) => c.path))];
    totalSteps += uniqueFiles.length;
  }
  if (types.includes(DOC_TYPES.FUNCTION) || types.includes(DOC_TYPES.CLASS)) {
    const documentableChunks = chunks.filter(
      (c) => c.type === "function" || c.type === "class" || c.type === "method"
    );
    totalSteps += documentableChunks.length;
  }

  const updateProgress = () => {
    completedSteps++;
    if (onProgress) {
      onProgress(completedSteps, totalSteps);
    }
  };

  logger.info("Starting comprehensive documentation generation", {
    repoName,
    types,
    totalSteps,
    totalChunks: chunks.length,
  });

  // Generate README
  if (types.includes(DOC_TYPES.README)) {
    try {
      const readmeResult = await generateReadmeDocumentation(chunks, {
        repoName,
        repoDescription,
      });
      results.readme = readmeResult;
      results.usage.inputTokens += readmeResult.usage.inputTokens;
      results.usage.outputTokens += readmeResult.usage.outputTokens;
      updateProgress();
    } catch (error) {
      logger.error("Failed to generate README", { error: error.message });
      results.readme = { error: error.message };
      updateProgress();
    }
  }

  // Generate Architecture
  if (types.includes(DOC_TYPES.ARCHITECTURE)) {
    try {
      const archResult = await generateArchitectureDocumentation(chunks, {
        repoName,
        repoDescription,
      });
      results.architecture = archResult;
      results.usage.inputTokens += archResult.usage.inputTokens;
      results.usage.outputTokens += archResult.usage.outputTokens;
      updateProgress();
    } catch (error) {
      logger.error("Failed to generate architecture docs", { error: error.message });
      results.architecture = { error: error.message };
      updateProgress();
    }
  }

  // Generate Module-level documentation
  if (types.includes(DOC_TYPES.MODULE)) {
    const fileGroups = {};
    chunks.forEach((chunk) => {
      if (!fileGroups[chunk.path]) {
        fileGroups[chunk.path] = [];
      }
      fileGroups[chunk.path].push(chunk);
    });

    for (const [filePath, fileChunks] of Object.entries(fileGroups)) {
      try {
        const moduleResult = await generateModuleDocumentation(fileChunks, {
          repoName,
          repoDescription,
        });
        results.modules.push(moduleResult);
        results.usage.inputTokens += moduleResult.usage.inputTokens;
        results.usage.outputTokens += moduleResult.usage.outputTokens;
      } catch (error) {
        logger.warn("Failed to generate module docs", {
          filePath,
          error: error.message,
        });
        results.modules.push({
          path: filePath,
          error: error.message,
        });
      }
      updateProgress();
      await sleep(500); // Rate limit protection
    }
  }

  // Generate function/class documentation
  if (types.includes(DOC_TYPES.FUNCTION) || types.includes(DOC_TYPES.CLASS)) {
    const documentableChunks = chunks.filter(
      (c) =>
        (types.includes(DOC_TYPES.FUNCTION) && (c.type === "function" || c.type === "method")) ||
        (types.includes(DOC_TYPES.CLASS) && c.type === "class")
    );

    const chunkDocs = await generateBatchDocumentation(documentableChunks, {
      repoName,
      repoDescription,
      onProgress: (processed, _total) => {
        if (onProgress) {
          onProgress(completedSteps + processed, totalSteps);
        }
      },
    });

    results.chunks = chunkDocs;

    chunkDocs.forEach((doc) => {
      if (doc.usage) {
        results.usage.inputTokens += doc.usage.inputTokens;
        results.usage.outputTokens += doc.usage.outputTokens;
      }
    });
  }

  logger.info("Documentation generation completed", {
    repoName,
    readme: results.readme ? "generated" : "skipped",
    architecture: results.architecture ? "generated" : "skipped",
    modules: results.modules.length,
    chunks: results.chunks.length,
    totalInputTokens: results.usage.inputTokens,
    totalOutputTokens: results.usage.outputTokens,
  });

  return results;
}

/**
 * Check documentation service health
 * @returns {Promise<object>}
 */
export async function checkDocumentationHealth() {
  const client = getClient();

  if (!client) {
    return {
      status: "unavailable",
      message: "ANTHROPIC_API_KEY not configured",
    };
  }

  try {
    // Send a minimal test request
    const message = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 10,
      messages: [{ role: "user", content: "Say 'OK'" }],
    });

    return {
      status: "healthy",
      model: CLAUDE_MODEL,
      testResponse: message.content[0]?.text || "OK",
    };
  } catch (error) {
    return {
      status: "unhealthy",
      error: error.message,
      model: CLAUDE_MODEL,
    };
  }
}

export default {
  DOC_TYPES,
  isDocumentationServiceAvailable,
  generateChunkDocumentation,
  generateBatchDocumentation,
  generateModuleDocumentation,
  generateReadmeDocumentation,
  generateArchitectureDocumentation,
  generateAllDocumentation,
  checkDocumentationHealth,
};
