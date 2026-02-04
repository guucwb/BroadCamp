// backend/src/routes/suggestCopy.js
const express = require('express');
const router = express.Router();
const OpenAI = require('openai');

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 🔧 NOVO: normalização + guidelines por categoria
function normalizeCategory(raw) {
  const c = String(raw || '').trim().toUpperCase();
  if (['MARKETING', 'PROMO', 'COMMERCIAL'].includes(c)) return 'MARKETING';
  if (['AUTH', 'AUTHENTICATION', 'OTP', 'TRANSACTIONAL', 'SECURITY'].includes(c)) return 'AUTH';
  return 'UTILITY';
}

function categoryGuidelines(cat) {
  if (cat === 'MARKETING') {
    return `
- Categoria: MARKETING → pode ser persuasivo, mas SEM linguagem agressiva ou enganosa.
- Inclua um CTA claro e curto (ex.: "Responda SIM", "Acesse o link").
- Pode usar "oferta", "desconto", "novidade", mas evite palavras sensacionalistas (ex.: "GRÁTIS!!!", "IMPERDÍVEL!!!").
- Se usar gatilho (ex.: urgência/escassez), use de forma sutil.
- Opcional: incluir instrução de opt-out local (ex.: "Para parar, responda SAIR").`;
  }
  if (cat === 'AUTH') {
    return `
- Categoria: AUTH/TRANSACTIONAL → foco em verificação/código ou evento transacional.
- Se for autenticação, inclua **um** placeholder de código {{1}} (ou preserve se já existir). 
- Não use linguagem promocional. Objetivo: informar/confirmar/autorizar.
- Seja direto, claro, em tom neutro.`;
  }
  // UTILITY
  return `
- Categoria: UTILITY → informativo/atualizações (ex.: rastreio, lembrete, confirmação).
- Tom neutro e útil. Sem promoção, sem desconto, sem "oferta".
- CTA somente quando necessário para concluir uma ação (ex.: "confirme", "agende").`;
}

router.post('/suggest-copy', async (req, res) => {
  try {
    const {
      mode = 'refine',
      bodySeed = '',
      language = 'pt_BR',
      category = 'UTILITY',
      region = '',
      tone = '',
      offerType = '',
      psychologicalTrigger = '',
      ageRange = '',
      marketNiche = '',
    } = req.body || {};

    const cat = normalizeCategory(category);
    const guidelines = categoryGuidelines(cat);

    const system = `
Você é um copywriter para mensagens de WhatsApp aprováveis pela Meta (via Twilio).
Regras gerais:
- Escreva na língua indicada por "language" (pt_BR/es_MX/en_US etc.).
- **Preserve** placeholders numerados ({{1}}, {{2}}...) caso existam.
- Evite linguagem ofensiva, claims exagerados, capitalização excessiva e emojis demais.
- Limite ~700 caracteres.
${guidelines}
`;

    const user = `
language: ${language}
category_normalized: ${cat}
region: ${region}
tone: ${tone}
offerType: ${offerType}
psychologicalTrigger: ${psychologicalTrigger}
ageRange: ${ageRange}
marketNiche: ${marketNiche}
mode: ${mode}

Texto base (seed) para refinar (pode estar vazio):
---
${bodySeed}
---

Tarefa:
- Se "mode" = refine e o seed não estiver vazio, reescreva/melhore **mantendo intenção e placeholders**.
- Se "mode" = generate (ou seed vazio), gere do zero com base no contexto acima e nas guidelines da categoria.
- Retorne **apenas** a mensagem final, sem comentários.`;

    const rsp = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const suggestion = rsp.choices?.[0]?.message?.content?.trim() || '';
    res.json({ suggestion });
  } catch (e) {
    console.error('[suggest-copy] error:', e);
    res.status(500).json({ error: 'failed_to_generate' });
  }
});

module.exports = router;