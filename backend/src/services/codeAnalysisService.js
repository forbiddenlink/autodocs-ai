import Parser from "tree-sitter";
import JavaScript from "tree-sitter-javascript";
import TypeScript from "tree-sitter-typescript";
import Python from "tree-sitter-python";
import { logger } from "../utils/logger.js";

// Language parsers
const parsers = {
  javascript: null,
  typescript: null,
  python: null,
};

/**
 * Get or create a parser for a language
 */
function getParser(language) {
  if (!parsers[language]) {
    const parser = new Parser();
    switch (language) {
      case "javascript":
        parser.setLanguage(JavaScript);
        break;
      case "typescript":
        parser.setLanguage(TypeScript.typescript);
        break;
      case "tsx":
        parser.setLanguage(TypeScript.tsx);
        break;
      case "python":
        parser.setLanguage(Python);
        break;
      default:
        throw new Error(`Unsupported language: ${language}`);
    }
    parsers[language] = parser;
  }
  return parsers[language];
}

/**
 * Detect language from file extension
 */
export function detectLanguage(filePath) {
  const ext = filePath.split(".").pop()?.toLowerCase();
  const langMap = {
    js: "javascript",
    mjs: "javascript",
    cjs: "javascript",
    ts: "typescript",
    tsx: "tsx",
    py: "python",
  };
  return langMap[ext] || null;
}

/**
 * Extract code chunks at semantic boundaries (functions, classes, etc.)
 * This provides better context for RAG than fixed-size chunking
 *
 * @param {string} code - Source code to analyze
 * @param {string} language - Programming language
 * @param {string} filePath - File path for context
 * @returns {Array<{type: string, name: string, content: string, startLine: number, endLine: number}>}
 */
export function extractCodeChunks(code, language, filePath = "") {
  const chunks = [];

  try {
    const parser = getParser(language);
    const tree = parser.parse(code);
    const rootNode = tree.rootNode;

    // Walk the tree and extract semantic units
    function walk(node, depth = 0) {
      const nodeType = node.type;

      // JavaScript/TypeScript semantic units
      if (
        [
          "function_declaration",
          "function_expression",
          "arrow_function",
          "method_definition",
          "class_declaration",
          "class",
          "variable_declaration",
          "lexical_declaration",
          "export_statement",
          "import_statement",
        ].includes(nodeType)
      ) {
        const chunk = extractChunkInfo(node, code, language, filePath);
        if (chunk) {
          chunks.push(chunk);
        }
      }

      // Python semantic units
      if (
        [
          "function_definition",
          "class_definition",
          "import_statement",
          "import_from_statement",
        ].includes(nodeType)
      ) {
        const chunk = extractChunkInfo(node, code, language, filePath);
        if (chunk) {
          chunks.push(chunk);
        }
      }

      // Recurse into children (but not too deep)
      if (depth < 3) {
        for (const child of node.children) {
          walk(child, depth + 1);
        }
      }
    }

    walk(rootNode);

    logger.debug("Code chunks extracted", {
      filePath,
      language,
      chunkCount: chunks.length,
    });
  } catch (error) {
    logger.error("Error extracting code chunks", {
      error: error.message,
      filePath,
      language,
    });
  }

  return chunks;
}

/**
 * Extract information from a syntax tree node
 */
function extractChunkInfo(node, code, language, filePath) {
  const startPosition = node.startPosition;
  const endPosition = node.endPosition;
  const content = code.substring(node.startIndex, node.endIndex);

  // Skip tiny chunks (less than 2 lines)
  if (endPosition.row - startPosition.row < 2) {
    return null;
  }

  // Try to extract name
  let name = "anonymous";
  const nameNode =
    node.childForFieldName("name") || node.children.find((c) => c.type === "identifier");

  if (nameNode) {
    name = code.substring(nameNode.startIndex, nameNode.endIndex);
  }

  // Get preceding comment/docstring if any
  let docstring = "";
  const prevSibling = node.previousNamedSibling;
  if (prevSibling && prevSibling.type === "comment") {
    docstring = code.substring(prevSibling.startIndex, prevSibling.endIndex);
  }

  return {
    type: normalizeNodeType(node.type),
    name,
    content,
    docstring,
    language,
    path: filePath,
    startLine: startPosition.row + 1,
    endLine: endPosition.row + 1,
  };
}

/**
 * Normalize node types to common categories
 */
function normalizeNodeType(type) {
  const typeMap = {
    function_declaration: "function",
    function_definition: "function",
    function_expression: "function",
    arrow_function: "function",
    method_definition: "method",
    class_declaration: "class",
    class_definition: "class",
    class: "class",
    variable_declaration: "variable",
    lexical_declaration: "variable",
    import_statement: "import",
    import_from_statement: "import",
    export_statement: "export",
  };
  return typeMap[type] || type;
}

/**
 * Analyze code and return a summary
 */
export function analyzeCode(code, language, filePath = "") {
  const chunks = extractCodeChunks(code, language, filePath);

  const summary = {
    filePath,
    language,
    functions: [],
    classes: [],
    imports: [],
    exports: [],
  };

  for (const chunk of chunks) {
    switch (chunk.type) {
      case "function":
      case "method":
        summary.functions.push({
          name: chunk.name,
          startLine: chunk.startLine,
          endLine: chunk.endLine,
          docstring: chunk.docstring,
        });
        break;
      case "class":
        summary.classes.push({
          name: chunk.name,
          startLine: chunk.startLine,
          endLine: chunk.endLine,
        });
        break;
      case "import":
        summary.imports.push({
          content: chunk.content.trim(),
          line: chunk.startLine,
        });
        break;
      case "export":
        summary.exports.push({
          content: chunk.content.substring(0, 100).trim(),
          line: chunk.startLine,
        });
        break;
    }
  }

  return summary;
}

/**
 * Get supported languages
 */
export function getSupportedLanguages() {
  return ["javascript", "typescript", "tsx", "python"];
}
