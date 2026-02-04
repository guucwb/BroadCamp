// frontend/src/pages/RunsPage.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';

const badgeStyle = (status) => {
  const base = {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
  };
  const map = {
    queued:   { background: '#fef9c3', color: '#854d0e', border: '1px solid #fde68a' },
    running:  { background: '#dbeafe', color: '#1e40af', border: '1px solid #bfdbfe' },
    done:     { background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' },
    stopped:  { background: '#e5e7eb', color: '#374151', border: '1px solid #d1d5db' },
    failed:   { background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' },
  };
  return { ...base, ...(map[status] || map.queued) };
};

const percent = (r) => {
  const tot = Number(r?.total || 0);
  if (tot <= 0) return 0;
  const p = Math.round((Number(r?.processed || 0) / tot) * 100);
  return Math.max(0, Math.min(100, p));
};

export default function RunsPage() {
  const [runs, setRuns] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const inProgress = useMemo(
    () => runs.filter(r => r.status === 'running' || r.status === 'queued').length,
    [runs]
  );

  const fetchRuns = useCallback(async () => {
    try {
      const r = await fetch('/api/runs');
      const json = await r.json();
      setRuns(Array.isArray(json) ? json : (json.runs || []));
    } catch (e) {
      console.error('Falha ao buscar runs', e);
    }
  }, []);

  const refreshOne = useCallback(async (id) => {
    try {
      const r = await fetch(`/api/runs/${id}`);
      if (!r.ok) throw new Error('not ok');
      const one = await r.json();
      setRuns(prev => prev.map(x => (x.id === id ? one : x)));
    } catch (e) {
      console.error('Falha ao atualizar run', id, e);
    }
  }, []);

  const stopRun = useCallback(async (id) => {
    if (!window.confirm('Parar esta execução agora?')) return;
    try {
      await fetch(`/api/runs/${id}/stop`, { method: 'POST' });
      refreshOne(id);
    } catch (e) {
      alert('Não foi possível parar a execução.');
    }
  }, [refreshOne]);

  const exportRun = useCallback(async (id) => {
    try {
      const res = await fetch(`/api/runs/${id}/export`);
      const text = await res.text();
      const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${id}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      alert('Falha ao exportar CSV.');
    }
  }, []);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchRuns, 2500);
    return () => clearInterval(id);
  }, [autoRefresh, fetchRuns]);

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>
          Execuções <span style={{ color: '#64748b', fontSize: 14 }}>({inProgress} em andamento)</span>
        </h2>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 13 }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>
          <button className="btn" onClick={fetchRuns}>Atualizar tudo</button>
        </div>
      </div>

      <div style={{ height: 12 }} />

      {runs.length === 0 && (
        <div style={{ color: '#64748b', fontSize: 14 }}>Nenhuma execução ainda.</div>
      )}

      <div style={{ display: 'grid', gap: 16 }}>
        {runs.map((r) => {
          const p = percent(r);
          const canStop = r.status === 'queued' || r.status === 'running';
          return (
            <div
              key={r.id}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                background: '#fff',
                padding: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>ID:</span>
                    <span style={{ fontFamily: 'monospace', color: '#334155' }}>{r.id}</span>
                    <span style={badgeStyle(r.status)}>{r.status}</span>
                  </div>
                  <div style={{ marginTop: 4, color: '#64748b', fontSize: 13 }}>
                    <strong>Flow:</strong> {r.flowName || r.flowId || '—'} &nbsp;•&nbsp; 
                    <strong>Início:</strong> {r.startedAt ? new Date(r.startedAt).toLocaleString() : '—'} &nbsp;•&nbsp; 
                    <strong>Atualização:</strong> {r.updatedAt ? new Date(r.updatedAt).toLocaleString() : '—'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn" onClick={() => exportRun(r.id)}>Exportar</button>
                  {canStop && <button className="btn danger" onClick={() => stopRun(r.id)}>Parar</button>}
                  <button className="btn" onClick={() => refreshOne(r.id)}>Atualizar</button>
                </div>
              </div>

              <div style={{ height: 10 }} />

              <div
                style={{
                  height: 8,
                  background: '#f1f5f9',
                  borderRadius: 999,
                  overflow: 'hidden',
                  border: '1px solid #e2e8f0',
                }}
                aria-label="progress"
              >
                <div
                  style={{
                    width: `${p}%`,
                    height: '100%',
                    background: '#3b82f6',
                    transition: 'width .25s ease',
                  }}
                />
              </div>

              <div style={{ marginTop: 6, color: '#475569', fontSize: 13 }}>
                Progresso: {r.processed || 0} de {r.total || 0} ({p}%)
              </div>

              {(r.error || r.lastError) && (
                <div
                  style={{
                    marginTop: 10,
                    background: '#fee2e2',
                    color: '#991b1b',
                    border: '1px solid #fecaca',
                    borderRadius: 8,
                    padding: '10px 12px',
                    fontSize: 13,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  <strong>Erro:</strong> {String(r.error || r.lastError)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}