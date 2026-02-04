// backend/src/services/twilioService.js
const twilio = require('twilio');

console.log('[twilioService] v6 loaded (único, coerção robusta e Content API)');

let _client = null;
function getClient() {
  if (_client) return _client;
  const { TWILIO_ACCOUNT_SID: accountSid, TWILIO_AUTH_TOKEN: authToken } = process.env;
  if (!accountSid || !authToken) {
    throw new Error('[twilioService] Falta TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN no ambiente.');
  }
  _client = twilio(accountSid, authToken);
  return _client;
}

const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID || null; // MG...
const defaultWaFrom       = process.env.TWILIO_WHATSAPP_NUMBER || null;      // +1415...

function normalizeWa(raw) {
  const only = String(raw ?? '').replace(/\D/g, '');
  return `whatsapp:+${only}`;
}
function coerceWhats(to) {
  const s = String(to ?? '').trim();
  return s.startsWith('whatsapp:') ? s : normalizeWa(s);
}

/**
 * WhatsApp via Messages API.
 * Regra: ou TEXTO (body) ou TEMPLATE (contentSid + contentVariables) — nunca ambos.
 */
async function sendWhatsApp({ to, body, contentSid, variables, mediaUrl, from }) {
  if (to === undefined || to === null) throw new Error('to obrigatório');

  const toWa = coerceWhats(to);

  if (body && contentSid) throw new Error('Não envie body junto com contentSid (vira texto e perde botões).');
  if (!body && !contentSid) throw new Error('Defina body (texto) OU contentSid (template).');

  const params = { to: toWa };

  if (messagingServiceSid) params.messagingServiceSid = messagingServiceSid;
  else if (from || defaultWaFrom) params.from = `whatsapp:${String(from || defaultWaFrom).replace(/^whatsapp:/,'')}`;
  else throw new Error('Configure TWILIO_MESSAGING_SERVICE_SID ou TWILIO_WHATSAPP_NUMBER');

  if (mediaUrl) params.mediaUrl = mediaUrl;

  if (contentSid) {
    params.contentSid = contentSid;
    params.contentVariables = JSON.stringify(variables || {});
  } else {
    params.body = body;
  }

  console.log('[OUTBOUND]', {
    ...params,
    contentVariables: params.contentVariables ? String(params.contentVariables).slice(0, 200) + '...' : undefined
  });

  const client = getClient();
  const res = await client.messages.create(params);
  console.log('[WA OK]', res.sid, res.status, { contentSid: res.contentSid || null });
  return res;
}

// Alias p/ compat com legados
module.exports = { sendWhatsApp, toWhats: coerceWhats };