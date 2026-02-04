import React, { useEffect, useState } from 'react';

function TemplateList({ onSelectTemplate }) {
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/templates/list');
        const data = await res.json();
        setTemplates(data.contents);
      } catch (error) {
        console.error('Erro ao carregar templates:', error);
      }
    };

    fetchTemplates();
  }, []);

  return (
    <div className="p-4 mt-6 border rounded">
      <h2 className="text-lg font-bold mb-2">Templates Disponíveis</h2>
      <ul>
        {templates && templates.length > 0 ? (
          templates.map((tpl) => (
            <li key={tpl.sid} className="mb-2 border p-2 rounded">
              <strong>{tpl.friendly_name}</strong> — {tpl.language}
              <br />
              SID: {tpl.sid}
              <br />
              <button
                className="mt-2 bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                onClick={() => onSelectTemplate(tpl)}
              >
                Selecionar
              </button>
            </li>
          ))
        ) : (
          <li>Nenhum template encontrado.</li>
        )}
      </ul>
    </div>
  );
}

export default TemplateList;

