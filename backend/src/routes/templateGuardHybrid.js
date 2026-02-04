const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');

function ruleCheck({ category, language='pt_BR', body }) {
  const txt = (body||'').trim(); const issues=[]; const suggestions=[];
  const holes = txt.match(/{{\s*[\w.]+\s*}}/g) || [];
  if (txt.length<10) issues.push('Mensagem muito curta.');
  if (holes.length>12) issues.push('Excesso de variáveis (>{12}).');
  const banned = /(aposta|apostas|bet|criptomoeda|remédio|medicamento|armas|sexo|adulto|porn|nude)/i;
  if (banned.test(txt)) issues.push('Possível violação de política de comércio da Meta.');
  const hasCTA=/(clique|acesse|confira|responda|aproveite|saiba mais)/i.test(txt);
  const hasURL=/https?:\/\/\S+/i.test(txt); const hasOptOut=/(pare|parar|sair|descadastre)/i.test(txt);
  if(category==='MARKETING'){ if(!hasCTA) issues.push('Marketing sem CTA claro.'); if(hasURL && !hasCTA) suggestions.push('Inclua CTA antes de URLs.'); if(!hasOptOut) suggestions.push('Adicionar instrução de opt-out.'); }
  if(category==='UTILITY'){ const opCtx=/(pedido|status|fatura|código|codigo|protocolo|agendamento|comprovante)/i.test(txt); if(!opCtx) issues.push('Utility sem contexto operacional claro.'); }
  if(category==='AUTH' || /{{\s*code\s*}}/i.test(txt)){ if(!/{{\s*\w+\s*}}/.test(txt)) issues.push('Auth sem placeholder para código.'); }
  return { holes, issues, suggestions };
}

async function aiCheck(openai, payload){
  const sys = `You are a WhatsApp Business Template compliance assistant.
Return STRICT JSON with keys: category_detected, risk_score (0-1), issues[], suggestions[], rewritten, reasoning.`;
  const resp = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    temperature: 0.2,
    messages: [{role:'system',content:sys},{role:'user',content:JSON.stringify(payload)}]
  });
  const json = JSON.parse(resp.choices[0].message.content||'{}');
  return {
    category_detected: json.category_detected || 'UNKNOWN',
    risk_score: typeof json.risk_score==='number'? json.risk_score : 0.5,
    issues: Array.isArray(json.issues)? json.issues : [],
    suggestions: Array.isArray(json.suggestions)? json.suggestions : [],
    rewritten: json.rewritten || ''
  };
}

router.post('/validate-hybrid', async (req,res)=>{
  try{
    const { category, language, body, audience, tone, offerType, triggers } = req.body||{};
    const rules = ruleCheck({ category, language, body });

    let ai = { category_detected:'UNKNOWN', risk_score:0.5, issues:[], suggestions:[], rewritten:'' };
    if (process.env.OPENAI_API_KEY) {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      ai = await aiCheck(openai, { category, language, body, audience, tone, offerType, triggers });
    }

    const issues = [...new Set([...(rules.issues||[]), ...(ai.issues||[])])];
    const suggestions = [...new Set([...(rules.suggestions||[]), ...(ai.suggestions||[])])];
    const ok = issues.length===0 && ai.risk_score<=0.45;

    res.json({ ok, holes: rules.holes, ai_summary: ai, issues, suggestions });
  }catch(e){ console.error(e); res.status(500).json({ ok:false, error:'template_guard_failure' }); }
});

module.exports = router;