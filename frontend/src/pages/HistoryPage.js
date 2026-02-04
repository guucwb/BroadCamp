// HistoryPage.js avançado com visual refinado
import React, { useEffect, useState } from 'react';
import { saveAs } from 'file-saver';

export default function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [templateMap, setTemplateMap] = useState({});
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [templateFilter, setTemplateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    fetch('/api/history')
      .then(res => res.json())
      .then(data => setHistory(data))
      .catch(err => console.error('Erro ao buscar histórico:', err));
  }, []);

  useEffect(() => {
    fetch('/api/templates/list')
      .then(res => res.json())
      .then(data => {
        const map = {};
        data.contents.forEach(t => {
          map[t.sid] = {
            friendlyName: t.friendly_name,
            body: Object.values(t.types)[0]?.body || ''
          };
        });
        setTemplateMap(map);
      })
      .catch(err => console.error('Erro ao buscar templates:', err));
  }, []);

  const exportCSV = () => {
    const rows = [["Data", "Template", "Canal", "Total", "Destinatário"]];
    filteredHistory.forEach(item => {
      item.recipients.forEach(recipient => {
        rows.push([
          new Date(item.timestamp).toLocaleString(),
          templateMap[item.templateSid]?.friendlyName || item.templateSid,
          item.channel,
          item.total,
          recipient
        ]);
      });
    });
    const csvContent = rows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `historico_disparos_${Date.now()}.csv`);
  };

  const filteredHistory = history.filter(item => {
    const itemDate = new Date(item.timestamp);
    if (startDate && itemDate < new Date(startDate)) return false;
    if (endDate && itemDate > new Date(endDate)) return false;
    if (templateFilter && !(templateMap[item.templateSid]?.friendlyName || '').toLowerCase().includes(templateFilter.toLowerCase())) return false;
    return true;
  });

  const paginatedHistory = filteredHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);

  return (
    <div className="min-h-screen bg-[#f8f9fb] font-sans text-gray-800">
      <div className="p-8 max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center text-gray-900">Histórico de Campanhas</h1>

        <div className="flex flex-wrap gap-6 items-end mb-8 bg-white p-6 rounded-2xl shadow-md ring-1 ring-gray-200">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data início:</label>
            <input type="date" className="border border-gray-300 rounded-md px-3 py-2 w-44 shadow-sm focus:ring-2 focus:ring-blue-500" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data fim:</label>
            <input type="date" className="border border-gray-300 rounded-md px-3 py-2 w-44 shadow-sm focus:ring-2 focus:ring-blue-500" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por template:</label>
            <input type="text" placeholder="Ex: pedido_confirmado" className="border border-gray-300 rounded-md px-3 py-2 w-56 shadow-sm focus:ring-2 focus:ring-blue-500" value={templateFilter} onChange={e => setTemplateFilter(e.target.value)} />
          </div>
          <button className="ml-auto bg-blue-600 text-white px-5 py-2 rounded-md shadow hover:bg-blue-700 transition" onClick={exportCSV}>
            Exportar CSV
          </button>
        </div>

        {paginatedHistory.length === 0 ? (
          <p className="text-gray-500 text-center">Nenhum histórico encontrado no período.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {paginatedHistory.map((item, index) => (
              <div key={index} className="bg-white border rounded-2xl shadow-md p-6 hover:shadow-lg transition-all ring-1 ring-gray-200">
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                  <span className="text-sm text-gray-500">{new Date(item.timestamp).toLocaleString()}</span>
                  <span className={`text-xs px-3 py-1 rounded-full font-semibold uppercase ${item.channel === 'sms' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{item.channel}</span>
                </div>
                <div className="mb-2">
                  <span className="font-semibold">Template:</span>
                  <span className="ml-2 text-gray-800">{templateMap[item.templateSid]?.friendlyName || item.templateSid}</span>
                </div>
                <div className="mb-2">
                  <span className="font-semibold">Prévia:</span>
                  <span className="ml-2 italic text-gray-600">{templateMap[item.templateSid]?.body || 'Sem preview disponível'}</span>
                </div>
                <div className="mb-2">
                  <span className="font-semibold">Total de destinatários:</span>
                  <span className="ml-2 text-gray-800">{item.total}</span>
                </div>
                <details className="text-sm mt-3">
                  <summary className="cursor-pointer text-blue-600 hover:underline">Ver destinatários</summary>
                  <ul className="ml-4 mt-2 list-disc text-gray-700">
                    {item.recipients.map((r, i) => (
                      <li key={i} className="flex items-center gap-2">
                        {r}
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">entregue</span>
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center mt-10 gap-2">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                  currentPage === i + 1
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

