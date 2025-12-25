import express from "express";
import crypto from "crypto";
import { logger } from "../utils/logger.js";

const router = express.Router();

// In-memory store for OAuth state tokens (in production, use Redis or database)
const stateStore = new Map();

/**
 * GET /auth/github
 * Initiates GitHub OAuth flow by redirecting to GitHub's authorization page
 */
router.get("/github", (req, res) => {
  try {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const callbackUrl = process.env.GITHUB_CALLBACK_URL;

    if (!clientId || clientId === "your_github_client_id") {
      return res.status(500).json({
        error: "GitHub OAuth is not configured. Please set GITHUB_CLIENT_ID environment variable.",
      });
    }

    // Generate a random state token for CSRF protection
    const state = crypto.randomBytes(32).toString("hex");

    // Store state with expiration (5 minutes)
    stateStore.set(state, {
      timestamp: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    // Clean up expired states
    for (const [key, value] of stateStore.entries()) {
      if (value.expiresAt < Date.now()) {
        stateStore.delete(key);
      }
    }

    // Build GitHub OAuth authorization URL
    const scopes = ["repo", "user:email"];
    const githubAuthUrl = new URL("https://github.com/login/oauth/authorize");
    githubAuthUrl.searchParams.set("client_id", clientId);
    githubAuthUrl.searchParams.set(
      "redirect_uri",
      callbackUrl || "http://localhost:3000/api/auth/callback/github"
    );
    githubAuthUrl.searchParams.set("scope", scopes.join(" "));
    githubAuthUrl.searchParams.set("state", state);

    // Redirect to GitHub
    res.redirect(githubAuthUrl.toString());
  } catch (error) {
    logger.error("Error initiating GitHub OAuth", {
      error: error.message,
      stack: error.stack,
      correlationId: req.headers["x-correlation-id"],
    });
    res.status(500).json({
      error: "Failed to initiate GitHub authentication",
      message: error.message,
    });
  }
});

/**
 * GET /auth/github/callback
 * Handles the OAuth callback from GitHub
 * This is a placeholder for now - will be fully implemented in Test #4
 */
router.get("/github/callback", async (req, res) => {
  const { code, state } = req.query;

  // Basic validation for now
  if (!code) {
    return res.status(400).json({ error: "No authorization code provided" });
  }

  if (!state || !stateStore.has(state)) {
    return res.status(400).json({ error: "Invalid or expired state token" });
  }

  // Clean up used state
  stateStore.delete(state);

  // For now, just return a placeholder response
  // Full implementation will be in Test #4
  res.json({
    message: "OAuth callback received (full implementation pending)",
    code: code.substring(0, 10) + "...", // Show partial code for verification
  });
});

/**
 * GET /auth/status
 * Returns authentication status for the current session
 */
router.get("/status", (req, res) => {
  // For now, return not authenticated
  // Will be implemented with proper session management in Test #4
  res.json({
    authenticated: false,
    user: null,
  });
});

export default router;
