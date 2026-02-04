// backend/src/queues/flowQueue.js
const { Queue } = require('bullmq');
const { connection } = require('./messageQueue');
const logger = require('../utils/logger');

/**
 * Flow Queue - For journey/run processing
 * Re-exports the flowQueue from messageQueue for backward compatibility
 */
const { flowQueue } = require('./messageQueue');

module.exports = {
  flowQueue
};