import express from "express";
import crypto from "crypto";
import { logger } from "../utils/logger.js";
import { query } from "../config/database.js";
import { addDocumentationJob, getQueueStats, QUEUE_NAMES } from "../services/jobQueueService.js";

const router = express.Router();

/**
 * Verify GitHub webhook signature
 * @param {string} payload - Raw request body
 * @param {string} signature - X-Hub-Signature-256 header
 * @returns {boolean}
 */
function verifyGitHubSignature(payload, signature) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    logger.warn("GITHUB_WEBHOOK_SECRET not configured");
    return false;
  }

  if (!signature) {
    return false;
  }

  const expectedSignature =
    "sha256=" + crypto.createHmac("sha256", secret).update(payload, "utf8").digest("hex");

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

/**
 * @swagger
 * /api/webhooks/github:
 *   post:
 *     summary: GitHub webhook endpoint
 *     description: Receives push events from GitHub to trigger documentation regeneration
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Invalid signature or payload
 *       404:
 *         description: Repository not found
 */
router.post("/github", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const signature = req.headers["x-hub-signature-256"];
    const event = req.headers["x-github-event"];
    const deliveryId = req.headers["x-github-delivery"];

    // Verify signature
    const payload = req.body.toString();
    if (!verifyGitHubSignature(payload, signature)) {
      logger.warn("Invalid GitHub webhook signature", { deliveryId });
      return res.status(400).json({ error: "Invalid signature" });
    }

    const body = JSON.parse(payload);

    logger.info("GitHub webhook received", {
      event,
      deliveryId,
      repo: body.repository?.full_name,
    });

    // Handle different event types
    switch (event) {
      case "push":
        await handlePushEvent(body, deliveryId);
        break;
      case "ping":
        logger.info("GitHub webhook ping received", { deliveryId });
        break;
      default:
        logger.info("Unhandled GitHub event", { event, deliveryId });
    }

    res.json({ received: true, event, deliveryId });
  } catch (error) {
    logger.error("Webhook processing error", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

/**
 * Handle push events - trigger documentation regeneration
 */
async function handlePushEvent(payload, deliveryId) {
  const repoFullName = payload.repository?.full_name;
  const defaultBranch = payload.repository?.default_branch;
  const ref = payload.ref;

  // Only process pushes to the default branch
  if (ref !== `refs/heads/${defaultBranch}`) {
    logger.info("Push to non-default branch, skipping", {
      ref,
      defaultBranch,
      deliveryId,
    });
    return;
  }

  // Find repository in our database
  const result = await query(`SELECT id, user_id, name FROM repositories WHERE full_name = $1`, [
    repoFullName,
  ]);

  if (result.rows.length === 0) {
    logger.warn("Repository not found for webhook", { repoFullName, deliveryId });
    return;
  }

  const repo = result.rows[0];

  // Update repository status to indicate analysis is pending
  await query(`UPDATE repositories SET status = $1, updated_at = NOW() WHERE id = $2`, [
    "analyzing",
    repo.id,
  ]);

  // Get changed files from the push
  const changedFiles = [];
  for (const commit of payload.commits || []) {
    changedFiles.push(...(commit.added || []));
    changedFiles.push(...(commit.modified || []));
  }

  // Remove duplicates from changed files
  const uniqueChangedFiles = [...new Set(changedFiles)];

  logger.info("Triggering documentation regeneration", {
    repoId: repo.id,
    repoName: repo.name,
    changedFiles: uniqueChangedFiles.length,
    deliveryId,
  });

  // Add job to the BullMQ queue for async processing
  const job = await addDocumentationJob({
    repositoryId: repo.id,
    repoFullName,
    userId: repo.user_id,
    changedFiles: uniqueChangedFiles,
    defaultBranch,
    webhookDeliveryId: deliveryId,
  });

  // Also track in database for historical reference
  await query(
    `INSERT INTO analysis_jobs (repository_id, status, changed_files, webhook_delivery_id, job_id, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (repository_id) WHERE status = 'pending'
     DO UPDATE SET changed_files = EXCLUDED.changed_files, job_id = EXCLUDED.job_id, updated_at = NOW()`,
    [repo.id, "pending", JSON.stringify(uniqueChangedFiles), deliveryId, job.id]
  ).catch((err) => {
    // Table might not exist yet - log and continue
    logger.warn("Could not insert analysis job record", { error: err.message });
  });

  logger.info("Documentation regeneration job queued", {
    repoId: repo.id,
    jobId: job.id,
    deliveryId,
  });
}

/**
 * @swagger
 * /api/webhooks/status:
 *   get:
 *     summary: Check webhook configuration status
 *     tags: [Webhooks]
 *     responses:
 *       200:
 *         description: Webhook status
 */
router.get("/status", async (req, res) => {
  const configured = !!process.env.GITHUB_WEBHOOK_SECRET;

  // Get queue statistics
  let queueStats = null;
  try {
    queueStats = await getQueueStats(QUEUE_NAMES.DOCUMENTATION_ANALYSIS);
  } catch (error) {
    logger.warn("Could not get queue stats", { error: error.message });
  }

  res.json({
    configured,
    endpoint: "/api/webhooks/github",
    supportedEvents: ["push", "ping"],
    queue: queueStats,
  });
});

export default router;
