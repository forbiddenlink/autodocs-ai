import express from "express";
import crypto from "crypto";
import { logger } from "../utils/logger.js";
import { authenticateToken, refreshToken } from "../middleware/auth.js";

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
 * Exchanges the authorization code for an access token, fetches user data, and creates a session
 */
router.get("/github/callback", async (req, res) => {
  const { code, state } = req.query;

  try {
    // Validate authorization code
    if (!code) {
      logger.warn("OAuth callback: No authorization code provided");
      return res.redirect(`${process.env.FRONTEND_URL || "http://localhost:3000"}?error=no_code`);
    }

    // Validate state token (CSRF protection)
    if (!state || !stateStore.has(state)) {
      logger.warn("OAuth callback: Invalid or expired state token", { state });
      return res.redirect(
        `${process.env.FRONTEND_URL || "http://localhost:3000"}?error=invalid_state`
      );
    }

    // Clean up used state
    stateStore.delete(state);

    // Exchange authorization code for access token
    logger.info("Exchanging authorization code for access token");

    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      logger.error("GitHub token exchange failed", {
        error: tokenData.error,
        description: tokenData.error_description,
      });
      return res.redirect(
        `${process.env.FRONTEND_URL || "http://localhost:3000"}?error=token_exchange_failed`
      );
    }

    const accessToken = tokenData.access_token;

    // Fetch user data from GitHub
    logger.info("Fetching user data from GitHub");

    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    const githubUser = await userResponse.json();

    // Fetch user email if not public
    let userEmail = githubUser.email;

    if (!userEmail) {
      const emailResponse = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      const emails = await emailResponse.json();
      const primaryEmail = emails.find((email) => email.primary);
      userEmail = primaryEmail ? primaryEmail.email : emails[0]?.email;
    }

    if (!userEmail) {
      logger.error("Could not retrieve user email from GitHub");
      return res.redirect(`${process.env.FRONTEND_URL || "http://localhost:3000"}?error=no_email`);
    }

    // Create or update user in database
    const { createOrUpdateUser } = await import("../services/userService.js");

    const user = await createOrUpdateUser({
      githubId: githubUser.id.toString(),
      email: userEmail,
      name: githubUser.name || githubUser.login,
      avatarUrl: githubUser.avatar_url,
    });

    logger.info("User authenticated successfully", {
      userId: user.id,
      githubId: user.github_id,
      correlationId: req.headers["x-correlation-id"],
    });

    // Generate JWT token
    const { generateToken } = await import("../middleware/auth.js");
    const token = generateToken(user, "7d");

    // Set secure HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Redirect to dashboard
    const dashboardUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard`;
    logger.info("Redirecting to dashboard", { userId: user.id, dashboardUrl });

    res.redirect(dashboardUrl);
  } catch (error) {
    logger.error("OAuth callback error", {
      error: error.message,
      stack: error.stack,
      correlationId: req.headers["x-correlation-id"],
    });

    res.redirect(`${process.env.FRONTEND_URL || "http://localhost:3000"}?error=auth_failed`);
  }
});

/**
 * GET /auth/status
 * Returns authentication status for the current session
 */
router.get("/status", async (req, res) => {
  try {
    // Check for token in cookies or Authorization header
    const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.json({
        authenticated: false,
        user: null,
      });
    }

    // Verify token
    const jwt = (await import("jsonwebtoken")).default;
    const secret = process.env.JWT_SECRET || "development_secret_change_in_production";

    try {
      const decoded = jwt.verify(token, secret);

      // Fetch full user data
      const { findUserById } = await import("../services/userService.js");
      const user = await findUserById(decoded.id);

      if (!user) {
        return res.json({
          authenticated: false,
          user: null,
        });
      }

      // Return user data without sensitive info
      res.json({
        authenticated: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatar_url,
          githubId: user.github_id,
        },
      });
    } catch (error) {
      // Token invalid or expired
      logger.info("Invalid or expired token in status check", {
        error: error.message,
      });

      res.json({
        authenticated: false,
        user: null,
      });
    }
  } catch (error) {
    logger.error("Error checking auth status", {
      error: error.message,
      correlationId: req.headers["x-correlation-id"],
    });

    res.status(500).json({
      error: "Failed to check authentication status",
    });
  }
});

/**
 * POST /auth/refresh
 * Refresh an expired or expiring token
 */
router.post("/refresh", refreshToken);

/**
 * POST /auth/logout
 * Logout and invalidate session
 */
router.post("/logout", (req, res) => {
  try {
    // Clear cookie if using cookie-based auth
    res.clearCookie("token");

    logger.info("User logged out", {
      correlationId: req.headers["x-correlation-id"],
    });

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    logger.error("Error during logout", {
      error: error.message,
      stack: error.stack,
      correlationId: req.headers["x-correlation-id"],
    });
    res.status(500).json({
      error: "Logout failed",
      message: error.message,
    });
  }
});

export default router;
