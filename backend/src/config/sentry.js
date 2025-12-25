import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

/**
 * Initialize Sentry for error tracking
 */
export const initSentry = (app) => {
  // Only initialize if DSN is provided
  if (!process.env.SENTRY_DSN) {
    console.log('⚠️  Sentry DSN not configured. Error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    integrations: [
      // HTTP integration for request details
      new Sentry.Integrations.Http({ tracing: true }),
      // Express integration
      new Sentry.Integrations.Express({ app }),
      // Profiling integration
      nodeProfilingIntegration(),
    ],
    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Profiling
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Enhanced context
    beforeSend(event, hint) {
      // Add custom context
      if (hint.originalException) {
        event.contexts = event.contexts || {};
        event.contexts.runtime = {
          name: 'node',
          version: process.version,
        };
      }
      return event;
    },
  });

  console.log('✅ Sentry error tracking initialized');
};

/**
 * Sentry request handler middleware
 * Must be placed before all routes
 */
export const sentryRequestHandler = () => {
  if (!process.env.SENTRY_DSN) {
    return (req, res, next) => next();
  }
  return Sentry.Handlers.requestHandler();
};

/**
 * Sentry tracing middleware
 * Must be placed before all routes
 */
export const sentryTracingHandler = () => {
  if (!process.env.SENTRY_DSN) {
    return (req, res, next) => next();
  }
  return Sentry.Handlers.tracingHandler();
};

/**
 * Sentry error handler middleware
 * Must be placed after all routes but before other error handlers
 */
export const sentryErrorHandler = () => {
  if (!process.env.SENTRY_DSN) {
    return (err, req, res, next) => next(err);
  }
  return Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Capture all errors
      return true;
    },
  });
};

/**
 * Manually capture an exception
 */
export const captureException = (error, context = {}) => {
  if (!process.env.SENTRY_DSN) {
    console.error('Error (Sentry not configured):', error);
    return;
  }

  Sentry.captureException(error, {
    contexts: context,
  });
};

/**
 * Add breadcrumb for tracking user actions
 */
export const addBreadcrumb = (message, category, level = 'info', data = {}) => {
  if (!process.env.SENTRY_DSN) {
    return;
  }

  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
};

/**
 * Set user context for better error tracking
 */
export const setUserContext = (user) => {
  if (!process.env.SENTRY_DSN) {
    return;
  }

  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
  });
};

export default Sentry;
