import { Queue, QueueEvents } from "bullmq";
import { getRedisConnection } from "../config/redis.js";
import { logger } from "../utils/logger.js";

// Queue names
export const QUEUE_NAMES = {
  DOCUMENTATION_ANALYSIS: "documentation-analysis",
};

// Job types
export const JOB_TYPES = {
  ANALYZE_REPOSITORY: "analyze-repository",
  ANALYZE_CHANGED_FILES: "analyze-changed-files",
  GENERATE_EMBEDDINGS: "generate-embeddings",
  REGENERATE_DOCS: "regenerate-docs",
  GENERATE_DOCUMENTATION: "generate-documentation",
};

// Queue instances
const queues = {};
const queueEvents = {};

/**
 * Get or create a queue instance
 * @param {string} queueName - Name of the queue
 * @returns {Queue}
 */
export function getQueue(queueName) {
  if (!queues[queueName]) {
    const connection = getRedisConnection();

    queues[queueName] = new Queue(queueName, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000, // Start with 5 second delay
        },
        removeOnComplete: {
          age: 24 * 3600, // Keep completed jobs for 24 hours
          count: 1000, // Keep at most 1000 completed jobs
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // Keep failed jobs for 7 days
        },
      },
    });

    logger.info("Queue initialized", { queueName });
  }

  return queues[queueName];
}

/**
 * Get or create queue events instance for monitoring
 * @param {string} queueName - Name of the queue
 * @returns {QueueEvents}
 */
export function getQueueEvents(queueName) {
  if (!queueEvents[queueName]) {
    const connection = getRedisConnection();

    queueEvents[queueName] = new QueueEvents(queueName, { connection });

    // Set up event listeners for monitoring
    queueEvents[queueName].on("completed", ({ jobId }) => {
      logger.info("Job completed", { queueName, jobId });
    });

    queueEvents[queueName].on("failed", ({ jobId, failedReason }) => {
      logger.error("Job failed", { queueName, jobId, failedReason });
    });

    queueEvents[queueName].on("progress", ({ jobId, data }) => {
      logger.debug("Job progress", { queueName, jobId, progress: data });
    });

    logger.info("Queue events initialized", { queueName });
  }

  return queueEvents[queueName];
}

/**
 * Add a documentation analysis job to the queue
 * @param {object} data - Job data
 * @param {string} data.repositoryId - Repository ID
 * @param {string} data.repoFullName - Full repository name (owner/repo)
 * @param {string} data.userId - User ID who owns the repository
 * @param {string[]} data.changedFiles - List of changed file paths
 * @param {string} data.webhookDeliveryId - GitHub webhook delivery ID for tracking
 * @param {string} data.defaultBranch - Default branch name
 * @param {object} options - Job options
 * @returns {Promise<Job>}
 */
export async function addDocumentationJob(data, options = {}) {
  const queue = getQueue(QUEUE_NAMES.DOCUMENTATION_ANALYSIS);

  const jobId = `repo-${data.repositoryId}-${Date.now()}`;

  const job = await queue.add(JOB_TYPES.ANALYZE_CHANGED_FILES, data, {
    jobId,
    priority: options.priority || 0, // Lower number = higher priority
    ...options,
  });

  logger.info("Documentation analysis job added", {
    jobId: job.id,
    repositoryId: data.repositoryId,
    repoFullName: data.repoFullName,
    changedFilesCount: data.changedFiles?.length || 0,
    webhookDeliveryId: data.webhookDeliveryId,
  });

  return job;
}

/**
 * Add a full repository analysis job to the queue
 * @param {object} data - Job data
 * @param {string} data.repositoryId - Repository ID
 * @param {string} data.repoFullName - Full repository name
 * @param {string} data.userId - User ID
 * @param {string} data.defaultBranch - Default branch name
 * @param {object} options - Job options
 * @returns {Promise<Job>}
 */
export async function addFullAnalysisJob(data, options = {}) {
  const queue = getQueue(QUEUE_NAMES.DOCUMENTATION_ANALYSIS);

  const jobId = `full-repo-${data.repositoryId}-${Date.now()}`;

  const job = await queue.add(JOB_TYPES.ANALYZE_REPOSITORY, data, {
    jobId,
    priority: options.priority || 10, // Lower priority than incremental updates
    ...options,
  });

  logger.info("Full repository analysis job added", {
    jobId: job.id,
    repositoryId: data.repositoryId,
    repoFullName: data.repoFullName,
  });

  return job;
}

/**
 * Get job status
 * @param {string} queueName - Queue name
 * @param {string} jobId - Job ID
 * @returns {Promise<object>}
 */
export async function getJobStatus(queueName, jobId) {
  const queue = getQueue(queueName);
  const job = await queue.getJob(jobId);

  if (!job) {
    return null;
  }

  const state = await job.getState();

  return {
    id: job.id,
    name: job.name,
    state,
    progress: job.progress,
    data: job.data,
    returnvalue: job.returnvalue,
    failedReason: job.failedReason,
    attemptsMade: job.attemptsMade,
    timestamp: job.timestamp,
    finishedOn: job.finishedOn,
    processedOn: job.processedOn,
  };
}

/**
 * Get queue statistics
 * @param {string} queueName - Queue name
 * @returns {Promise<object>}
 */
export async function getQueueStats(queueName) {
  const queue = getQueue(queueName);

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return {
    queueName,
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + delayed,
  };
}

/**
 * Pause a queue
 * @param {string} queueName - Queue name
 */
export async function pauseQueue(queueName) {
  const queue = getQueue(queueName);
  await queue.pause();
  logger.info("Queue paused", { queueName });
}

/**
 * Resume a queue
 * @param {string} queueName - Queue name
 */
export async function resumeQueue(queueName) {
  const queue = getQueue(queueName);
  await queue.resume();
  logger.info("Queue resumed", { queueName });
}

/**
 * Add a documentation generation job to the queue
 * @param {object} data - Job data
 * @param {string} data.repositoryId - Repository ID
 * @param {string} data.repoFullName - Full repository name
 * @param {string} data.userId - User ID
 * @param {string} data.defaultBranch - Default branch name
 * @param {string[]} data.types - Types of documentation to generate (readme, architecture, function, class, module)
 * @param {object} options - Job options
 * @returns {Promise<Job>}
 */
export async function addDocumentationGenerationJob(data, options = {}) {
  const queue = getQueue(QUEUE_NAMES.DOCUMENTATION_ANALYSIS);

  const jobId = `docs-${data.repositoryId}-${Date.now()}`;

  const job = await queue.add(JOB_TYPES.GENERATE_DOCUMENTATION, data, {
    jobId,
    priority: options.priority || 5, // Medium priority
    ...options,
  });

  logger.info("Documentation generation job added", {
    jobId: job.id,
    repositoryId: data.repositoryId,
    repoFullName: data.repoFullName,
    types: data.types,
  });

  return job;
}

/**
 * Retry a failed job
 * @param {string} queueName - Queue name
 * @param {string} jobId - Job ID
 */
export async function retryJob(queueName, jobId) {
  const queue = getQueue(queueName);
  const job = await queue.getJob(jobId);

  if (job) {
    await job.retry();
    logger.info("Job retried", { queueName, jobId });
  }
}

/**
 * Clean up old jobs
 * @param {string} queueName - Queue name
 * @param {number} gracePeriod - Grace period in milliseconds
 */
export async function cleanOldJobs(queueName, gracePeriod = 24 * 3600 * 1000) {
  const queue = getQueue(queueName);

  const cleaned = await queue.clean(gracePeriod, 1000, "completed");
  logger.info("Cleaned old jobs", { queueName, cleanedCount: cleaned.length });

  return cleaned.length;
}

/**
 * Close all queue connections gracefully
 */
export async function closeQueues() {
  const closePromises = [];

  for (const [name, queue] of Object.entries(queues)) {
    closePromises.push(
      queue.close().then(() => {
        logger.info("Queue closed", { queueName: name });
      })
    );
  }

  for (const [name, events] of Object.entries(queueEvents)) {
    closePromises.push(
      events.close().then(() => {
        logger.info("Queue events closed", { queueName: name });
      })
    );
  }

  await Promise.all(closePromises);
}

export default {
  QUEUE_NAMES,
  JOB_TYPES,
  getQueue,
  getQueueEvents,
  addDocumentationJob,
  addFullAnalysisJob,
  addDocumentationGenerationJob,
  getJobStatus,
  getQueueStats,
  pauseQueue,
  resumeQueue,
  retryJob,
  cleanOldJobs,
  closeQueues,
};
