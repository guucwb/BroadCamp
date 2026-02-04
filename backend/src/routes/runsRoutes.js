// backend/src/routes/runsRoutes.js
const express = require('express');
const router = express.Router();

const runRepo = require('../repositories/runRepository');
const journeyRepo = require('../repositories/journeyRepository');
const { validate } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * GET /api/runs
 * List all runs
 */
router.get('/', asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const filters = {};

  if (req.query.status) {
    filters.status = req.query.status;
  }
  if (req.query.journeyId) {
    filters.journeyId = req.query.journeyId;
  }

  const runs = await runRepo.findAll(userId, filters);

  res.json(runs);
}));

/**
 * GET /api/runs/:id
 * Get run by ID with contacts
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const includeContacts = req.query.includeContacts === 'true';

  const run = await runRepo.findById(req.params.id, userId, includeContacts);

  if (!run) {
    return res.status(404).json({ error: 'Run not found' });
  }

  res.json(run);
}));

/**
 * POST /api/runs
 * Create a new run
 */
router.post('/', validate('createRun'), asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const { flowId } = req.body;

  // Get journey
  const journey = await journeyRepo.findById(flowId, userId);

  if (!journey) {
    return res.status(404).json({ error: 'Journey not found' });
  }

  // Extract audience to calculate total
  const audNode = journey.nodes.find(n => n.type === 'audience');
  const total = Array.isArray(audNode?.data?.allRows)
    ? audNode.data.allRows.length
    : 0;

  // Create run
  const run = await runRepo.create(
    {
      flowId: journey.id,
      flowName: journey.name,
      status: 'queued',
      total,
      journeyId: journey.id
    },
    userId
  );

  logger.info('Run created via API', {
    runId: run.id,
    flowId,
    total,
    userId
  });

  res.json(run);
}));

/**
 * POST /api/runs/:id/stop
 * Stop a running run
 */
router.post('/:id/stop', asyncHandler(async (req, res) => {
  const userId = req.user?.id;

  const run = await runRepo.findById(req.params.id, userId);

  if (!run) {
    return res.status(404).json({ error: 'Run not found' });
  }

  // Update run status to stopped
  await runRepo.update(req.params.id, {
    status: 'stopped',
    endedAt: new Date()
  });

  logger.info('Run stopped', {
    runId: req.params.id,
    userId
  });

  res.json({ ok: true });
}));

/**
 * GET /api/runs/:id/export
 * Export run as CSV
 */
router.get('/:id/export', asyncHandler(async (req, res) => {
  const userId = req.user?.id;

  const run = await runRepo.findById(req.params.id, userId, true); // Include contacts

  if (!run) {
    return res.status(404).send('Run not found');
  }

  // Build CSV
  const headers = ['runId', 'phone', 'state', 'cursor', 'createdAt'];
  const rows = [headers.join(',')];

  if (run.contacts && run.contacts.length > 0) {
    run.contacts.forEach(contact => {
      rows.push([
        run.id,
        contact.phone,
        contact.state,
        contact.cursor || '',
        contact.createdAt
      ].join(','));
    });
  }

  const csv = rows.join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="run_${run.id}.csv"`);
  res.send(csv);
}));

module.exports = router;
