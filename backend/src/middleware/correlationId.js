import crypto from 'crypto';

/**
 * Middleware to add correlation ID to each request for tracking through logs
 */
export const correlationIdMiddleware = (req, res, next) => {
  // Use existing correlation ID from header or generate new one
  const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();

  // Add to request object
  req.correlationId = correlationId;

  // Add to response headers
  res.setHeader('X-Correlation-ID', correlationId);

  next();
};
