import React, { useState } from 'react';

export default function TemplateCompliancePanel() {
  const [body, setBody] = useState('Oi {{nome}}! Só passando pra lembrar...');
  const [category, setCategory] = useState('MARKETING');
  const [tone, setTone] = useState('friendly');
  const [audience, setAudience] = useState('leads');
  const [offerType, setOfferType] = useState('discount');
  const [triggers, setTriggers] = useState(['urgency']);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function validate() {
    setLoading(true);
    const res = await fetch('/api/template-guard/validate-hybrid', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ category, language:'pt_BR', body, audience, tone, offerType, triggers })
    });
    const json = await res.json();
    setResult(json);
    setLoading(false);
  }

  function applyRewrite() {
    if (result?.ai_summary?.rewritten) {
      setBody(result.ai_summary.rewritten);
    }
  }

  return (
    <div className="campaign-card" style={{maxWidth: 800}}>
      <h3>Template Compliance (Meta)</h3>

      <label>Categoria</label>
      <select value={category} onChange={e=>setCategory(e.target.value)}>
        <option>MARKETING</option>
        <option>UTILITY</option>
        <option>AUTH</option>
      </select>

      <label>Corpo do Template</label>
      <textarea rows={6} value={body} onChange={e=>setBody(e.target.value)} />

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
        <div>
          <label>Audience</label>
          <input value={audience} onChange={e=>setAudience(e.target.value)} />
        </div>
        <div>
          <label>Tone</label>
          <input value={tone} onChange={e=>setTone(e.target.value)} />
        </div>
        <div>
          <label>Offer Type</label>
          <input value={offerType} onChange={e=>setOfferType(e.target.value)} />
        </div>
        <div>
          <label>Triggers (csv)</label>
          <input value={triggers.join(',')} onChange={e=>setTriggers(e.target.value.split(',').map(s=>s.trim()).filter(Boolean))}/>
        </div>
      </div>

      <button className="primary-btn" onClick={validate} disabled={loading}>
        {loading ? 'Analisando...' : 'Validar'}
      </button>

      {result && (
        <div className="preview" style={{marginTop:16}}>
          <p><strong>OK?</strong> {String(result.ok)}</p>
          <p><strong>AI Risk:</strong> {result.ai_summary?.risk_score ?? '-'}</p>
          <p><strong>Issues:</strong> {result.issues?.length ? result.issues.join(' | ') : 'nenhuma'}</p>
          <p><strong>Sugestões:</strong> {result.suggestions?.length ? result.suggestions.join(' | ') : '—'}</p>
          {result.ai_summary?.rewritten && (
            <>
              <hr />
              <p><strong>Reescrita Sugerida:</strong></p>
              <pre style={{whiteSpace:'pre-wrap'}}>{result.ai_summary.rewritten}</pre>
              <button className="primary-btn small" onClick={applyRewrite}>Aplicar reescrita</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}