// backend/src/services/twilioService.js
const twilio = require('twilio');
const fs = require('fs');
const path = require('path');

console.log('[twilioService] v7 loaded (lê settings.json dinamicamente)');

const SETTINGS_FILE = path.join(__dirname, '../data/settings.json');

// Lê configurações do settings.json se existir, senão usa process.env
function getSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
      const settings = JSON.parse(data);
      console.log('[twilioService] Usando configurações do settings.json', {
        accountSid: settings.twilioAccountSid?.substring(0, 8) + '...',
        whatsapp: settings.twilioWhatsAppSender,
        sms: settings.twilioSmsSender
      });
      return settings;
    }
  } catch (err) {
    console.warn('[twilioService] Erro ao ler settings.json, usando .env', err.message);
  }

  // Fallback para .env
  return {
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
    twilioWhatsAppSender: process.env.TWILIO_WHATSAPP_NUMBER?.replace('whatsapp:', ''),
    twilioSmsSender: process.env.TWILIO_SMS_NUMBER || process.env.TWILIO_SMS_FROM
  };
}

function getClient() {
  const settings = getSettings();
  const { twilioAccountSid: accountSid, twilioAuthToken: authToken } = settings;

  if (!accountSid || !authToken) {
    throw new Error('[twilioService] Falta TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN no ambiente ou settings.json');
  }

  return twilio(accountSid, authToken);
}

const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID || null; // MG...

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

  // Lê configurações atuais do settings.json
  const settings = getSettings();
  const defaultWaFrom = settings.twilioWhatsAppSender;

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

/**
 * SMS via Messages API (sem prefixo whatsapp:)
 */
async function sendSMS({ to, body, from }) {
  if (!to) throw new Error('to obrigatório');
  if (!body) throw new Error('body obrigatório');

  // Normaliza o número (mantém formato E.164)
  const toClean = String(to).trim();
  const toFormatted = toClean.startsWith('+') ? toClean : `+${toClean.replace(/\D/g, '')}`;

  // Lê configurações atuais do settings.json
  const settings = getSettings();
  const smsFrom = from || settings.twilioSmsSender;
  if (!smsFrom) throw new Error('Configure TWILIO_SMS_FROM ou TWILIO_SMS_NUMBER');

  const params = {
    to: toFormatted,
    from: smsFrom,
    body
  };

  console.log('[SMS OUTBOUND]', params);

  const client = getClient();
  const res = await client.messages.create(params);
  console.log('[SMS OK]', res.sid, res.status);
  return res;
}

// Alias p/ compat com legados
module.exports = { sendWhatsApp, sendSMS, toWhats: coerceWhats };