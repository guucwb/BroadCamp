// frontend/src/pages/TemplateStudio.jsx
import React, { useEffect, useMemo, useState } from 'react';

const row = (children) => (
  <div style={{ marginBottom: 14 }}>
    {children}
  </div>
);

const label = (t) => (
  <div style={{ fontSize: 12, color: '#475569', marginBottom: 6, fontWeight: 600 }}>{t}</div>
);

const input = (props) => (
  <input
    {...props}
    style={{
      width: '100%', border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 12px',
      ...(props.style || {})
    }}
  />
);

const select = (props) => (
  <select
    {...props}
    style={{
      width: '100%', border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 12px',
      background: '#fff', ...(props.style || {})
    }}
  />
);

const textarea = (props) => (
  <textarea
    {...props}
    style={{
      width: '100%', minHeight: 120, border: '1px solid #cbd5e1', borderRadius: 8,
      padding: '10px 12px', fontFamily: 'inherit', ...(props.style || {})
    }}
  />
);

// Um highlight simples para {{variaveis}} no preview
function Preview({ body }) {
  const html = useMemo(() => {
    const esc = String(body || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return esc.replace(/\{\{(\w+)\}\}/g, '<span style="background:#fef08a;padding:0 4px;border-radius:4px;">{{$1}}</span>');
  }, [body]);

  return (
    <div
      style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, minHeight: 220, background: '#fff' }}
      dangerouslySetInnerHTML={{ __html: html || '<span style="color:#94a3b8">Message Preview</span>' }}
    />
  );
}

export default function TemplateStudio() {
  // Composer
  const [friendlyName, setFriendlyName] = useState('');
  const [language, setLanguage]     = useState('pt_BR');
  const [contentType, setContentType] = useState('twilio/text');
  const [body, setBody] = useState('');

  // Metadados “legais”
  const [region, setRegion] = useState('');
  const [tone, setTone] = useState('');
  const [offerType, setOfferType] = useState('');
  const [psychTrigger, setPsychTrigger] = useState('');
  const [metaCategory, setMetaCategory] = useState('MARKETING'); // Meta category

  // Compliance
  const [checking, setChecking] = useState(false);
  const [comp, setComp] = useState(null); // { ok, aiRisk, issues[], suggestions[], rewrite }

  // IA
  const [generating, setGenerating] = useState(false);

  // Helpers
  const toast = (m) => window.alert(m);

  // =====================================================================
  // IA: gerar copy
  const generateWithAI = async () => {
    try {
      setGenerating(true);
      // tenta /api/ai/suggest e cai pra /api/ai/generate
      const payload = {
        language, tone, region, offerType, psychTrigger,
      };
      let res = await fetch('/api/ai/suggest', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!res.ok) {
        res = await fetch('/api/ai/generate', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        });
      }
      if (!res.ok) throw new Error('Falha ao gerar com IA.');
      const data = await res.json();
      const suggestion = data?.text || data?.message || data?.copy || '';
      if (suggestion) {
        setBody((old) => (old?.trim() ? `${old}\n\n${suggestion}` : suggestion));
        toast('Sugestão de IA inserida.');
      } else {
        toast('IA não retornou texto.');
      }
    } catch (e) {
      toast(e.message || 'Erro ao chamar IA.');
    } finally {
      setGenerating(false);
    }
  };

  // =====================================================================
  // Compliance: validar com o guard (híbrido)
  const validate = async () => {
    if (!body?.trim()) return toast('Escreva o corpo do template primeiro.');
    try {
      setChecking(true);
      const payload = {
        category: metaCategory,
        body,
        audience: region || 'base.csv',
        tone: tone || 'neutral',
        offerType: offerType || '',
        triggers: psychTrigger ? psychTrigger.split(',').map(s => s.trim()) : [],
        // opcional: anexar mais campos úteis p/ seu guard
        language,
        contentType,
      };

      // tenta /api/template-guard/validate -> /api/template-guard -> /api/template-guard/check
      let res = await fetch('/api/template-guard/validate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!res.ok) {
        res = await fetch('/api/template-guard', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        });
      }
      if (!res.ok) {
        res = await fetch('/api/template-guard/check', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        });
      }

      if (!res.ok) throw new Error('Falha ao validar no guard.');
      const data = await res.json();
      // Normaliza o shape:
      setComp({
        ok: !!(data.ok ?? data.compliant),
        aiRisk: Number(data.aiRisk ?? data.risk ?? 0),
        issues: Array.isArray(data.issues) ? data.issues : (data.issues ? [String(data.issues)] : []),
        suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
        rewrite: data.rewrite || data.rewriteSuggestion || '',
      });
    } catch (e) {
      toast(e.message || 'Erro ao validar.');
    } finally {
      setChecking(false);
    }
  };

  // Aplicar reescrita sugerida
  const applyRewrite = () => {
    if (comp?.rewrite) {
      setBody(comp.rewrite);
      toast('Reescrita aplicada ao corpo do template.');
    }
  };

  // =====================================================================
  // Salvar (opcional): usa sua rota atual de templates
  const saveTemplate = async () => {
    if (!friendlyName?.trim()) return toast('Defina um Friendly Name.');
    if (!body?.trim()) return toast('Corpo do template vazio.');

    const payload = {
      friendlyName,
      language,
      contentType,
      body,
      meta: {
        region, tone, offerType, psychTrigger, category: metaCategory,
      },
    };

    try {
      const res = await fetch('/api/templates/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Falha ao salvar template.');
      toast('Template salvo com sucesso!');
    } catch (e) {
      toast(e.message || 'Erro ao salvar.');
    }
  };

  // =====================================================================
  // UI
  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 520px', gap: 16 }}>
        {/* COLUNA ESQUERDA — COMPOSER */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h2 style={{ margin: 0 }}>Template Studio</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" onClick={validate} disabled={checking}>
                {checking ? 'Validando...' : 'Validar Meta'}
              </button>
              <button className="btn" onClick={saveTemplate}>Salvar template</button>
            </div>
          </div>

          {row(<>
            {label('Friendly Name')}
            {input({ value: friendlyName, onChange: e => setFriendlyName(e.target.value), placeholder: 'ex.: Promo_setembro_2025' })}
          </>)}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {row(<>
              {label('Language')}
              {input({ value: language, onChange: e => setLanguage(e.target.value) })}
            </>)}
            {row(<>
              {label('Content Type')}
              {select({ value: contentType, onChange: e => setContentType(e.target.value) ,
                children: (
                  <>
                    <option value="twilio/text">twilio/text</option>
                    <option value="twilio/rich">twilio/rich</option>
                  </>
                )
              })}
            </>)}
          </div>

          {row(<>
            {label('Body')}
            {textarea({
              rows: 8, value: body, onChange: e => setBody(e.target.value),
              placeholder: 'Olá {{nome}}, ...'
            })}
            <div style={{ marginTop: 8 }}>
              <button className="btn" onClick={generateWithAI} disabled={generating}>
                {generating ? 'Gerando...' : 'Gerar com IA'}
              </button>
            </div>
          </>)}

          <hr style={{ border: 0, borderTop: '1px solid #e2e8f0', margin: '16px 0' }} />

          {/* Parâmetros “humanos” que alimentam IA e Compliance */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {row(<>
              {label('Região / Base (audience)')}
              {input({ value: region, onChange: e => setRegion(e.target.value), placeholder: 'ex.: base.csv / BR' })}
            </>)}
            {row(<>
              {label('Tom')}
              {select({
                value: tone, onChange: e => setTone(e.target.value),
                children: (
                  <>
                    <option value="">--</option>
                    <option value="neutral">neutral</option>
                    <option value="friendly">friendly</option>
                    <option value="urgent">urgent</option>
                    <option value="informative">informative</option>
                  </>
                )
              })}
            </>)}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {row(<>
              {label('Tipo de Oferta')}
              {select({
                value: offerType, onChange: e => setOfferType(e.target.value),
                children: (
                  <>
                    <option value="">--</option>
                    <option value="discount">discount</option>
                    <option value="coupon">coupon</option>
                    <option value="reminder">reminder</option>
                    <option value="info">info</option>
                  </>
                )
              })}
            </>)}
            {row(<>
              {label('Gatilho Psicológico')}
              {select({
                value: psychTrigger, onChange: e => setPsychTrigger(e.target.value),
                children: (
                  <>
                    <option value="">--</option>
                    <option value="scarcity">scarcity</option>
                    <option value="urgency">urgency</option>
                    <option value="social-proof">social-proof</option>
                    <option value="authority">authority</option>
                    <option value="reciprocity">reciprocity</option>
                  </>
                )
              })}
            </>)}
          </div>

          {row(<>
            {label('Categoria Meta')}
            {select({
              value: metaCategory, onChange: e => setMetaCategory(e.target.value),
              children: (
                <>
                  <option value="MARKETING">MARKETING</option>
                  <option value="UTILITY">UTILITY</option>
                  <option value="AUTHENTICATION">AUTHENTICATION</option>
                  <option value="SERVICE">SERVICE</option>
                </>
              )
            })}
          </>)}
        </div>

        {/* COLUNA DIREITA — PREVIEW & COMPLIANCE */}
        <div>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Preview</div>
            <Preview body={body} />
          </div>

          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700 }}>Template Compliance (Meta)</div>
              <button className="btn" onClick={validate} disabled={checking}>
                {checking ? 'Validando...' : 'Validar agora'}
              </button>
            </div>

            {!comp && (
              <div style={{ color: '#94a3b8', marginTop: 8 }}>Preencha o corpo e clique em “Validar”.</div>
            )}

            {comp && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <span style={{
                    display: 'inline-block', padding: '2px 8px', borderRadius: 999,
                    background: comp.ok ? '#dcfce7' : '#fee2e2', color: comp.ok ? '#166534' : '#991b1b',
                    fontSize: 12, fontWeight: 700
                  }}>
                    {comp.ok ? 'OK' : 'Atenção'}
                  </span>
                  <div style={{ fontSize: 12, color: '#475569' }}>
                    AI Risk: <b>{comp.aiRisk?.toFixed ? comp.aiRisk.toFixed(1) : comp.aiRisk}</b>
                  </div>
                </div>

                {comp.issues?.length > 0 && (
                  <>
                    {label('Issues encontradas')}
                    <ul style={{ marginTop: 6 }}>
                      {comp.issues.map((it, i) => <li key={i} style={{ fontSize: 14, color: '#1f2937' }}>{it}</li>)}
                    </ul>
                  </>
                )}

                {comp.suggestions?.length > 0 && (
                  <>
                    {label('Sugestões')}
                    <ul style={{ marginTop: 6 }}>
                      {comp.suggestions.map((it, i) => <li key={i} style={{ fontSize: 14, color: '#1f2937' }}>{it}</li>)}
                    </ul>
                  </>
                )}

                {comp.rewrite && (
                  <>
                    {label('Reescrita sugerida')}
                    <textarea readOnly rows={6} value={comp.rewrite}
                      style={{ width: '100%', fontFamily: 'monospace', border: '1px solid #e2e8f0', borderRadius: 8, padding: 10 }} />
                    <div style={{ marginTop: 8 }}>
                      <button className="btn" onClick={applyRewrite}>Aplicar reescrita</button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}