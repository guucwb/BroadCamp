// backend/src/routes/journeysRoutes.js
const express = require('express');
const router = express.Router();

const journeyRepo = require('../repositories/journeyRepository');
const runRepo = require('../repositories/runRepository');
const { validate } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { flowQueue } = require('../queues/flowQueue');

/**
 * GET /api/journeys
 * List all journeys
 */
router.get('/', asyncHandler(async (req, res) => {
  const userId = req.user?.id; // Optional auth
  const filters = {};

  if (req.query.status) {
    filters.status = req.query.status;
  }

  const journeys = await journeyRepo.findAll(userId, filters);

  res.json(journeys);
}));

/**
 * GET /api/journeys/:id
 * Get journey by ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const journey = await journeyRepo.findById(req.params.id, userId);

  if (!journey) {
    return res.status(404).json({ error: 'Journey not found' });
  }

  res.json(journey);
}));

/**
 * POST /api/journeys
 * Create a new journey
 */
router.post('/', validate('createJourney'), asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const journey = await journeyRepo.create(req.body, userId);

  res.json(journey);
}));

/**
 * PUT /api/journeys/:id
 * Update journey
 */
router.put('/:id', validate('updateJourney'), asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const journey = await journeyRepo.update(req.params.id, req.body, userId);

  res.json(journey);
}));

/**
 * DELETE /api/journeys/:id
 * Delete journey
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  await journeyRepo.delete(req.params.id, userId);

  res.json({ ok: true });
}));

/**
 * POST /api/journeys/:id/duplicate
 * Duplicate journey
 */
router.post('/:id/duplicate', asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const duplicated = await journeyRepo.duplicate(req.params.id, userId);

  res.json(duplicated);
}));

/**
 * POST /api/journeys/:id/launch
 * Launch a journey (create and start a run)
 */
router.post('/:id/launch', asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const journey = await journeyRepo.findById(req.params.id, userId);

  if (!journey) {
    return res.status(404).json({ error: 'Journey not found' });
  }

  // Get audience from request body or from journey's audience node
  let audience = Array.isArray(req.body?.audience) ? req.body.audience : [];

  // Fallback: extract from audience node
  if (audience.length === 0) {
    const audNode = journey.nodes.find(n => n.type === 'audience');

    if (!audNode) {
      return res.status(400).json({ error: 'No audience node found in journey' });
    }

    const phoneKey = audNode.data?.phoneKey;
    const rows = audNode.data?.allRows || audNode.data?.rows || [];

    if (!phoneKey || rows.length === 0) {
      return res.status(400).json({
        error: 'Audience node must have phoneKey and rows'
      });
    }

    // Map rows to audience format
    const mapping = audNode.data?.mapping || {};
    audience = rows.map(row => {
      const vars = {};
      Object.entries(mapping).forEach(([col, variable]) => {
        vars[variable] = row[col];
      });
      return {
        phone: row[phoneKey],
        ...vars
      };
    });
  }

  if (audience.length === 0) {
    return res.status(400).json({ error: 'No audience provided' });
  }

  // Create run
  const runId = `run_${Date.now()}${Math.floor(Math.random() * 9999)}`;
  const run = await runRepo.create(
    {
      id: runId,
      flowId: journey.id,
      flowName: journey.name,
      status: 'queued',
      total: audience.length,
      journeyId: journey.id
    },
    userId
  );

  // Create contacts in database
  const contacts = audience.map(aud => ({
    phone: aud.phone,
    vars: aud,
    state: 'active'
  }));

  await runRepo.createContacts(runId, contacts);

  // Add job to queue
  await flowQueue.add('bootstrap', {
    runId,
    journey,
    audience
  });

  logger.info('Journey launched', {
    journeyId: journey.id,
    runId,
    contacts: audience.length,
    userId
  });

  res.json({ ok: true, runId });
}));

module.exports = router;
