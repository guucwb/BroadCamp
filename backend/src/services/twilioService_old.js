// backend/twilioService.js
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken  = process.env.TWILIO_AUTH_TOKEN;
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID || null;
const defaultWaFrom       = process.env.TWILIO_WHATSAPP_NUMBER || null; // "whatsapp:+55..."

if (!accountSid || !authToken) {
  console.warn('[twilioService] TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN não configurados!');
}
const client = twilio(accountSid, authToken);

// normaliza + country-code e prefixo whatsapp:
const normalizeWa = (raw) => {
  const only = String(raw || '').replace(/\D/g, '');
  return `whatsapp:+${only}`;
};

async function sendWhatsApp(to, body, opts = {}) {
  const toWa = to.startsWith('whatsapp:') ? to : normalizeWa(to);
  const msg = {
    to: toWa,
    body: body || '',
  };

  // Escolha 1: Messaging Service
  if (messagingServiceSid) {
    msg.messagingServiceSid = messagingServiceSid;
  } else if (defaultWaFrom) {
    // Escolha 2: From explícito
    msg.from = defaultWaFrom;
  } else {
    throw new Error('Configure TWILIO_MESSAGING_SERVICE_SID ou TWILIO_WHATSAPP_NUMBER no .env');
  }

  // (opcional) mídia
  if (opts.mediaUrl) msg.mediaUrl = opts.mediaUrl;

  try {
    const res = await client.messages.create(msg);
    console.log('[Twilio OK]', res.sid, res.status, 'to:', toWa);
    return res;
  } catch (err) {
    console.error('[Twilio FAIL]', {
      code: err.code,
      status: err.status,
      message: err.message,
      moreInfo: err.moreInfo,
      details: err
    });
    throw err;
  }
}

async function sendSMS(to, body) {
  const msg = {
    to,
    body: body || '',
  };
  if (messagingServiceSid) msg.messagingServiceSid = messagingServiceSid;
  else msg.from = process.env.TWILIO_SMS_NUMBER;

  try {
    const res = await client.messages.create(msg);
    console.log('[Twilio SMS OK]', res.sid, res.status, 'to:', to);
    return res;
  } catch (err) {
    console.error('[Twilio SMS FAIL]', { code: err.code, status: err.status, message: err.message, moreInfo: err.moreInfo });
    throw err;
  }
}

module.exports = { sendWhatsApp, sendSMS };