const { Queue } = require('bullmq');
const Redis = require('ioredis');

const connection = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379
});

const broadcastQueue = new Queue('broadcastQueue', { connection });
module.exports = broadcastQueue;
