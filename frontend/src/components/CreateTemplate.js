import React, { useState } from 'react';

function CreateTemplate() {
  const [friendlyName, setFriendlyName] = useState('');
  const [language, setLanguage] = useState('pt_BR');
  const [category, setCategory] = useState('TRANSACTIONAL');
  const [bodyText, setBodyText] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!friendlyName || !language || !category || !bodyText) {
      alert('Preencha todos os campos!');
      return;
    }

    try {
      const res = await fetch('http://localhost:3001/api/templates/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendlyName, language, category, bodyText })
      });

      const data = await res.json();
      alert(data.message || 'Template criado com sucesso!');
      
      // Resetar campos
      setFriendlyName('');
      setLanguage('pt_BR');
      setCategory('TRANSACTIONAL');
      setBodyText('');
    } catch (error) {
      console.error('Erro ao criar template:', error);
      alert('Erro ao criar template');
    }
  };

  return (
    <div className="p-4 border rounded mt-6">
      <h2 className="text-lg font-bold mb-2">Criar Novo Template</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          type="text"
          placeholder="Nome amigável"
          value={friendlyName}
          onChange={(e) => setFriendlyName(e.target.value)}
          className="border p-2 rounded"
        />

        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="pt_BR">pt_BR</option>
          <option value="en">en</option>
          <option value="es">es</option>
        </select>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="TRANSACTIONAL">TRANSACTIONAL</option>
          <option value="MARKETING">MARKETING</option>
          <option value="UTILITY">UTILITY</option>
        </select>

        <textarea
          placeholder="Corpo do template (ex: Olá {{1}}, seu pedido {{2}} chegou!)"
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
          className="border p-2 rounded"
        />

        <button
          type="submit"
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          Criar Template
        </button>
      </form>
    </div>
  );
}

export default CreateTemplate;

