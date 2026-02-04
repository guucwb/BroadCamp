const express = require('express');
const router = express.Router();
const axios = require('axios');

// POST /api/templates/create
router.post('/create', async (req, res) => {
  try {
    const {
      name,
      language,
      variables = {},
      types,
      autoSubmit = false,
      category // obrigatória se autoSubmit = true
    } = req.body;

    if (!name || !language || !types || typeof types !== 'object') {
      return res.status(400).json({ error: 'Parâmetros obrigatórios ausentes ou inválidos' });
    }

    // Monta o payload principal
    const payload = {
      friendly_name: name,
      language,
      types
    };

    // Adiciona variáveis se existirem
    if (variables && Object.keys(variables).length > 0) {
      payload.variables = variables;
    }

    // Faz a requisição para criar o template
    const createResponse = await axios.post('https://content.twilio.com/v1/Content', payload, {
      auth: {
        username: process.env.TWILIO_ACCOUNT_SID,
        password: process.env.TWILIO_AUTH_TOKEN
      }
    });

    const contentSid = createResponse.data.sid;

    // Se a flag estiver ativada, envia para aprovação na Meta
    if (autoSubmit) {
      if (!category) {
        return res.status(400).json({ error: 'Categoria obrigatória para envio à aprovação no WhatsApp' });
      }

      await axios.post(
        `https://content.twilio.com/v1/Content/${contentSid}/ApprovalRequests/whatsapp`,
        { name: name, category },
        {
          auth: {
            username: process.env.TWILIO_ACCOUNT_SID,
            password: process.env.TWILIO_AUTH_TOKEN
          }
        }
      );
    }

    res.status(201).json({ success: true, contentSid });
  } catch (error) {
    console.error('Erro ao criar template:', error.response?.data || error.message);
    res.status(500).json({ error: 'Erro ao criar template' });
  }
});

// GET /api/templates/list
router.get('/list', async (req, res) => {
  try {
    const response = await axios.get('https://content.twilio.com/v1/Content', {
      auth: {
        username: process.env.TWILIO_ACCOUNT_SID,
        password: process.env.TWILIO_AUTH_TOKEN
      }
    });

    const contents = response.data.contents || [];

    const parsed = contents.map((template) => {
      return {
        sid: template.sid,
        friendly_name: template.friendly_name,
        language: template.language,
        types: template.types,
        variables: template.variables
      };
    });

    res.json({ contents: parsed });
  } catch (err) {
    console.error('Erro ao buscar templates:', err.response?.data || err.message);
    res.status(500).json({ error: 'Erro ao buscar templates' });
  }
});

module.exports = router;

