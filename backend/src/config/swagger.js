import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "AutoDocs AI API",
      version: "1.0.0",
      description: "API for AI-powered documentation generation platform",
      contact: {
        name: "AutoDocs AI",
        url: "https://github.com/forbiddenlink/autodocs-ai",
      },
    },
    servers: [
      {
        url: process.env.BACKEND_URL || "http://localhost:4000",
        description: "API Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "token",
        },
      },
      schemas: {
        Repository: {
          type: "object",
          properties: {
            id: { type: "integer", description: "Repository ID" },
            userId: { type: "integer", description: "Owner user ID" },
            githubRepoId: { type: "string", description: "GitHub repository ID" },
            name: { type: "string", description: "Repository name" },
            fullName: { type: "string", description: "Full repository name (owner/repo)" },
            description: { type: "string", description: "Repository description" },
            url: { type: "string", format: "uri", description: "GitHub URL" },
            defaultBranch: { type: "string", description: "Default branch name" },
            status: {
              type: "string",
              enum: ["pending", "analyzing", "active", "error"],
              description: "Analysis status",
            },
            lastSync: { type: "string", format: "date-time", description: "Last sync timestamp" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Document: {
          type: "object",
          properties: {
            id: { type: "integer" },
            repoId: { type: "integer" },
            path: { type: "string", description: "Document path" },
            type: {
              type: "string",
              enum: ["readme", "api", "function", "class", "architecture"],
            },
            content: { type: "string", description: "Markdown content" },
            generatedAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        ChatMessage: {
          type: "object",
          required: ["message"],
          properties: {
            message: {
              type: "string",
              description: "User message",
              maxLength: 2000,
            },
          },
        },
        ChatResponse: {
          type: "object",
          properties: {
            response: { type: "string", description: "AI-generated response" },
            timestamp: { type: "string", format: "date-time" },
            usage: {
              type: "object",
              properties: {
                inputTokens: { type: "integer" },
                outputTokens: { type: "integer" },
              },
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: { type: "string", description: "Error message" },
            message: { type: "string", description: "Detailed message" },
            code: { type: "string", description: "Error code" },
          },
        },
        HealthCheck: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["ok", "degraded", "error"] },
            timestamp: { type: "string", format: "date-time" },
            uptime: { type: "number", description: "Server uptime in seconds" },
            services: {
              type: "object",
              properties: {
                database: {
                  type: "object",
                  properties: {
                    status: { type: "string" },
                    responseTime: { type: "string" },
                  },
                },
                memory: {
                  type: "object",
                  properties: {
                    heapUsed: { type: "string" },
                    heapTotal: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    tags: [
      { name: "Health", description: "Health check endpoints" },
      { name: "Auth", description: "Authentication endpoints" },
      { name: "Repositories", description: "Repository management" },
      { name: "Documentation", description: "Generated documentation" },
      { name: "Chat", description: "AI chat interface" },
    ],
  },
  apis: ["./src/routes/*.js", "./src/index.js"],
};

export const swaggerSpec = swaggerJsdoc(options);
export const swaggerUiServe = swaggerUi.serve;
export const swaggerUiSetup = swaggerUi.setup(swaggerSpec, {
  customCss: ".swagger-ui .topbar { display: none }",
  customSiteTitle: "AutoDocs AI API Documentation",
});
