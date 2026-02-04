// backend/src/routes/devProxy.js
const express = require('express');
const router = express.Router();

router.post('/proxy', async (req, res) => {
  try {
    const { url, method = 'GET', headers = {}, body } = req.body || {};
    const opts = { method, headers: headers || {} };
    if (!['GET', 'HEAD'].includes(method.toUpperCase()) && body !== undefined) {
      opts.body = typeof body === 'string' ? body : JSON.stringify(body);
      if (!opts.headers['content-type']) opts.headers['content-type'] = 'application/json';
    }
    const resp = await fetch(url, opts);
    const text = await resp.text();
    const ct = resp.headers.get('content-type') || '';
    let data = text;
    if (ct.includes('application/json')) {
      try { data = JSON.parse(text); } catch {}
    }
    res.json({
      ok: resp.ok,
      status: resp.status,
      headers: Object.fromEntries(resp.headers.entries()),
      data
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || String(e) });
  }
});

module.exports = router;
