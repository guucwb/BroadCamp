// backend/src/utils/messagingService.js
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

const FROM_SMS = process.env.TWILIO_SMS_NUMBER; // Ex: '+1415...'
const FROM_WHATSAPP = process.env.TWILIO_WHATSAPP_NUMBER; // Ex: 'whatsapp:+1415...'

/**
 * Envia uma única mensagem com corpo já montado
 */
async function sendMessage({ channel, to, content }) {
  try {
    const formattedTo = channel === 'whatsapp' ? `whatsapp:${to}` : to;
    const from = channel === 'whatsapp' ? FROM_WHATSAPP : FROM_SMS;

    const message = await client.messages.create({
      to: formattedTo,
      from,
      body: content // <- mensagem já montada no frontend
    });

    return message;
  } catch (err) {
    console.error('Erro ao enviar mensagem:', err);
    throw err;
  }
}

module.exports = {
  sendMessage
};
