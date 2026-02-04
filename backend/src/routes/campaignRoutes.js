// backend/src/routes/campaignRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const Papa = require('papaparse');
const fs = require('fs').promises;
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { messageQueue } = require('../queues/messageQueue');
const { validate } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const prisma = new PrismaClient();
const upload = multer({ dest: 'uploads/' });

/**
 * POST /api/campaign/upload
 * Upload CSV file and parse to JSON
 */
router.post('/upload', upload.single('file'), asyncHandler(async (req, res) => {
  const filePath = req.file?.path;
  if (!filePath) {
    return res.status(400).json({ error: 'File not received' });
  }

  try {
    const fileContent = await fs.readFile(filePath, 'utf8');
    const parsed = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true
    });

    await fs.unlink(filePath); // Remove temp file

    logger.info('CSV uploaded and parsed', {
      rows: parsed.data.length,
      columns: Object.keys(parsed.data[0] || {}).length
    });

    res.json({ data: parsed.data });
  } catch (error) {
    logger.error('Error processing CSV upload', {
      error: error.message,
      filePath
    });

    // Clean up file on error
    try {
      await fs.unlink(filePath);
    } catch {}

    throw error;
  }
}));

/**
 * POST /api/campaign/send
 * Queue messages for parallel sending via BullMQ
 */
router.post('/send', validate('sendCampaign'), asyncHandler(async (req, res) => {
  const { messages } = req.body;
  const userId = req.user?.id;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages must be a non-empty array' });
  }

  // Create campaign record
  const templateSid = messages[0]?.contentSid || null;
  const channel = messages[0]?.channel || 'whatsapp';
  const recipients = messages.map(m => m.to || m.telefone || '');

  const campaign = await prisma.campaign.create({
    data: {
      name: req.body.name || `Campaign ${new Date().toISOString()}`,
      templateSid,
      channel,
      total: recipients.length,
      sent: 0,
      failed: 0,
      status: 'queued',
      userId
    }
  });

  logger.info('Campaign created', {
    campaignId: campaign.id,
    total: recipients.length,
    channel,
    userId
  });

  // Queue all messages in bulk (parallel processing)
  const jobs = messages.map((msg, index) => ({
    name: 'send-message',
    data: {
      to: msg.to || msg.telefone,
      body: msg.body,
      contentSid: msg.contentSid,
      variables: msg.variables,
      channel: msg.channel || 'whatsapp',
      campaignId: campaign.id
    },
    opts: {
      jobId: `${campaign.id}_${index}`,
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 1000 }
    }
  }));

  await messageQueue.addBulk(jobs);

  logger.info('Messages queued', {
    campaignId: campaign.id,
    total: jobs.length
  });

  // Return immediately (don't wait for sends)
  res.json({
    success: true,
    campaignId: campaign.id,
    total: messages.length,
    status: 'queued'
  });
}));

/**
 * GET /api/campaign/history
 * Get campaign history from database
 */
router.get('/history', asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const where = userId ? { userId } : {};

  const campaigns = await prisma.campaign.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100 // Limit to last 100 campaigns
  });

  logger.info('Campaign history fetched', {
    count: campaigns.length,
    userId
  });

  res.json({ campaigns });
}));

/**
 * GET /api/campaign/:id
 * Get specific campaign details
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const where = { id: req.params.id };
  if (userId) where.userId = userId;

  const campaign = await prisma.campaign.findFirst({ where });

  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  res.json(campaign);
}));

/**
 * DELETE /api/campaign/:id
 * Delete campaign
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const where = { id: req.params.id };
  if (userId) where.userId = userId;

  const campaign = await prisma.campaign.findFirst({ where });

  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  await prisma.campaign.delete({ where: { id: req.params.id } });

  logger.info('Campaign deleted', {
    campaignId: req.params.id,
    userId
  });

  res.json({ ok: true });
}));

module.exports = router;

