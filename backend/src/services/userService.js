import { query } from "../config/database.js";
import { logger } from "../utils/logger.js";

/**
 * User Service
 * Handles all user-related database operations
 */

/**
 * Find user by GitHub ID
 * @param {string} githubId - GitHub user ID
 * @returns {Promise<Object|null>} User object or null if not found
 */
export async function findUserByGithubId(githubId) {
  try {
    const result = await query("SELECT * FROM users WHERE github_id = $1", [githubId]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    logger.error("Error finding user by GitHub ID", {
      error: error.message,
      githubId,
    });
    throw error;
  }
}

/**
 * Find user by ID
 * @param {number} id - User ID
 * @returns {Promise<Object|null>} User object or null if not found
 */
export async function findUserById(id) {
  try {
    const result = await query("SELECT * FROM users WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    logger.error("Error finding user by ID", {
      error: error.message,
      userId: id,
    });
    throw error;
  }
}

/**
 * Create a new user
 * @param {Object} userData - User data from GitHub
 * @param {string} userData.githubId - GitHub user ID
 * @param {string} userData.email - User email
 * @param {string} userData.name - User name
 * @param {string} userData.avatarUrl - User avatar URL
 * @returns {Promise<Object>} Created user object
 */
export async function createUser(userData) {
  try {
    const { githubId, email, name, avatarUrl } = userData;

    const result = await query(
      `INSERT INTO users (github_id, email, name, avatar_url)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [githubId, email, name, avatarUrl]
    );

    const user = result.rows[0];

    logger.info("User created successfully", {
      userId: user.id,
      githubId: user.github_id,
    });

    return user;
  } catch (error) {
    logger.error("Error creating user", {
      error: error.message,
      userData,
    });
    throw error;
  }
}

/**
 * Update existing user
 * @param {number} id - User ID
 * @param {Object} userData - Updated user data
 * @returns {Promise<Object>} Updated user object
 */
export async function updateUser(id, userData) {
  try {
    const { email, name, avatarUrl } = userData;

    const result = await query(
      `UPDATE users
       SET email = $2, name = $3, avatar_url = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id, email, name, avatarUrl]
    );

    const user = result.rows[0];

    logger.info("User updated successfully", {
      userId: user.id,
    });

    return user;
  } catch (error) {
    logger.error("Error updating user", {
      error: error.message,
      userId: id,
    });
    throw error;
  }
}

/**
 * Create or update user (upsert)
 * @param {Object} userData - User data from GitHub
 * @returns {Promise<Object>} User object
 */
export async function createOrUpdateUser(userData) {
  try {
    const { githubId, email, name, avatarUrl } = userData;

    // Try to find existing user
    const existingUser = await findUserByGithubId(githubId);

    if (existingUser) {
      // Update existing user
      return await updateUser(existingUser.id, { email, name, avatarUrl });
    } else {
      // Create new user
      return await createUser({ githubId, email, name, avatarUrl });
    }
  } catch (error) {
    logger.error("Error in createOrUpdateUser", {
      error: error.message,
      userData,
    });
    throw error;
  }
}
