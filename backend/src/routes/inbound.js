// backend/src/routes/inbound.js
const express = require('express');
const twilio = require('twilio');

const { validate } = require('../middleware/validation');
const logger = require('../utils/logger');
const runRepo = require('../repositories/runRepository');

const router = express.Router();
router.use(express.urlencoded({ extended: false })); // Twilio envia x-www-form-urlencoded
router.use(express.json());

/**
 * Twilio webhook signature validation middleware
 * Ensures webhooks actually come from Twilio
 */
function validateTwilioSignature(req, res, next) {
  const twilioSignature = req.headers['x-twilio-signature'];
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!twilioSignature) {
    logger.warn('Webhook received without Twilio signature', {
      ip: req.ip,
      from: req.body.From
    });
    return res.status(400).send('Missing signature');
  }

  // Construct the full URL
  const protocol = req.protocol;
  const host = req.get('host');
  const url = `${protocol}://${host}${req.originalUrl}`;

  // Validate signature
  const isValid = twilio.validateRequest(
    authToken,
    twilioSignature,
    url,
    req.body
  );

  if (!isValid) {
    logger.error('Invalid Twilio webhook signature', {
      ip: req.ip,
      url,
      from: req.body.From
    });
    return res.status(403).send('Invalid signature');
  }

  logger.debug('Twilio signature validated successfully');
  next();
}

router.post('/inbound', validateTwilioSignature, validate('inboundWebhook'), async (req, res) => {
  try {
    const body = req.body || {};

    // Twilio params:
    // From: 'whatsapp:+55...' ou '+55...' (SMS)
    // Body: texto digitado
    // ButtonText / ButtonPayload (interativos)
    const rawFrom = body.From || '';
    const from = String(rawFrom).replace(/^whatsapp:/i, '');
    const text = body.Body || '';
    const payload = body.ButtonPayload || body.ButtonText || '';

    logger.info('Inbound message received', {
      from,
      text: text.substring(0, 100), // Log first 100 chars only
      hasPayload: !!payload,
      messageSid: body.MessageSid
    });

    // Find all active runs
    const runs = await runRepo.findAll(null, { status: 'running' });
    let contactFound = false;

    // Search for waiting contact across all runs
    for (const run of runs) {
      // Get contacts for this run
      const runWithContacts = await runRepo.findById(run.id, null, true);

      if (!runWithContacts.contacts) continue;

      for (const contact of runWithContacts.contacts) {
        if (contact.phone === from && contact.state === 'waiting') {
          // Update contact with inbound message
          await runRepo.updateContact(contact.id, {
            lastInbound: {
              at: new Date().toISOString(),
              text,
              payload,
              raw: body
            },
            state: 'waiting-inbound',
            history: [
              ...(contact.history || []),
              {
                ts: new Date().toISOString(),
                type: 'inbound',
                text,
                payload
              }
            ]
          });

          contactFound = true;

          logger.info('Contact updated with inbound message', {
            runId: run.id,
            contactId: contact.id,
            phone: from,
            newState: 'waiting-inbound'
          });

          break;
        }
      }

      if (contactFound) break;
    }

    if (!contactFound) {
      logger.warn('Inbound message for contact not in waiting state', {
        from,
        text: text.substring(0, 50)
      });
    }

    // Respond to Twilio
    res.status(200).send('OK');
  } catch (e) {
    logger.error('Inbound webhook error', {
      error: e.message,
      stack: e.stack,
      from: req.body.From
    });
    res.status(500).json({ error: 'inbound error' });
  }
});

module.exports = router;
