// frontend/src/pages/JourneysPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const fmtDate = (iso) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
};

export default function JourneysPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyIds, setBusyIds] = useState(new Set()); // ids com ação em andamento
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');

  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
      ),
    [items]
  );

  const fetchList = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/journeys');
      const data = await r.json();
      // /api/journeys GET retorna [{id,name,updatedAt}]
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const markBusy = (id, on = true) =>
    setBusyIds((s) => {
      const n = new Set(s);
      on ? n.add(id) : n.delete(id);
      return n;
    });

  const openBuilder = (flow) => navigate(`/journeys/builder?id=${flow.id}`);
  const newFlow = () => navigate('/journeys/builder?new=1');

  const exportFlow = async (flow) => {
    markBusy(flow.id, true);
    try {
      const r = await fetch(`/api/journeys/${flow.id}`);
      if (!r.ok) throw new Error('Falha ao carregar flow');
      const full = await r.json();
      const blob = new Blob([JSON.stringify(full, null, 2)], {
        type: 'application/json',
      });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${(flow.name || 'flow').replace(/\s+/g, '_')}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      alert(e.message || 'Erro ao exportar');
    } finally {
      markBusy(flow.id, false);
    }
  };

  const duplicateFlow = async (flow) => {
    markBusy(flow.id, true);
    try {
      const r = await fetch(`/api/journeys/${flow.id}/duplicate`, {
        method: 'POST',
      });
      if (!r.ok) throw new Error('Erro ao duplicar');
      await fetchList();
    } catch (e) {
      alert(e.message || 'Erro ao duplicar');
    } finally {
      markBusy(flow.id, false);
    }
  };

  const deleteFlow = async (flow) => {
    if (!window.confirm(`Apagar "${flow.name}"?`)) return;
    markBusy(flow.id, true);
    try {
      const r = await fetch(`/api/journeys/${flow.id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('Erro ao apagar');
      setItems((arr) => arr.filter((x) => x.id !== flow.id));
    } catch (e) {
      alert(e.message || 'Erro ao apagar');
    } finally {
      markBusy(flow.id, false);
    }
  };

  // 🔥 Disparar execução (usa "flow" corretamente — nada de "row")
  const triggerRun = async (flow) => {
    markBusy(flow.id, true);
    try {
      const r = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flowId: flow.id }),
      });
      if (!r.ok) {
        const t = await r.text();
        throw new Error(t || 'Erro ao criar execução');
      }
      // vai para a tela de Execuções (ela já tem auto-refresh na sua UI)
      navigate('/runs');
    } catch (e) {
      alert(e.message || 'Erro ao disparar');
    } finally {
      markBusy(flow.id, false);
    }
  };

  const beginEdit = (flow) => {
    setEditingId(flow.id);
    setEditingName(flow.name || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const confirmEdit = async () => {
    const id = editingId;
    const name = editingName.trim();
    if (!id) return;
    if (!name) return alert('Nome não pode ser vazio.');
    markBusy(id, true);
    try {
      const r = await fetch(`/api/journeys/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!r.ok) throw new Error('Erro ao renomear');
      setItems((arr) => arr.map((x) => (x.id === id ? { ...x, name } : x)));
      cancelEdit();
    } catch (e) {
      alert(e.message || 'Erro ao renomear');
    } finally {
      markBusy(id, false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h2 style={{ margin: 0 }}>Journeys</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={fetchList}>Atualizar</button>
          <button className="btn" onClick={newFlow}>+ Novo Flow</button>
        </div>
      </div>

      {loading ? (
        <div style={{ color: '#64748b' }}>Carregando…</div>
      ) : sorted.length === 0 ? (
        <div style={{ color: '#64748b' }}>Nenhum flow ainda. Clique em “+ Novo Flow”.</div>
      ) : (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 10 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 220px 420px',
              gap: 0,
              padding: '10px 14px',
              borderBottom: '1px solid #e5e7eb',
              fontWeight: 600,
            }}
          >
            <div>Nome</div>
            <div>Atualizado em</div>
            <div style={{ textAlign: 'right', paddingRight: 8 }}>Ações</div>
          </div>

          {sorted.map((flow) => {
            const busy = busyIds.has(flow.id);
            return (
              <div
                key={flow.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 220px 420px',
                  gap: 0,
                  padding: '12px 14px',
                  borderBottom: '1px solid #f1f5f9',
                  alignItems: 'center',
                }}
              >
                <div>
                  {editingId === flow.id ? (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: 280 }}
                        autoFocus
                      />
                      <button className="btn" onClick={confirmEdit} disabled={busy}>✔</button>
                      <button className="btn secondary" onClick={cancelEdit} disabled={busy}>✖</button>
                    </div>
                  ) : (
                    <button
                      className="btn linklike"
                      onClick={() => beginEdit(flow)}
                      title="Clique para renomear"
                      style={{ cursor: 'text', textDecoration: 'underline', color: '#111827', background: 'transparent', border: 'none', padding: 0 }}
                    >
                      {flow.name || 'Sem nome'}
                    </button>
                  )}
                </div>

                <div style={{ color: '#64748b' }}>{fmtDate(flow.updatedAt)}</div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn" onClick={() => openBuilder(flow)} disabled={busy}>Abrir</button>
                  <button className="btn secondary" onClick={() => exportFlow(flow)} disabled={busy}>Exportar</button>
                  <button className="btn secondary" onClick={() => duplicateFlow(flow)} disabled={busy}>Duplicar</button>
                  <button className="btn danger" onClick={() => deleteFlow(flow)} disabled={busy}>Apagar</button>
                  <button className="btn" onClick={() => triggerRun(flow)} disabled={busy}>Disparar</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* CSS util (opcional): adicione estas classes no seu global.css se quiser
.btn { background:#2563eb; color:#fff; border:none; border-radius:8px; padding:8px 12px; cursor:pointer }
.btn.secondary { background:#eef2ff; color:#1e3a8a }
.btn.danger { background:#ef4444 }
.btn.linklike { background:transparent; color:#111827 }
.btn:disabled { opacity:.6; cursor:not-allowed }
*/