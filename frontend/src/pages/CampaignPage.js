// src/pages/CampaignPage.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';

function CampaignPage() {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [channel, setChannel] = useState('whatsapp'); // default
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const res = await axios.get('http://localhost:3001/templates');
        setTemplates(res.data);
      } catch (err) {
        console.error('Erro ao buscar templates', err);
      }
    }
    fetchTemplates();
  }, []);

  const handleStartCampaign = async () => {
    if (!selectedTemplate) return alert('Selecione um template');

    try {
      setSending(true);
      const res = await axios.post('http://localhost:3001/campaign', {
        templateSid: selectedTemplate,
        channel
      });
      alert(res.data.message);
    } catch (err) {
      console.error(err);
      alert('Erro ao disparar campanha');
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <h2>Disparar Campanha</h2>

      <label>Template:</label>
      <select value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)}>
        <option value="">Selecione</option>
        {templates.map(t => (
          <option key={t.sid} value={t.sid}>
            {t.friendly_name}
          </option>
        ))}
      </select>

      <div style={{ marginTop: 10 }}>
        <label>Canal:</label>
        <select value={channel} onChange={e => setChannel(e.target.value)}>
          <option value="whatsapp">WhatsApp</option>
          <option value="sms">SMS</option>
        </select>
      </div>

      <button onClick={handleStartCampaign} disabled={sending} style={{ marginTop: 20 }}>
        {sending ? 'Enviando...' : 'Iniciar Campanha'}
      </button>

      {progress && (
        <div style={{ marginTop: 20 }}>
          <p>Enviadas: {progress.sent}</p>
          <p>Falhas: {progress.failed}</p>
        </div>
      )}
    </div>
  );
}

export default CampaignPage;

