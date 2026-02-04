#!/usr/bin/env node

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const { Worker } = require('bullmq');
const { connection, messageQueue } = require('../queues/messageQueue');
const twilioService = require('../services/twilioService');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * Message Worker
 * Processes messages in parallel (concurrency=10)
 * with automatic retry and rate limiting
 */
const messageWorker = new Worker(
  'messages',
  async (job) => {
    const { to, body, contentSid, variables, channel, runId, contactId } = job.data;

    logger.info('Processing message job', {
      jobId: job.id,
      to,
      channel,
      runId,
      attempt: job.attemptsMade + 1
    });

    try {
      let result;

      // Check DRY_RUN mode
      if (process.env.DRY_RUN === 'true') {
        logger.info('[DRY_RUN] Message would be sent', {
          to,
          body: body || `Template: ${contentSid}`,
          channel
        });

        result = {
          sid: `dry_run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          status: 'sent'
        };
      } else {
        // Send actual message via Twilio
        if (channel === 'whatsapp' || !channel) {
          if (contentSid) {
            // Template message
            result = await twilioService.sendWhatsApp({
              to,
              contentSid,
              variables
            });
          } else {
            // Text message
            result = await twilioService.sendWhatsApp({
              to,
              body
            });
          }
        } else if (channel === 'sms') {
          // SMS message (Twilio doesn't have sendSMS in twilioService, uses sendWhatsApp)
          const client = require('twilio')(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
          );

          result = await client.messages.create({
            to,
            from: process.env.TWILIO_SMS_NUMBER,
            body
          });
        }
      }

      // Log message to database
      await prisma.messageLog.create({
        data: {
          runId,
          contactId,
          phone: to,
          channel: channel || 'whatsapp',
          direction: 'outbound',
          body,
          contentSid,
          variables: variables || null,
          status: result.status,
          twilioSid: result.sid
        }
      });

      logger.info('Message sent successfully', {
        jobId: job.id,
        sid: result.sid,
        to,
        status: result.status
      });

      return {
        success: true,
        sid: result.sid,
        status: result.status
      };
    } catch (error) {
      logger.error('Message send failed', {
        jobId: job.id,
        to,
        error: error.message,
        code: error.code,
        attempt: job.attemptsMade + 1,
        maxAttempts: job.opts.attempts
      });

      // Log failure to database
      await prisma.messageLog.create({
        data: {
          runId,
          contactId,
          phone: to,
          channel: channel || 'whatsapp',
          direction: 'outbound',
          body,
          contentSid,
          status: 'failed',
          error: error.message
        }
      });

      // Re-throw to trigger retry
      throw error;
    }
  },
  {
    connection,
    concurrency: 10, // Process 10 messages in parallel
    limiter: {
      max: 50, // Max 50 messages
      duration: 1000 // per second (respects Twilio rate limits)
    }
  }
);

// Worker event handlers
messageWorker.on('completed', (job, result) => {
  logger.info('Message job completed', {
    jobId: job.id,
    sid: result.sid,
    duration: Date.now() - job.timestamp
  });
});

messageWorker.on('failed', (job, err) => {
  logger.error('Message job failed permanently', {
    jobId: job.id,
    error: err.message,
    attempts: job.attemptsMade,
    data: {
      to: job.data.to,
      channel: job.data.channel
    }
  });
});

messageWorker.on('error', (err) => {
  logger.error('Message worker error', { error: err.message });
});

messageWorker.on('active', (job) => {
  logger.debug('Message job started', { jobId: job.id, to: job.data.to });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down message worker gracefully');
  await messageWorker.close();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down message worker gracefully');
  await messageWorker.close();
  await prisma.$disconnect();
  process.exit(0);
});

logger.info('Message worker started', {
  concurrency: 10,
  rateLimit: '50 messages/second'
});

console.log('✅ Message Worker running (concurrency=10, rate=50/s)');
console.log('📊 Processing jobs from "messages" queue');
console.log('🔄 Press Ctrl+C to stop\n');

module.exports = messageWorker;
