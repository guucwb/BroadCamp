const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method
    });
    res.status(429).json({
      error: 'Too many requests',
      message: 'Please try again later',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  },
  skip: (req) => {
    // Skip rate limiting for health check
    return req.path === '/health';
  }
});

/**
 * Webhook rate limiter
 * More permissive for Twilio webhooks
 * 100 requests per minute
 */
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Twilio can send many webhooks
  message: 'Webhook rate limit exceeded',
  handler: (req, res) => {
    logger.error('Webhook rate limit exceeded', {
      ip: req.ip,
      from: req.body.From
    });
    res.status(429).send('Rate limit exceeded');
  }
});

/**
 * Strict rate limiter for expensive operations
 * 10 requests per 15 minutes
 */
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Only 10 requests per 15 minutes
  message: 'Rate limit exceeded for this operation',
  handler: (req, res) => {
    logger.warn('Strict rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userId: req.user?.id
    });
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'This operation is rate-limited. Please try again in 15 minutes.'
    });
  }
});

/**
 * Auth rate limiter
 * Prevents brute force attacks on login
 * 5 attempts per 15 minutes
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true, // Don't count successful logins
  handler: (req, res) => {
    logger.error('Authentication rate limit exceeded', {
      ip: req.ip,
      email: req.body.email
    });
    res.status(429).json({
      error: 'Too many login attempts',
      message: 'Account temporarily locked. Please try again in 15 minutes.'
    });
  }
});

/**
 * Create custom rate limiter
 * @param {Object} options - Rate limit options
 * @returns {Function} Rate limiter middleware
 */
function createRateLimiter(options = {}) {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Custom rate limit exceeded', {
        ip: req.ip,
        path: req.path
      });
      res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
      });
    }
  };

  return rateLimit({ ...defaultOptions, ...options });
}

module.exports = {
  apiLimiter,
  webhookLimiter,
  strictLimiter,
  authLimiter,
  createRateLimiter
};
