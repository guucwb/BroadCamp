import { useState } from 'react';

function SuggestionPage() {
  const [suggestion, setSuggestion] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchSuggestion = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/ai/suggest-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: "Olá {{nome}}, aproveite 20% de desconto até hoje!",
          audience: {
            tone: "casual",
            region: "Brasil"
          }
        })
      });

      const data = await res.json();
      setSuggestion(data.suggestion || "Nenhuma sugestão gerada.");
    } catch (err) {
      console.error(err);
      setSuggestion("Erro ao buscar sugestão.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Sugestão de Copy com IA</h2>
      <button onClick={fetchSuggestion} disabled={loading}>
        {loading ? "Gerando..." : "Gerar sugestão"}
      </button>
      {suggestion && (
        <div style={{ marginTop: '1rem', background: '#eee', padding: '1rem' }}>
          <strong>Sugestão:</strong>
          <p>{suggestion}</p>
        </div>
      )}
    </div>
  );
}

export default SuggestionPage;
