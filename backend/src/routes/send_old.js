// backend/src/routes/send.js
const express = require('express');
const router = express.Router();
const { sendWhatsApp } = require('../services/twilioService'); // ← caminho único

router.use((req, _res, next) => { console.log('[sendRoutes] hit', req.path); next(); });

// TEMPLATE (Content API com botões)
router.post('/wa-template', async (req, res) => {
  try {
    const to         = req.body?.to == null ? req.body?.to : String(req.body.to);
    const contentSid = req.body?.contentSid ? String(req.body.contentSid) : undefined;
    const variables  = req.body?.variables || {};
    const from       = req.body?.from;

    console.log('[REQ BODY]', { to, contentSid, variables });

    if (!to || !contentSid) return res.status(400).json({ error: 'to e contentSid são obrigatórios' });

    const resp = await sendWhatsApp({ to, contentSid, variables, from });
    return res.json({ sid: resp.sid, status: resp.status, contentSid: resp.contentSid || null });
  } catch (err) {
    console.error('[API /wa-template FAIL]', err);
    return res.status(500).json({ error: err.message, code: err.code, moreInfo: err.moreInfo });
  }
});

// Texto simples (sanity)
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

module.exports = router;