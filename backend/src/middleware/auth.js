const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_ME_IN_PRODUCTION_MINIMUM_32_CHARS';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Middleware to authenticate JWT tokens
 * Adds req.user if token is valid
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    logger.warn('Authentication attempt without token', {
      ip: req.ip,
      path: req.path,
      method: req.method
    });
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      logger.warn('Invalid token attempt', {
        ip: req.ip,
        path: req.path,
        error: err.message
      });
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    req.user = user;
    logger.debug('User authenticated', { userId: user.id, email: user.email });
    next();
  });
}

/**
 * Optional authentication - doesn't fail if no token
 * Just adds req.user if valid token exists
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (!err) {
      req.user = user;
    }
    next();
  });
}

/**
 * Generate JWT token for user
 * @param {Object} user - User object with id and email
 * @returns {string} JWT token
 */
function generateToken(user) {
  if (!user.id || !user.email) {
    throw new Error('User must have id and email');
  }

  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role || 'user'
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Verify token without middleware
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded user or null
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    logger.warn('Token verification failed', { error: err.message });
    return null;
  }
}

module.exports = {
  authenticateToken,
  optionalAuth,
  generateToken,
  verifyToken
};
