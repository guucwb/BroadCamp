const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

const SETTINGS_FILE = path.join(__dirname, '../data/settings.json');

// Helper para garantir que o diretório existe
async function ensureDataDir() {
  const dataDir = path.join(__dirname, '../data');
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// Helper para mascarar tokens sensíveis
function maskSensitive(value) {
  if (!value || value.length < 8) return value;
  return value.substring(0, 4) + '•'.repeat(20) + value.substring(value.length - 4);
}

// GET /api/settings - Buscar configurações
router.get('/', async (req, res) => {
  try {
    await ensureDataDir();

    try {
      const data = await fs.readFile(SETTINGS_FILE, 'utf8');
      const settings = JSON.parse(data);

      // Mascarar dados sensíveis antes de enviar
      const masked = {
        twilioAccountSid: settings.twilioAccountSid || '',
        twilioAuthToken: settings.twilioAuthToken ? maskSensitive(settings.twilioAuthToken) : '',
        twilioWhatsAppSender: settings.twilioWhatsAppSender || '',
        twilioSmsSender: settings.twilioSmsSender || '',
        openaiApiKey: settings.openaiApiKey ? maskSensitive(settings.openaiApiKey) : '',
      };

      return res.json(masked);
    } catch (err) {
      // Arquivo não existe, retornar vazio
      if (err.code === 'ENOENT') {
        return res.json({
          twilioAccountSid: '',
          twilioAuthToken: '',
          twilioWhatsAppSender: '',
          twilioSmsSender: '',
          openaiApiKey: '',
        });
      }
      throw err;
    }
  } catch (err) {
    console.error('[SETTINGS GET ERROR]', err);
    return res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
});

// POST /api/settings - Salvar configurações
router.post('/', async (req, res) => {
  try {
    const {
      twilioAccountSid,
      twilioAuthToken,
      twilioWhatsAppSender,
      twilioSmsSender,
      openaiApiKey,
    } = req.body;

    // Validação básica
    if (!twilioAccountSid || !twilioAuthToken) {
      return res.status(400).json({ error: 'Account SID e Auth Token são obrigatórios' });
    }

    if (!twilioWhatsAppSender && !twilioSmsSender) {
      return res.status(400).json({ error: 'Configure pelo menos um sender (WhatsApp ou SMS)' });
    }

    await ensureDataDir();

    // Ler configurações existentes para não sobrescrever tokens mascarados
    let existingSettings = {};
    try {
      const data = await fs.readFile(SETTINGS_FILE, 'utf8');
      existingSettings = JSON.parse(data);
    } catch (err) {
      // Arquivo não existe ainda
    }

    // Se o token vier mascarado (com •), manter o anterior
    const settings = {
      twilioAccountSid,
      twilioAuthToken: twilioAuthToken.includes('•') ? existingSettings.twilioAuthToken : twilioAuthToken,
      twilioWhatsAppSender,
      twilioSmsSender,
      openaiApiKey: openaiApiKey && openaiApiKey.includes('•') ? existingSettings.openaiApiKey : openaiApiKey,
      updatedAt: new Date().toISOString(),
    };

    // Salvar
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');

    // Atualizar variáveis de ambiente em tempo de execução
    // (Nota: isso só afeta o processo atual, não persiste no .env)
    process.env.TWILIO_ACCOUNT_SID = settings.twilioAccountSid;
    process.env.TWILIO_AUTH_TOKEN = settings.twilioAuthToken;
    if (settings.twilioWhatsAppSender) {
      process.env.TWILIO_WHATSAPP_FROM = `whatsapp:${settings.twilioWhatsAppSender}`;
      process.env.TWILIO_WHATSAPP_NUMBER = `whatsapp:${settings.twilioWhatsAppSender}`;
    }
    if (settings.twilioSmsSender) {
      process.env.TWILIO_SMS_FROM = settings.twilioSmsSender;
      process.env.TWILIO_SMS_NUMBER = settings.twilioSmsSender;
    }
    if (settings.openaiApiKey) {
      process.env.OPENAI_API_KEY = settings.openaiApiKey;
    }

    console.log('[SETTINGS SAVED]', {
      accountSid: settings.twilioAccountSid,
      whatsapp: settings.twilioWhatsAppSender || 'não configurado',
      sms: settings.twilioSmsSender || 'não configurado',
      openai: settings.openaiApiKey ? 'configurado' : 'não configurado',
    });

    return res.json({ message: 'Configurações salvas com sucesso!' });
  } catch (err) {
    console.error('[SETTINGS POST ERROR]', err);
    return res.status(500).json({ error: 'Erro ao salvar configurações' });
  }
});

module.exports = router;
