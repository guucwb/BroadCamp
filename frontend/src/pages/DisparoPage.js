// frontend/src/pages/DisparoPage.js
import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';

export default function DisparoPage() {
  const [file, setFile] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [channel, setChannel] = useState('sms'); // 'sms' | 'whatsapp'
  const [variables, setVariables] = useState([]); // placeholders extraídos do template
  const [columnMapping, setColumnMapping] = useState([]); // mapeia placeholder -> coluna CSV
  const [preview, setPreview] = useState('');
  const [invalidNumbers, setInvalidNumbers] = useState([]);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState([]); // [{to, ok, sid, error}]

  useEffect(() => {
    fetch('/api/templates/list')
      .then(res => res.json())
      .then(data => setTemplates(data.contents || []));
  }, []);

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    setFile(uploadedFile);

    Papa.parse(uploadedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvData(results.data);
        setInvalidNumbers([]); // limpa anteriores
      }
    });
  };

  const handleTemplateChange = (e) => {
    const sid = e.target.value;
    setSelectedTemplate(sid);

    if (!sid) {
      setVariables([]);
      setColumnMapping([]);
      setPreview('');
      return;
    }

    const found = templates.find(t => t.sid === sid);
    const templateBody = Object.values(found.types || {})[0]?.body || '';

    // extrai placeholders entre {{ ... }}
    const matches = templateBody.match(/{{(.*?)}}/g) || [];
    const cleaned = matches.map(v => v.replace(/{{|}}/g, '').trim());
    setVariables(cleaned);
    setColumnMapping(Array(cleaned.length).fill(''));
    updatePreview(cleaned, Array(cleaned.length).fill(''), templateBody);
  };

  const handleMappingChange = (index, value) => {
    const updated = [...columnMapping];
    updated[index] = value;
    setColumnMapping(updated);
    const found = templates.find(t => t.sid === selectedTemplate);
    const templateBody = Object.values(found?.types || {})[0]?.body || '';
    updatePreview(variables, updated, templateBody);
  };

  const updatePreview = (vars, map, templateBody) => {
    if (!selectedTemplate || csvData.length === 0) {
      setPreview('');
      return;
    }
    let body = templateBody || '';
    vars.forEach((v, i) => {
      const col = map[i];
      const valor = (col ? (csvData[0]?.[col] ?? '') : '');
      const regex = new RegExp(`{{\\s*${escapeRegExp(v)}\\s*}}`, 'g');
      body = body.replace(regex, String(valor));
    });
    setPreview(body);
  };

  const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const isValidE164 = (num) => /^\+\d{10,15}$/.test(String(num || '').trim());

  // Monta objeto de variáveis para o Twilio Content API (sem body!)
  const buildVariablesObject = (row) => {
    const obj = {};
    variables.forEach((placeholder, i) => {
      const col = columnMapping[i];
      const value = col ? (row[col] ?? '') : '';
      // Se o placeholder for "1", "2", etc., a chave vira "1", "2".
      // Se for "first_name", a chave será "first_name".
      obj[String(placeholder)] = String(value);
    });
    return obj;
  };

  const handleDownloadInvalids = () => {
    const csv = Papa.unparse(invalidNumbers.map(({ row, to }) => ({ ...row, telefone: to })));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'numeros_invalidos.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = async () => {
    if (!file || !selectedTemplate || !channel) {
      alert('Preencha todos os campos.');
      return;
    }

    // valida seleção de colunas para todas as variáveis
    if (variables.length > 0 && columnMapping.some(m => !m)) {
      alert('Mapeie todas as variáveis do template para colunas do CSV.');
      return;
    }

    // Gere a lista de destino e variáveis por linha
    const rows = csvData || [];
    const targets = rows.map(row => {
      const to = row.telefone || row.phone || row.numero || row['número'] || row['Número'] || row['Telefone'];
      return { to: String(to || '').trim(), row, vars: buildVariablesObject(row) };
    });

    // valida E.164
    const invalids = targets.filter(t => !isValidE164(t.to));
    if (invalids.length > 0) {
      setInvalidNumbers(invalids.map(({ row, to }) => ({ row, to })));
      alert(`Existem ${invalids.length} número(s) inválido(s). Corrija antes de enviar.`);
      return;
    }

    setSending(true);
    setResults([]);

    try {
      if (channel === 'whatsapp') {
        // 🚫 NÃO enviar body aqui. Apenas contentSid + variables.
        const contentSid = selectedTemplate;

        const promises = targets.map(async (t) => {
          try {
            const resp = await fetch('/api/send/wa-template', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: t.to,
                contentSid,
                variables: t.vars
              })
            });
            const json = await resp.json().catch(() => ({}));
            if (!resp.ok) throw new Error(json.error || `HTTP ${resp.status}`);
            return { to: t.to, ok: true, sid: json.sid || null };
          } catch (e) {
            return { to: t.to, ok: false, error: e.message };
          }
        });

        const settled = await Promise.allSettled(promises);
        const flat = settled.map(s => (s.status === 'fulfilled' ? s.value : { ok: false, error: s.reason?.message }));
        setResults(flat);

        const okCount = flat.filter(x => x?.ok).length;
        const failCount = flat.length - okCount;
        alert(`WhatsApp: ${okCount} enviados, ${failCount} falharam.`);

      } else if (channel === 'sms') {
        // Para SMS, podemos usar o preview como body (texto puro)
        const found = templates.find(t => t.sid === selectedTemplate);
        const templateBody = Object.values(found.types || {})[0]?.body || '';

        const promises = targets.map(async (t) => {
          // render simples por linha (reuso do templateBody)
          let body = templateBody;
          Object.entries(t.vars).forEach(([k, v]) => {
            const regex = new RegExp(`{{\\s*${escapeRegExp(k)}\\s*}}`, 'g');
            body = body.replace(regex, String(v));
          });

          try {
            const resp = await fetch('/api/send/wa-text', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ to: t.to, body })
            });
            const json = await resp.json().catch(() => ({}));
            if (!resp.ok) throw new Error(json.error || `HTTP ${resp.status}`);
            return { to: t.to, ok: true, sid: json.sid || null };
          } catch (e) {
            return { to: t.to, ok: false, error: e.message };
          }
        });

        const settled = await Promise.allSettled(promises);
        const flat = settled.map(s => (s.status === 'fulfilled' ? s.value : { ok: false, error: s.reason?.message }));
        setResults(flat);

        const okCount = flat.filter(x => x?.ok).length;
        const failCount = flat.length - okCount;
        alert(`SMS: ${okCount} enviados, ${failCount} falharam.`);
      } else {
        alert('Canal inválido.');
      }
    } catch (err) {
      console.error('Erro na campanha:', err);
      alert('Erro inesperado ao enviar campanha. Veja o console para mais detalhes.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="send-campaign-wrapper">
      <h2>Disparar Campanha</h2>

      <div className="form-section">
        <label>Upload CSV</label>
        <input type="file" accept=".csv" onChange={handleFileUpload} />
      </div>

      <div className="form-section">
        <label>Template</label>
        <select value={selectedTemplate} onChange={handleTemplateChange}>
          <option value="">Selecione um template</option>
          {templates.map(t => (
            <option key={t.sid} value={t.sid}>{t.friendly_name}</option>
          ))}
        </select>
      </div>

      <div className="form-section">
        <label>Canal</label>
        <select value={channel} onChange={e => setChannel(e.target.value)}>
          <option value="sms">SMS (texto)</option>
          <option value="whatsapp">WhatsApp (template c/ botões)</option>
        </select>
      </div>

      {variables.length > 0 && (
        <div className="variable-mapping">
          <h4>Mapeamento de Variáveis</h4>
          {variables.map((v, i) => (
            <div className="variable-row" key={i}>
              <label>{v}:</label>
              <select value={columnMapping[i]} onChange={e => handleMappingChange(i, e.target.value)}>
                <option value="">Selecione uma coluna</option>
                {csvData.length > 0 && Object.keys(csvData[0]).map((col, idx) => (
                  <option key={idx} value={col}>{col}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      {preview && (
        <div className="form-section">
          <label>Prévia da Mensagem (texto renderizado)</label>
          <div className="preview-box">{preview}</div>
          {channel === 'whatsapp' && (
            <p style={{ fontSize: 12, color: '#666' }}>
              *No WhatsApp com template, a prévia acima é só visual; o envio real usa Content Template (botões aparecem no aparelho).
            </p>
          )}
        </div>
      )}

      <button className="send-btn" onClick={handleSubmit} disabled={sending}>
        {sending ? 'Enviando…' : 'Iniciar Campanha'}
      </button>

      {invalidNumbers.length > 0 && (
        <div className="invalid-section">
          <p>{invalidNumbers.length} número(s) inválido(s) encontrados.</p>
          <button onClick={handleDownloadInvalids}>Baixar números inválidos</button>
        </div>
      )}

      {results.length > 0 && (
        <div className="results">
          <h4>Resultados</h4>
          <ul>
            {results.map((r, i) => (
              <li key={i}>
                {r.to}: {r.ok ? `OK (sid: ${r.sid || '—'})` : `ERRO (${r.error})`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}