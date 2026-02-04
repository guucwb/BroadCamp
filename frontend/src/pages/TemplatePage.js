// frontend/src/pages/TemplatePage.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../styles/TemplatePage.css';

export default function TemplatePage() {
  // --------- Estado principal (form) ---------
  const [formData, setFormData] = useState({
    friendlyName: '',
    language: 'pt_BR',
    contentType: 'twilio/text', // 'twilio/text' | 'twilio/media' | 'twilio/template'
    body: '',
    variables: [],
    submitForWhatsApp: true,
    category: 'UTILITY', // UTILITY | MARKETING | AUTH/TRANSACTIONAL
  });

  // --------- Contexto para IA (briefing) ---------
  const [audienceOptions, setAudienceOptions] = useState({
    region: 'br',
    tone: '',
    offerType: '',
    psychologicalTrigger: '',
    ageRange: '',
    marketNiche: '',
    customMarketNiche: '',
  });

  // --------- Preview & Compliance ---------
  const [preview, setPreview] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [compliance, setCompliance] = useState(null);
  const [validating, setValidating] = useState(false);

  // --------- Opções auxiliares ---------
  const psychologicalTriggers = ['escassez', 'urgência', 'prova social', 'autoridade', 'reciprocidade'];
  const ageRanges = ['18 a 24 anos', '25 a 40 anos', '41 a 60 anos', '60+'];
  const offerTypes = ['desconto exclusivo', 'frete grátis', 'combo especial', 'brinde na compra', 'cobrança'];
  const marketNiches = ['cosméticos naturais', 'fitness', 'educação online', 'moda sustentável', 'tecnologia', 'outro'];

  // --------- Util: extrair placeholders {{1}}, {{2}}... ---------
  const extractVariables = (bodyText) => {
    const regex = /\{\{(\d+)\}\}/g;
    const nums = new Set();
    let m;
    while ((m = regex.exec(String(bodyText))) !== null) nums.add(Number(m[1]));
    const max = nums.size ? Math.max(...nums) : 0;
    return Array.from({ length: max }, (_, i) => formData.variables[i] || '');
  };

  // Atualiza vetor de variáveis ao editar o body
  useEffect(() => {
    setFormData((prev) => ({ ...prev, variables: extractVariables(prev.body) }));
  }, [formData.body]); // eslint-disable-line

  // Gera preview substituindo {{n}} pelos valores digitados
  useEffect(() => {
    let msg = String(formData.body || '');
    formData.variables.forEach((val, i) => {
      const re = new RegExp(`\\{\\{${i + 1}\\}\\}`, 'g');
      msg = msg.replace(re, val || `{{${i + 1}}}`);
    });
    setPreview(msg);
  }, [formData.body, formData.variables]);

  // --------- Handlers básicos ---------
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCompliance(null); // qualquer alteração invalida análise anterior
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleVariableChange = (index, value) => {
    const arr = [...formData.variables];
    arr[index] = value;
    setCompliance(null);
    setFormData((prev) => ({ ...prev, variables: arr }));
  };

  const handleAudienceChange = (e) => {
    const { name, value } = e.target;
    setAudienceOptions((prev) => ({ ...prev, [name]: value }));

    // region -> language
    if (name === 'region') {
      if (value === 'br') {
        setFormData((prev) => ({ ...prev, language: 'pt_BR' }));
      } else if (['co', 'mx', 'pe', 'ar', 'cl'].includes(value)) {
        setFormData((prev) => ({ ...prev, language: 'es_MX' }));
      } else {
        setFormData((prev) => ({ ...prev, language: 'en_US' }));
      }
    }
  };

  // --------- IA: sugerir copy (usa seed + briefing + categoria) ---------
  const handleSuggestWithAI = async () => {
    try {
      setIsSuggesting(true);
      setCompliance(null);

      const payload = {
        // texto que o usuário já começou a escrever
        seedText: formData.body || '',
        // briefing
        region: audienceOptions.region || '',
        tone: audienceOptions.tone || '',
        offerType: audienceOptions.offerType || '',
        psychologicalTrigger: audienceOptions.psychologicalTrigger || '',
        ageRange: audienceOptions.ageRange || '',
        marketNiche:
          audienceOptions.marketNiche === 'outro'
            ? audienceOptions.customMarketNiche || 'outro'
            : audienceOptions.marketNiche || '',
        // categoria do template (p/ IA respeitar contexto de Meta)
        category: (formData.category || 'UTILITY').toUpperCase(),
        // linguagem alvo ajuda a IA com PT/ES/EN
        language: formData.language || 'pt_BR',
      };

      const { data } = await axios.post('/api/ai/suggest-copy', payload);
      if (!data?.suggestion) {
        alert('A IA não retornou sugestão. Tente novamente.');
        return;
      }
      setFormData((prev) => ({ ...prev, body: data.suggestion }));
    } catch (e) {
      console.error(e);
      alert('Erro ao gerar sugestão com IA.');
    } finally {
      setIsSuggesting(false);
    }
  };

  // --------- Compliance: valida SOMENTE (category + preview) ---------
  const validateCompliance = async () => {
    try {
      setValidating(true);
      setCompliance(null);

      const payload = {
        category: (formData.category || 'UTILITY').toUpperCase(),
        body: preview || '',
      };

      const { data } = await axios.post('/api/template-guard/validate-hybrid', payload);
      setCompliance(data);
    } catch (e) {
      console.error(e);
      alert('Falha ao validar compliance.');
    } finally {
      setValidating(false);
    }
  };

  const applyRewriteFromCompliance = () => {
    const rewritten = compliance?.ai_summary?.rewritten;
    if (!rewritten) return;
    setFormData((prev) => ({ ...prev, body: rewritten }));
    // preview atualizará via useEffect
  };

  // --------- Criar Template ---------
  const handleSubmit = async () => {
    try {
      if (!formData.friendlyName.trim()) {
        alert('Defina um Friendly Name.');
        return;
      }
      if (!formData.body.trim()) {
        alert('Escreva o Body da mensagem.');
        return;
      }

      // map {{n}} -> valores default (apenas rótulos)
      const variableMap = {};
      formData.variables.forEach((val, idx) => {
        variableMap[(idx + 1).toString()] = val || `{{${idx + 1}}}`;
      });

      const payload = {
        name: formData.friendlyName,
        language: formData.language, // ex.: 'pt_BR'
        variables: variableMap,
        types: {
          [formData.contentType]: {
            body: formData.body,
          },
        },
        autoSubmit: Boolean(formData.submitForWhatsApp),
        category: (formData.category || 'UTILITY').toUpperCase(),
      };

      setIsCreating(true);
      await axios.post('/api/templates/create', payload);
      alert('Template criado com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao criar template: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsCreating(false);
    }
  };

  // --------- UI ---------
  return (
    <div className="container">
      {/* Coluna esquerda: formulário */}
      <div className="form">
        <h2>Criar Template (com IA + Compliance)</h2>

        <label>Friendly Name</label>
        <input
          name="friendlyName"
          value={formData.friendlyName}
          onChange={handleChange}
          placeholder="ex.: lembrete_pagamento_ago24"
        />

        <div className="grid-2">
          <div>
            <label>Categoria</label>
            <select name="category" value={formData.category} onChange={handleChange}>
              <option value="UTILITY">Utility</option>
              <option value="MARKETING">Marketing</option>
              <option value="AUTH">Auth/Transactional</option>
            </select>
          </div>

          <div>
            <label>Idioma</label>
            <input name="language" value={formData.language} onChange={handleChange} disabled />
          </div>
        </div>

        <div className="grid-2">
          <div>
            <label>Content Type</label>
            <select name="contentType" value={formData.contentType} onChange={handleChange}>
              <option value="twilio/text">twilio/text</option>
              <option value="twilio/media">twilio/media</option>
              <option value="twilio/template">twilio/template</option>
            </select>
          </div>

          <div style={{ alignSelf: 'end' }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                name="submitForWhatsApp"
                checked={formData.submitForWhatsApp}
                onChange={handleChange}
              />
              Submeter para aprovação no WhatsApp
            </label>
          </div>
        </div>

        <label>Body</label>
        <textarea
          name="body"
          rows={6}
          value={formData.body}
          onChange={handleChange}
          placeholder="Use {{1}}, {{2}}... para variáveis"
        />

        {/* Campos de variáveis detectadas */}
        {formData.variables.length > 0 && (
          <div className="vars-box">
            {formData.variables.map((val, i) => (
              <div key={i}>
                <label>{`Valor da variável {{${i + 1}}}`}</label>
                <input value={val} onChange={(e) => handleVariableChange(i, e.target.value)} />
              </div>
            ))}
          </div>
        )}

        {/* Briefing para IA */}
        <div className="divider" />
        <h4>Briefing para IA</h4>

        <div className="grid-2">
          <div>
            <label>Região</label>
            <select name="region" value={audienceOptions.region} onChange={handleAudienceChange}>
              <option value="br">Brasil (pt_BR)</option>
              <option value="co">Colômbia (es_MX)</option>
              <option value="mx">México (es_MX)</option>
              <option value="pe">Peru (es_MX)</option>
              <option value="ar">Argentina (es_MX)</option>
              <option value="cl">Chile (es_MX)</option>
              <option value="us">Estados Unidos (en_US)</option>
              <option value="intl">Outro / Internacional (en_US)</option>
            </select>
          </div>

          <div>
            <label>Tom</label>
            <select name="tone" value={audienceOptions.tone} onChange={handleAudienceChange}>
              <option value="">--</option>
              <option value="informal">Informal</option>
              <option value="urgente">Urgente</option>
              <option value="profissional">Profissional</option>
              <option value="amistoso">Amistoso</option>
              <option value="sério">Sério</option>
            </select>
          </div>

          <div>
            <label>Tipo de Oferta</label>
            <select name="offerType" value={audienceOptions.offerType} onChange={handleAudienceChange}>
              <option value="">--</option>
              {offerTypes.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Gatilho Psicológico</label>
            <select
              name="psychologicalTrigger"
              value={audienceOptions.psychologicalTrigger}
              onChange={handleAudienceChange}
            >
              <option value="">--</option>
              {psychologicalTriggers.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Faixa Etária</label>
            <select name="ageRange" value={audienceOptions.ageRange} onChange={handleAudienceChange}>
              <option value="">--</option>
              {ageRanges.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Nicho de Mercado</label>
            <select name="marketNiche" value={audienceOptions.marketNiche} onChange={handleAudienceChange}>
              <option value="">--</option>
              {marketNiches.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>

            {audienceOptions.marketNiche === 'outro' && (
              <input
                name="customMarketNiche"
                placeholder="Descreva seu nicho"
                value={audienceOptions.customMarketNiche}
                onChange={handleAudienceChange}
                style={{ marginTop: 8 }}
              />
            )}
          </div>
        </div>

        <div className="button-group">
          <button onClick={handleSuggestWithAI} disabled={isSuggesting}>
            {isSuggesting ? 'Gerando...' : 'Gerar com IA (respeitando categoria)'}
          </button>
          <button onClick={validateCompliance} disabled={validating}>
            {validating ? 'Validando...' : 'Validar compliance (Meta)'}
          </button>
          <button onClick={handleSubmit} disabled={isCreating}>
            {isCreating ? 'Criando...' : 'Criar Template'}
          </button>
        </div>
      </div>

      {/* Coluna direita: Preview + Resultado da Compliance */}
      <div className="preview">
        <h4>Message Preview</h4>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{preview}</pre>

        {compliance && (
          <div style={{ marginTop: 16 }}>
            <h4>Compliance (Meta)</h4>
            <p>
              <strong>OK?</strong> {String(compliance.ok)}
            </p>
            <p>
              <strong>Issues:</strong>{' '}
              {Array.isArray(compliance.issues) && compliance.issues.length
                ? compliance.issues.join(' | ')
                : 'nenhuma'}
            </p>
            <p>
              <strong>Sugestões:</strong>{' '}
              {Array.isArray(compliance.suggestions) && compliance.suggestions.length
                ? compliance.suggestions.join(' | ')
                : '—'}
            </p>

            {compliance.ai_summary?.rewritten && (
              <>
                <div className="divider" />
                <p>
                  <strong>Reescrita sugerida:</strong>
                </p>
                <pre style={{ whiteSpace: 'pre-wrap' }}>{compliance.ai_summary.rewritten}</pre>
                <button className="small-btn" onClick={applyRewriteFromCompliance}>
                  Aplicar reescrita ao Body
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}