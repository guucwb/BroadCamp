// backend/src/routes/send.js
const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const { sendWhatsApp, sendSMS } = require('../services/twilioService');

router.use((req, _res, next) => { console.log('[sendRoutes] hit', req.path); next(); });

// TEMPLATE (Content API com botões)
router.post('/wa-template', async (req, res) => {
  try {
    // Defesa: se o front mandar "body" por engano, descartamos aqui.
    if (req.body && 'body' in req.body) delete req.body.body;

    const to         = req.body?.to == null ? req.body?.to : String(req.body.to);
    const contentSid = req.body?.contentSid ? String(req.body.contentSid) : undefined;
    const variables  = req.body?.variables || {};
    const from       = req.body?.from;

    console.log('[REQ BODY]', { to, contentSid, variables });

    if (!to || !contentSid) return res.status(400).json({ error: 'to e contentSid são obrigatórios' });

    const resp = await sendWhatsApp({ to, contentSid, variables, from });

    // Pós-checagem: buscar a mensagem para inspecionar o contentSid final
    try {
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      const full = await client.messages(resp.sid).fetch();
      console.log('[MSG FETCH]', {
        sid: full.sid,
        status: full.status,
        messagingServiceSid: full.messagingServiceSid,
        contentSid: full.contentSid || null,
        bodyPreview: full.body ? String(full.body).slice(0, 120) : null
      });
    } catch (e) {
      console.warn('[MSG FETCH WARN]', e.message);
    }

    return res.json({ sid: resp.sid, status: resp.status, contentSidCreateResp: resp.contentSid || null });
  } catch (err) {
    console.error('[API /wa-template FAIL]', err);
    return res.status(500).json({ error: err.message, code: err.code, moreInfo: err.moreInfo });
  }
});

// Texto simples (sanity check)
router.post('/wa-text', async (req, res) => {
  try {
    const to   = req.body?.to == null ? req.body?.to : String(req.body.to);
    const body = req.body?.body;
    if (!to || !body) return res.status(400).json({ error: 'to e body são obrigatórios' });
    const resp = await sendWhatsApp({ to, body });
    return res.json({ sid: resp.sid, status: resp.status });
  } catch (err) {
    console.error('[API /wa-text FAIL]', err);
    return res.status(500).json({ error: err.message, code: err.code, moreInfo: err.moreInfo });
  }
});

// SMS real (sem prefixo whatsapp:)
router.post('/sms', async (req, res) => {
  try {
    const to   = req.body?.to == null ? req.body?.to : String(req.body.to);
    const body = req.body?.body;
    const from = req.body?.from;
    if (!to || !body) return res.status(400).json({ error: 'to e body são obrigatórios' });
    const resp = await sendSMS({ to, body, from });
    return res.json({ sid: resp.sid, status: resp.status });
  } catch (err) {
    console.error('[API /sms FAIL]', err);
    return res.status(500).json({ error: err.message, code: err.code, moreInfo: err.moreInfo });
  }
});

module.exports = router;