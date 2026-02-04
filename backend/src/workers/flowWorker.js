// backend/src/workers/flowWorker.js
require('dotenv').config();
const { Worker } = require('bullmq');
const { connection } = require('../queues/messageQueue');
const { messageQueue } = require('../queues/messageQueue');
const runRepo = require('../repositories/runRepository');
const journeyRepo = require('../repositories/journeyRepository');
const logger = require('../utils/logger');

/**
 * Flow Worker - BullMQ version
 * Processes journey runs by moving contacts through nodes
 * Queues messages instead of sending directly
 */

// Helper: Replace {{variable}} placeholders
function replaceVars(text, vars) {
  return String(text || '').replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] ?? ''));
}

// Helper: Sleep utility
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Helper: Extract edge conditions from wait node
function edgeCondsFromWait(nodeId, edges) {
  const outs = edges.filter(e => e.source === nodeId);
  return outs.map(e => ({
    edgeId: e.id,
    target: e.target,
    label: e.label || '',
    type: e.data?.conditionType || 'keywords',
    value: e.data?.value || '',
    isFallback: !!e.data?.isFallback
  }));
}

// Helper: Match inbound reply to edge conditions
function matchReply(conds, inboundText, inboundPayload) {
  const text = String(inboundText || '').trim();
  const payload = String(inboundPayload || '').trim();

  // 1) Payload match
  const byPayload = conds.find(c => c.type === 'payload' && c.value && payload &&
    c.value.split('|').map(s => s.trim()).filter(Boolean).some(p => p === payload));
  if (byPayload) return byPayload;

  // 2) Regex match
  const byRegex = conds.find(c => {
    if (c.type !== 'regex' || !c.value) return false;
    const m = String(c.value).match(/^\/(.+)\/([gimsuy]*)$/);
    try {
      const rx = m ? new RegExp(m[1], m[2]) : new RegExp(c.value);
      return rx.test(text);
    } catch { return false; }
  });
  if (byRegex) return byRegex;

  // 3) Keywords match
  const byKw = conds.find(c => c.type === 'keywords' && c.value && text &&
    c.value.toLowerCase().split('|').map(s => s.trim()).filter(Boolean)
      .some(k => text.toLowerCase().includes(k)));
  if (byKw) return byKw;

  // 4) Fallback
  const fb = conds.find(c => c.isFallback);
  if (fb) return fb;

  return null;
}

// Process a single contact through journey nodes
async function processContact(journey, run, contact) {
  const nodes = journey.nodes || [];
  const edges = journey.edges || [];

  const nextOf = (nodeId) => edges.find(ed => ed.source === nodeId)?.target || null;

  // Initialize cursor to audience node if not set
  if (!contact.cursor) {
    const aud = nodes.find(n => n.type === 'audience');
    contact.cursor = aud?.id || null;
    contact.state = 'active';
  }

  // Loop through nodes until we need to wait
  let safety = 0;
  while (contact.state === 'active' && contact.cursor && safety < 100) {
    safety++;
    const node = nodes.find(n => n.id === contact.cursor);
    if (!node) {
      contact.state = 'done';
      break;
    }

    // Add history entry
    contact.history = contact.history || [];
    contact.history.push({
      ts: new Date().toISOString(),
      type: 'visit',
      nodeId: node.id,
      nodeType: node.type
    });

    // Handle different node types
    if (node.type === 'audience') {
      // Just pass through
    }

    if (node.type === 'message') {
      const md = node.data || {};
      const body = replaceVars(md.text || '', contact.vars || {});
      const channel = (md.channel || 'whatsapp').toLowerCase();

      // Queue message instead of sending directly
      await messageQueue.add('send-message', {
        to: contact.phone,
        body,
        channel,
        runId: run.id,
        contactId: contact.id
      });

      contact.history.push({
        ts: new Date().toISOString(),
        type: 'outbound',
        channel,
        body
      });

      logger.info('Message queued', {
        runId: run.id,
        contactPhone: contact.phone,
        channel,
        bodyLength: body.length
      });
    }

    if (node.type === 'api') {
      // TODO: Implement API call + variable mapping
      logger.debug('API node skipped (not implemented)', {
        nodeId: node.id,
        runId: run.id
      });
    }

    if (node.type === 'delay') {
      const md = node.data || {};
      if (md.mode === 'until' && md.until) {
        const wait = Math.max(0, new Date(md.until).getTime() - Date.now());
        if (wait > 0) {
          logger.info('Delay until timestamp', {
            runId: run.id,
            contactPhone: contact.phone,
            until: md.until,
            waitMs: wait
          });
          await sleep(wait);
        }
      } else {
        const secs = Number(md.seconds || 0);
        if (secs > 0) {
          logger.info('Delay for seconds', {
            runId: run.id,
            contactPhone: contact.phone,
            seconds: secs
          });
          await sleep(secs * 1000);
        }
      }
    }

    if (node.type === 'wait') {
      // Stop here and wait for inbound
      contact.state = 'waiting';
      contact.wait = {
        nodeId: node.id,
        conds: edgeCondsFromWait(node.id, edges)
      };
      logger.info('Contact waiting for inbound', {
        runId: run.id,
        contactPhone: contact.phone,
        nodeId: node.id,
        conditions: contact.wait.conds.length
      });
      break;
    }

    if (node.type === 'end') {
      contact.state = 'done';
      logger.info('Contact reached end node', {
        runId: run.id,
        contactPhone: contact.phone
      });
      break;
    }

    // Move to next node
    const nxt = nextOf(node.id);
    if (!nxt) {
      contact.state = 'done';
      logger.info('Contact done (no next node)', {
        runId: run.id,
        contactPhone: contact.phone
      });
      break;
    }
    contact.cursor = nxt;
  }

  if (safety >= 100) {
    logger.error('Contact processing safety limit reached', {
      runId: run.id,
      contactPhone: contact.phone,
      cursor: contact.cursor
    });
    contact.state = 'done';
  }
}

// Resume contact if inbound message received
async function resumeIfInbound(journey, run, contact) {
  if (contact.state !== 'waiting-inbound') return;

  const conds = contact.wait?.conds || [];
  const inbound = contact.lastInbound || {};
  const chosen = matchReply(conds, inbound.text, inbound.payload);

  // Decide next node
  let target = null;
  if (chosen) {
    target = chosen.target;
    logger.info('Inbound matched condition', {
      runId: run.id,
      contactPhone: contact.phone,
      edgeLabel: chosen.label,
      target: chosen.target
    });
  } else {
    // No matching edge: end contact
    contact.state = 'done';
    logger.info('Inbound no match, ending contact', {
      runId: run.id,
      contactPhone: contact.phone,
      inboundText: inbound.text
    });
    return;
  }

  // Clear flags and continue
  contact.cursor = target;
  contact.state = 'active';
  delete contact.lastInbound;
  delete contact.wait;

  // Process immediately
  await processContact(journey, run, contact);
}

// Process a single run
async function processRun(runId, journeyId) {
  try {
    // Load run with contacts
    const run = await runRepo.findById(runId, null, true);
    if (!run) {
      logger.error('Run not found', { runId });
      return;
    }

    if (run.status !== 'queued' && run.status !== 'running') {
      logger.info('Run not active, skipping', {
        runId,
        status: run.status
      });
      return;
    }

    // Mark as running
    if (run.status === 'queued') {
      await runRepo.update(runId, {
        status: 'running',
        startedAt: new Date()
      });
      run.status = 'running';
      run.startedAt = new Date();
    }

    // Load journey
    const journey = await journeyRepo.findById(journeyId || run.flowId);
    if (!journey) {
      logger.error('Journey not found', {
        runId,
        journeyId: journeyId || run.flowId
      });
      await runRepo.update(runId, {
        status: 'failed',
        error: 'Journey not found',
        endedAt: new Date()
      });
      return;
    }

    logger.info('Processing run', {
      runId,
      journeyId: journey.id,
      totalContacts: run.contacts.length,
      status: run.status
    });

    // Process each contact
    for (const contact of run.contacts) {
      if (!contact) continue;

      if (contact.state === 'waiting') {
        // Still waiting for inbound
        continue;
      }

      if (contact.state === 'waiting-inbound') {
        // Resume with inbound message
        await resumeIfInbound(journey, run, contact);
        // Update contact in database
        await runRepo.updateContact(contact.id, {
          cursor: contact.cursor,
          state: contact.state,
          history: contact.history,
          wait: contact.wait || null,
          lastInbound: contact.lastInbound || null
        });
        continue;
      }

      if (contact.state === 'done') {
        // Already completed
        continue;
      }

      // Active or no state: process
      await processContact(journey, run, contact);

      // Update contact in database
      await runRepo.updateContact(contact.id, {
        cursor: contact.cursor,
        state: contact.state,
        history: contact.history,
        wait: contact.wait || null
      });
    }

    // Recalculate processed count
    const updatedRun = await runRepo.findById(runId, null, true);
    const processed = updatedRun.contacts.filter(c => c.state === 'done').length;
    const total = updatedRun.contacts.length;

    logger.info('Run progress', {
      runId,
      processed,
      total,
      percentage: Math.round((processed / total) * 100)
    });

    // Mark as done if all contacts completed
    if (processed >= total) {
      await runRepo.update(runId, {
        status: 'done',
        processed,
        total,
        endedAt: new Date()
      });
      logger.info('Run completed', {
        runId,
        journeyId: journey.id,
        total,
        processed
      });
    } else {
      // Update progress
      await runRepo.update(runId, {
        processed,
        total
      });
    }

  } catch (error) {
    logger.error('Error processing run', {
      runId,
      error: error.message,
      stack: error.stack
    });

    // Mark run as failed
    try {
      await runRepo.update(runId, {
        status: 'failed',
        error: error.message,
        endedAt: new Date()
      });
    } catch (updateError) {
      logger.error('Failed to mark run as failed', {
        runId,
        error: updateError.message
      });
    }
  }
}

// BullMQ Worker
const flowWorker = new Worker(
  'flows',
  async (job) => {
    const { runId, journeyId } = job.data;

    logger.info('Flow job started', {
      jobId: job.id,
      runId,
      journeyId
    });

    await processRun(runId, journeyId);

    logger.info('Flow job completed', {
      jobId: job.id,
      runId
    });

    return { success: true, runId };
  },
  {
    connection,
    concurrency: 2, // Process 2 runs in parallel
    limiter: {
      max: 10, // Max 10 jobs per second
      duration: 1000
    }
  }
);

// Worker event handlers
flowWorker.on('completed', (job, result) => {
  logger.info('Flow job completed', {
    jobId: job.id,
    runId: result.runId
  });
});

flowWorker.on('failed', (job, err) => {
  logger.error('Flow job failed', {
    jobId: job?.id,
    error: err.message,
    stack: err.stack
  });
});

flowWorker.on('error', (err) => {
  logger.error('Flow worker error', {
    error: err.message,
    stack: err.stack
  });
});

logger.info('Flow worker started', {
  concurrency: 2,
  queue: 'flows'
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing flow worker...');
  await flowWorker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing flow worker...');
  await flowWorker.close();
  process.exit(0);
});

module.exports = flowWorker;
