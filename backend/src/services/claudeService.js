import Anthropic from "@anthropic-ai/sdk";
import { logger } from "../utils/logger.js";

// Initialize Anthropic client
let client = null;

function getClient() {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is required");
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

/**
 * Generate a chat response about code
 * @param {string} userMessage - The user's question
 * @param {object} context - Context about the repository
 * @param {string} context.repoName - Repository name
 * @param {string} context.repoDescription - Repository description
 * @param {Array} context.codeChunks - Relevant code snippets from RAG
 * @returns {Promise<{response: string, usage: object}>}
 */
export async function generateChatResponse(userMessage, context = {}) {
  const anthropic = getClient();

  const { repoName = "Unknown", repoDescription = "", codeChunks = [] } = context;

  // Build context from code chunks
  let codeContext = "";
  if (codeChunks.length > 0) {
    codeContext = "\n\nRelevant code from the repository:\n";
    codeChunks.forEach((chunk, i) => {
      codeContext += `\n--- ${chunk.path || `Chunk ${i + 1}`} ---\n`;
      codeContext += "```" + (chunk.language || "") + "\n";
      codeContext += chunk.content + "\n```\n";
    });
  }

  const systemPrompt = `You are an AI assistant helping developers understand the "${repoName}" codebase.
${repoDescription ? `\nRepository description: ${repoDescription}` : ""}

Your role is to:
- Answer questions about the code structure, patterns, and implementation details
- Explain how different parts of the code work together
- Help debug issues and suggest improvements
- Provide code examples when helpful

Be concise but thorough. Use markdown formatting for code blocks and lists.
If you don't have enough context to answer a question, say so and suggest what information would help.${codeContext}`;

  try {
    logger.info("Sending request to Claude API", {
      messageLength: userMessage.length,
      contextChunks: codeChunks.length,
    });

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const responseText =
      message.content[0]?.type === "text" ? message.content[0].text : "Unable to generate response";

    logger.info("Claude API response received", {
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    });

    return {
      response: responseText,
      usage: {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      },
    };
  } catch (error) {
    logger.error("Claude API error", {
      error: error.message,
      status: error.status,
    });
    throw error;
  }
}

/**
 * Generate documentation for code
 * @param {string} code - The code to document
 * @param {string} language - Programming language
 * @param {string} type - Type of documentation (function, class, module, readme)
 * @returns {Promise<string>}
 */
export async function generateDocumentation(code, language, type = "function") {
  const anthropic = getClient();

  const prompts = {
    function: `Generate concise documentation for this ${language} function. Include:
- Brief description of what it does
- Parameters with types and descriptions
- Return value description
- Example usage if helpful

Code:
\`\`\`${language}
${code}
\`\`\``,
    class: `Generate documentation for this ${language} class. Include:
- Class purpose and responsibility
- Constructor parameters
- Public methods with descriptions
- Properties/attributes
- Usage example

Code:
\`\`\`${language}
${code}
\`\`\``,
    module: `Generate a module-level documentation summary for this ${language} code. Include:
- Module purpose
- Main exports
- Dependencies
- Usage patterns

Code:
\`\`\`${language}
${code}
\`\`\``,
    readme: `Generate a README section for this code. Include:
- What it does
- How to use it
- Configuration options if any
- Example usage

Code:
\`\`\`${language}
${code}
\`\`\``,
  };

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompts[type] || prompts.function }],
  });

  return message.content[0]?.type === "text" ? message.content[0].text : "";
}

/**
 * Stream a chat response (for real-time UI updates)
 * @param {string} userMessage - The user's question
 * @param {object} context - Context about the repository
 * @param {function} onChunk - Callback for each text chunk
 * @returns {Promise<{response: string, usage: object}>}
 */
export async function streamChatResponse(userMessage, context = {}, onChunk) {
  const anthropic = getClient();

  const { repoName = "Unknown", repoDescription = "", codeChunks = [] } = context;

  let codeContext = "";
  if (codeChunks.length > 0) {
    codeContext = "\n\nRelevant code from the repository:\n";
    codeChunks.forEach((chunk, i) => {
      codeContext += `\n--- ${chunk.path || `Chunk ${i + 1}`} ---\n`;
      codeContext += "```" + (chunk.language || "") + "\n";
      codeContext += chunk.content + "\n```\n";
    });
  }

  const systemPrompt = `You are an AI assistant helping developers understand the "${repoName}" codebase.
${repoDescription ? `\nRepository description: ${repoDescription}` : ""}

Be concise but thorough. Use markdown formatting.${codeContext}`;

  let fullResponse = "";

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      const text = event.delta.text;
      fullResponse += text;
      if (onChunk) {
        onChunk(text);
      }
    }
  }

  const finalMessage = await stream.finalMessage();

  return {
    response: fullResponse,
    usage: {
      inputTokens: finalMessage.usage.input_tokens,
      outputTokens: finalMessage.usage.output_tokens,
    },
  };
}
