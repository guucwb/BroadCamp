const logger = require('../utils/logger');

/**
 * Global error handler middleware
 * Must be added LAST in the middleware chain
 */
function errorHandler(err, req, res, next) {
  // Log the error
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id,
    body: req.body
  });

  // Determine if we should send detailed error info
  const isDev = process.env.NODE_ENV !== 'production';

  // Default error response
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = null;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    status = 400;
    message = 'Validation failed';
    details = err.details;
  } else if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    status = 401;
    message = 'Unauthorized';
  } else if (err.name === 'ForbiddenError') {
    status = 403;
    message = 'Forbidden';
  } else if (err.name === 'NotFoundError') {
    status = 404;
    message = 'Resource not found';
  } else if (err.name === 'ConflictError') {
    status = 409;
    message = 'Resource conflict';
  } else if (err.name === 'TooManyRequestsError') {
    status = 429;
    message = 'Too many requests';
  }

  // Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    switch (err.code) {
      case 'P2002':
        status = 409;
        message = 'Duplicate entry';
        details = `${err.meta?.target?.join(', ')} already exists`;
        break;
      case 'P2025':
        status = 404;
        message = 'Resource not found';
        break;
      case 'P2003':
        status = 400;
        message = 'Foreign key constraint failed';
        break;
      default:
        status = 500;
        message = isDev ? err.message : 'Database error';
    }
  }

  // Twilio errors
  if (err.code && err.code >= 20000 && err.code < 90000) {
    status = 502; // Bad Gateway - external service error
    message = isDev ? `Twilio error: ${err.message}` : 'Messaging service error';
    logger.error('Twilio API error', {
      code: err.code,
      message: err.message,
      moreInfo: err.moreInfo
    });
  }

  // OpenAI errors
  if (err.name === 'OpenAIError' || err.message?.includes('OpenAI')) {
    status = 502;
    message = isDev ? err.message : 'AI service error';
  }

  // Build response
  const response = {
    error: message
  };

  if (details) {
    response.details = details;
  }

  if (isDev && status === 500) {
    response.stack = err.stack;
    response.rawError = err.message;
  }

  res.status(status).json(response);
}

/**
 * 404 handler for routes that don't exist
 */
function notFoundHandler(req, res) {
  logger.warn('404 Not Found', {
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`
  });
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 * @param {Function} fn - Async function
 * @returns {Function} Wrapped function
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler
};
