const { Queue } = require('bullmq');
const IORedis = require('ioredis');
const logger = require('../utils/logger');

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
};

// Create Redis connection
const connection = new IORedis(redisConfig);

connection.on('error', (err) => {
  logger.error('Redis connection error', { error: err.message });
});

connection.on('connect', () => {
  logger.info('Redis connected successfully', {
    host: redisConfig.host,
    port: redisConfig.port
  });
});

connection.on('ready', () => {
  logger.info('Redis ready to accept commands');
});

/**
 * Queue for individual message sending
 * Processes messages in parallel with rate limiting
 */
const messageQueue = new Queue('messages', {
  connection,
  defaultJobOptions: {
    attempts: 3, // Retry up to 3 times
    backoff: {
      type: 'exponential',
      delay: 2000 // Start with 2s, then 4s, then 8s
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
      age: 3600 // Remove after 1 hour
    },
    removeOnFail: {
      count: 1000, // Keep last 1000 failed jobs
      age: 86400 // Remove after 24 hours
    }
  }
});

/**
 * Queue for flow/journey execution
 * Processes runs and manages contacts through journey nodes
 */
const flowQueue = new Queue('flows', {
  connection,
  defaultJobOptions: {
    attempts: 2, // Retry once
    backoff: {
      type: 'fixed',
      delay: 5000 // Wait 5s before retry
    },
    removeOnComplete: {
      count: 50,
      age: 3600
    },
    removeOnFail: {
      count: 100,
      age: 86400
    }
  }
});

// Queue events for monitoring
messageQueue.on('error', (err) => {
  logger.error('Message queue error', { error: err.message });
});

flowQueue.on('error', (err) => {
  logger.error('Flow queue error', { error: err.message });
});

// Log queue metrics periodically
setInterval(async () => {
  try {
    const msgCounts = await messageQueue.getJobCounts();
    const flowCounts = await flowQueue.getJobCounts();

    if (msgCounts.waiting > 0 || msgCounts.active > 0) {
      logger.info('Message queue metrics', msgCounts);
    }

    if (flowCounts.waiting > 0 || flowCounts.active > 0) {
      logger.info('Flow queue metrics', flowCounts);
    }
  } catch (error) {
    logger.error('Failed to get queue metrics', { error: error.message });
  }
}, 30000); // Every 30 seconds

module.exports = {
  messageQueue,
  flowQueue,
  connection
};
