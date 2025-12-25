import jwt from "jsonwebtoken";
import { logger } from "../utils/logger.js";

/**
 * Authentication middleware
 * Verifies JWT tokens and attaches user info to request
 */
export const authenticateToken = (req, res, next) => {
  try {
    // Extract token from Authorization header or cookies
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    // Also check cookies as fallback
    const cookieToken = req.cookies?.token;
    const finalToken = token || cookieToken;

    if (!finalToken) {
      logger.warn("No authentication token provided", {
        path: req.path,
        correlationId: req.headers["x-correlation-id"],
      });
      return res.status(401).json({
        error: "Authentication required",
        message: "No authentication token provided",
        code: "NO_TOKEN",
      });
    }

    // Verify token
    const secret = process.env.JWT_SECRET || "development_secret_change_in_production";

    jwt.verify(finalToken, secret, (err, user) => {
      if (err) {
        // Check if token is expired
        if (err.name === "TokenExpiredError") {
          logger.info("Expired token detected", {
            path: req.path,
            expiredAt: err.expiredAt,
            correlationId: req.headers["x-correlation-id"],
          });
          return res.status(401).json({
            error: "Session expired",
            message: "Your session has expired. Please log in again.",
            code: "TOKEN_EXPIRED",
            expiredAt: err.expiredAt,
          });
        }

        // Invalid token
        logger.warn("Invalid authentication token", {
          path: req.path,
          error: err.message,
          correlationId: req.headers["x-correlation-id"],
        });
        return res.status(403).json({
          error: "Invalid token",
          message: "Your authentication token is invalid. Please log in again.",
          code: "INVALID_TOKEN",
        });
      }

      // Token is valid - attach user to request
      req.user = user;
      logger.info("User authenticated successfully", {
        userId: user.id,
        path: req.path,
        correlationId: req.headers["x-correlation-id"],
      });
      next();
    });
  } catch (error) {
    logger.error("Error in authentication middleware", {
      error: error.message,
      stack: error.stack,
      path: req.path,
      correlationId: req.headers["x-correlation-id"],
    });
    res.status(500).json({
      error: "Authentication error",
      message: "An error occurred during authentication",
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user info if token is valid, but doesn't require authentication
 */
export const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    const cookieToken = req.cookies?.token;
    const finalToken = token || cookieToken;

    if (!finalToken) {
      // No token provided - continue without user
      req.user = null;
      return next();
    }

    const secret = process.env.JWT_SECRET || "development_secret_change_in_production";

    jwt.verify(finalToken, secret, (err, user) => {
      if (err) {
        // Token invalid or expired - continue without user
        req.user = null;
        return next();
      }

      // Token is valid - attach user
      req.user = user;
      next();
    });
  } catch (error) {
    // On error, continue without user
    req.user = null;
    next();
  }
};

/**
 * Generate JWT token for user
 */
export const generateToken = (user, expiresIn = "7d") => {
  const secret = process.env.JWT_SECRET || "development_secret_change_in_production";

  const payload = {
    id: user.id,
    email: user.email,
    githubId: user.github_id,
  };

  return jwt.sign(payload, secret, { expiresIn });
};

/**
 * Refresh token before expiration
 * Should be called when token is close to expiring
 */
export const refreshToken = (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    const cookieToken = req.cookies?.token;
    const finalToken = token || cookieToken;

    if (!finalToken) {
      return res.status(401).json({
        error: "No token provided",
        code: "NO_TOKEN",
      });
    }

    const secret = process.env.JWT_SECRET || "development_secret_change_in_production";

    // Verify and decode token (even if expired, for refresh)
    const decoded = jwt.decode(finalToken);

    if (!decoded) {
      return res.status(403).json({
        error: "Invalid token",
        code: "INVALID_TOKEN",
      });
    }

    // Generate new token with same user data
    const newToken = generateToken(decoded, "7d");

    logger.info("Token refreshed successfully", {
      userId: decoded.id,
      correlationId: req.headers["x-correlation-id"],
    });

    res.json({
      token: newToken,
      expiresIn: "7d",
    });
  } catch (error) {
    logger.error("Error refreshing token", {
      error: error.message,
      stack: error.stack,
      correlationId: req.headers["x-correlation-id"],
    });
    res.status(500).json({
      error: "Token refresh failed",
      message: error.message,
    });
  }
};
