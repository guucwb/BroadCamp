// frontend/src/pages/JourneyBuilder.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
  MarkerType,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import Papa from 'papaparse';

// === util ===
const PIN = 14;
const uid = (p) => `${p}_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
const slug = (s) =>
  String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\w]/g, '_')
    .replace(/_+/g, '_');

const NodeShell = ({ title, subtitle, selected, children }) => (
  <div
    style={{
      background: '#fff',
      border: selected ? '2px solid #2563eb' : '1px solid #e5e7eb',
      borderRadius: 12,
      width: 320,
      boxShadow: '0 2px 8px rgba(0,0,0,.06)',
    }}
  >
    <div style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{ fontWeight: 700, color: '#0f172a' }}>{title}</div>
      {subtitle ? <div style={{ fontSize: 12, color: '#64748b' }}>{subtitle}</div> : null}
    </div>
    <div style={{ padding: 12 }}>{children}</div>
  </div>
);

// === node components ===
const AudienceNode = ({ selected }) => (
  <NodeShell title="Audiência" subtitle="CSV → variáveis" selected={selected}>
    <div style={{ fontSize: 12, color: '#475569' }}>
      Faça upload e mapeie colunas no painel ao lado.
    </div>
    <Handle
      type="source"
      id="out"
      position={Position.Right}
      style={{ background: '#16a34a', width: PIN, height: PIN, border: '2px solid #fff' }}
    />
  </NodeShell>
);

const MessageNode = ({ data, selected }) => (
  <NodeShell
    title={data.label || 'Mensagem'}
    subtitle={`Canal: ${String(data.channel || 'whatsapp').toUpperCase()} • Tipo: ${data.mode || 'text'}`}
    selected={selected}
  >
    <div style={{ fontSize: 12, color: '#475569' }}>Conteúdo configurável no painel ao lado.</div>
    <Handle
      type="target"
      id="in"
      position={Position.Left}
      style={{ background: '#6b7280', width: PIN, height: PIN, border: '2px solid #fff' }}
    />
    <Handle
      type="source"
      id="out"
      position={Position.Right}
      style={{ background: '#16a34a', width: PIN, height: PIN, border: '2px solid #fff' }}
    />
  </NodeShell>
);

const ApiNode = ({ selected }) => (
  <NodeShell title="API Call" selected={selected}>
    <div style={{ fontSize: 12, color: '#475569' }}>
      Configure método/URL no painel ao lado. Salva variáveis via mapeamentos.
    </div>
    <Handle
      type="target"
      id="in"
      position={Position.Left}
      style={{ background: '#6b7280', width: PIN, height: PIN, border: '2px solid #fff' }}
    />
    <Handle
      type="source"
      id="out"
      position={Position.Right}
      style={{ background: '#16a34a', width: PIN, height: PIN, border: '2px solid #fff' }}
    />
  </NodeShell>
);

const CodeNode = ({ selected }) => (
  <NodeShell title="Code" subtitle="JS custom" selected={selected}>
    <div style={{ fontSize: 12, color: '#475569' }}>
      Cole seu JS no painel ao lado. Deve retornar um objeto de variáveis.
    </div>
    <Handle
      type="target"
      id="in"
      position={Position.Left}
      style={{ background: '#6b7280', width: PIN, height: PIN, border: '2px solid #fff' }}
    />
    <Handle
      type="source"
      id="out"
      position={Position.Right}
      style={{ background: '#16a34a', width: PIN, height: PIN, border: '2px solid #fff' }}
    />
  </NodeShell>
);

const DelayNode = ({ data, selected }) => (
  <NodeShell title="Delay" subtitle={data?.summary || ''} selected={selected}>
    <div style={{ fontSize: 12, color: '#475569' }}>Espera antes de seguir para o próximo nó.</div>
    <Handle
      type="target"
      id="in"
      position={Position.Left}
      style={{ background: '#6b7280', width: PIN, height: PIN, border: '2px solid #fff' }}
    />
    <Handle
      type="source"
      id="out"
      position={Position.Right}
      style={{ background: '#16a34a', width: PIN, height: PIN, border: '2px solid #fff' }}
    />
  </NodeShell>
);

const WaitNode = ({ data, selected }) => (
  <NodeShell
    title="Wait & Reply"
    subtitle="aguarda resposta e ramifica"
    selected={selected}
  >
    <div style={{ fontSize: 12, color: '#475569' }}>
      Conecte <em>múltiplos</em> edges para as rotas e edite a condição no edge.
    </div>
    <Handle
      type="target"
      id="in"
      position={Position.Left}
      style={{ background: '#6b7280', width: PIN, height: PIN, border: '2px solid #fff' }}
    />
    <Handle
      type="source"
      id="out"
      position={Position.Right}
      style={{ background: '#16a34a', width: PIN, height: PIN, border: '2px solid #fff' }}
    />
  </NodeShell>
);

const EndNode = ({ selected }) => (
  <NodeShell title="End" subtitle="término do fluxo" selected={selected}>
    <div style={{ fontSize: 12, color: '#475569' }}>Nó terminal. Só recebe conexões.</div>
    <Handle
      type="target"
      id="in"
      position={Position.Left}
      style={{ background: '#6b7280', width: PIN, height: PIN, border: '2px solid #fff' }}
    />
  </NodeShell>
);

// === side panels ===
function AudiencePanel({ node, patchNode, inputStyle, label, slugFn }) {
  const d = node.data || {};
  const [headers, setHeaders] = useState(d.headers || []);
  const [rows, setRows] = useState(d.rows || []);
  const [allRows, setAllRows] = useState(d.allRows || []);
  const [mapping, setMapping] = useState(d.mapping || {});
  const [phoneKey, setPhoneKey] = useState(d.phoneKey || '');

  useEffect(() => {
    setHeaders(d.headers || []);
    setRows(d.rows || []);
    setMapping(d.mapping || {});
    setPhoneKey(d.phoneKey || '');
    // eslint-disable-next-line
  }, [node.id]);

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const hs = res.meta.fields || Object.keys(res.data[0] || {});
        const guess = {};
        hs.forEach((h) => (guess[h] = slugFn(h)));
        const pk = hs.find((h) => /phone|telefone|celular|numero|n[uú]mero/i.test(h)) || '';
        setHeaders(hs);
        setRows(res.data.slice(0, 5));
        setAllRows(res.data);
        setMapping(guess);
        setPhoneKey(pk);
      },
    });
  };

  const saveMap = () => {
    if (!phoneKey) return alert('Escolha a coluna de telefone.');
    patchNode(node.id, { headers, rows, mapping, phoneKey, allRows });
    alert('Mapeamento salvo.');
  };

  return (
    <>
      {label('Arquivo CSV')}
      <input type="file" accept=".csv" onChange={onFile} />

      {headers.length > 0 && (
        <>
          {label('Coluna de telefone')}
          <select style={inputStyle} value={phoneKey} onChange={(e) => setPhoneKey(e.target.value)}>
            <option value="">— selecione —</option>
            {headers.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>

          {label('Mapeamento (coluna → variável)')}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 20px 1fr',
              gap: 8,
              maxHeight: 200,
              overflow: 'auto',
            }}
          >
            {headers.map((h) => (
              <React.Fragment key={h}>
                <div style={{ alignSelf: 'center', fontSize: 13 }}>{h}</div>
                <div style={{ textAlign: 'center', color: '#94a3b8' }}>→</div>
                <input
                  style={inputStyle}
                  value={mapping[h] || ''}
                  placeholder={slugFn(h)}
                  onChange={(e) => setMapping((m) => ({ ...m, [h]: slugFn(e.target.value) }))}
                />
              </React.Fragment>
            ))}
          </div>

          <button className="btn" onClick={saveMap} style={{ marginTop: 10 }}>
            Salvar mapeamento
          </button>

          {rows.length > 0 && (
            <>
              {label('Amostra (5 primeiras linhas)')}
              <pre
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: 10,
                  fontSize: 12,
                  maxHeight: 160,
                  overflow: 'auto',
                }}
              >
                {JSON.stringify(rows, null, 2)}
              </pre>
            </>
          )}
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
            Use as variáveis com <code>{'{{minha_variavel}}'}</code>.
          </div>
        </>
      )}
    </>
  );
}

// === principal ===
export default function JourneyBuilder() {
  const navigate = useNavigate();
  const [nodes, setNodes, onNodesChangeBase] = useNodesState([]);
  const [edges, setEdges, onEdgesChangeBase] = useEdgesState([]);

  const [flowId, setFlowId] = useState(null);
  const [flowName, setFlowName] = useState('Novo Flow');
  const [drawerNodeId, setDrawerNodeId] = useState(null);
  const [drawerEdgeId, setDrawerEdgeId] = useState(null);
  const [dirty, setDirty] = useState(false);
  const initializedRef = useRef(false);
  const rfInstanceRef = useRef(null);

  // palette drag type
  const dragType = useRef(null);

  // templates (Twilio)
  const [templates, setTemplates] = useState([]);
  useEffect(() => {
    fetch('/api/templates/list')
      .then((r) => r.json())
      .then((data) => setTemplates(data.contents || []))
      .catch(() => setTemplates([]));
  }, []);

  const nodeTypes = useMemo(
    () => ({
      audience: AudienceNode,
      message: MessageNode,
      api: ApiNode,
      code: CodeNode,
      delay: DelayNode,
      wait: WaitNode,
      end: EndNode,
    }),
    []
  );

  // init: se ?id carrega; se ?new, cria com Audiência; default idem
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const sp = new URLSearchParams(window.location.search);
    const id = sp.get('id');
    const isNew = sp.get('new') === '1';

    const seedAudience = () => {
      const audId = uid('aud');
      setNodes([{ id: audId, type: 'audience', position: { x: 120, y: 160 }, data: {} }]);
      setEdges([]);
      setTimeout(() => rfInstanceRef.current?.fitView({ padding: 0.2 }), 50);
    };

    if (id) {
      setFlowId(id);
      fetch(`/api/journeys/${id}`)
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((f) => {
          if (Array.isArray(f.nodes) && Array.isArray(f.edges)) {
            setNodes(f.nodes);
            setEdges(f.edges);
            setFlowName(f.name || 'Flow');
            setTimeout(() => rfInstanceRef.current?.fitView({ padding: 0.2 }), 60);
          } else seedAudience();
        })
        .catch(() => {
          const raw = localStorage.getItem(id);
          if (raw) {
            try {
              const f = JSON.parse(raw);
              setNodes(f.nodes || []);
              setEdges(f.edges || []);
              setFlowName(f.name || 'Flow');
            } catch {
              seedAudience();
            }
          } else seedAudience();
          setTimeout(() => rfInstanceRef.current?.fitView({ padding: 0.2 }), 60);
        });
    } else if (isNew) {
      seedAudience();
    } else {
      seedAudience();
    }
  }, [setNodes, setEdges]);

  // dirty tracking
  const onNodesChange = useCallback(
    (chs) => {
      setDirty(true);
      onNodesChangeBase(chs);
    },
    [onNodesChangeBase]
  );
  const onEdgesChange = useCallback(
    (chs) => {
      setDirty(true);
      onEdgesChangeBase(chs);
    },
    [onEdgesChangeBase]
  );

  // helper: pega tipo do nó
  const typeOf = useCallback(
    (id) => nodes.find((n) => n.id === id)?.type,
    [nodes]
  );

  // conecta (1 saída por nó exceto wait)
  const onConnect = useCallback(
    (params) => {
      setDirty(true);
      const sourceType = typeOf(params.source);
      setEdges((eds) => {
        const base = sourceType === 'wait' ? eds : eds.filter((e) => e.source !== params.source);
        return addEdge(
          {
            ...params,
            type: 'smoothstep',
            label: '',
            data: { conditionType: 'keywords', value: '', isFallback: false },
            style: { stroke: '#0f172a' },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#0f172a' },
          },
          base
        );
      });
    },
    [setEdges, typeOf]
  );

  // seleção → abrir drawer (nó ou edge)
  const onSelectionChange = useCallback(({ nodes: ns, edges: es }) => {
    setDrawerNodeId(ns?.[0]?.id || null);
    setDrawerEdgeId(es?.[0]?.id || null);
  }, []);

  // fechar drawer ao clicar no canvas
  const onPaneClick = useCallback(() => {
    setDrawerNodeId(null);
    setDrawerEdgeId(null);
  }, []);

  // patch node
  const patchNode = useCallback(
    (id, patch) => {
      setDirty(true);
      setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)));
    },
    [setNodes]
  );

  // patch edge
  const patchEdge = useCallback(
    (id, patch) => {
      setDirty(true);
      setEdges((eds) =>
        eds.map((e) => (e.id === id ? { ...e, ...patch, data: { ...(e.data || {}), ...(patch.data || {}) } } : e))
      );
    },
    [setEdges]
  );

  // DnD
  const onDragStartChip = (type) => (e) => {
    dragType.current = type;
    e.dataTransfer.setData('application/reactflow', type);
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const onDrop = (e) => {
    e.preventDefault();
    const type = dragType.current || e.dataTransfer.getData('application/reactflow');
    if (!type) return;

    const rect = rfInstanceRef.current?.wrapper?.getBoundingClientRect?.();
    const transform = rfInstanceRef.current?.getViewport?.()?.transform || [0, 0, 1];
    const pos = {
      x: (e.clientX - (rect?.left || 0) - transform[0]) / transform[2],
      y: (e.clientY - (rect?.top || 0) - transform[1]) / transform[2],
    };

    const common = { position: pos };
    const id = uid(type);
    let node;
    if (type === 'message') {
      node = { id, type, data: { label: 'Mensagem', channel: 'whatsapp', mode: 'text', text: '' }, ...common };
    } else if (type === 'api') {
      node = {
        id,
        type,
        data: { label: 'API Call', method: 'GET', url: '', headers: '{}', body: '{}', mappings: [], lastResponse: '' },
        ...common,
      };
    } else if (type === 'code') {
      node = { id, type, data: { label: 'Code', code: '// return { nova_variavel: 123 };' }, ...common };
    } else if (type === 'delay') {
      node = { id, type, data: { mode: 'duration', seconds: 30, summary: '30 seconds' }, ...common };
    } else if (type === 'wait') {
      node = { id, type, data: { label: 'Wait & Reply' }, ...common };
    } else {
      return;
    }
    setNodes((nds) => nds.concat(node));
    setDirty(true);
  };

  // Context menu (só nó)
  const [ctxMenu, setCtxMenu] = useState(null); // {x,y,nodeId}
  const onNodeContextMenu = (e, node) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY, nodeId: node.id });
  };
  const closeCtx = () => setCtxMenu(null);
  const doRename = () => {
    if (!ctxMenu) return;
    const val = window.prompt('Novo nome do nó:', nodes.find((n) => n.id === ctxMenu.nodeId)?.data?.label || '');
    if (val != null) patchNode(ctxMenu.nodeId, { label: val });
    closeCtx();
  };
  const doDuplicate = () => {
    if (!ctxMenu) return;
    setNodes((nds) => {
      const n = nds.find((x) => x.id === ctxMenu.nodeId);
      if (!n) return nds;
      const clone = { ...n, id: uid(n.type), position: { x: n.position.x + 40, y: n.position.y + 40 } };
      return nds.concat(clone);
    });
    closeCtx();
  };
  const doReset = () => {
    if (!ctxMenu) return;
    const n = nodes.find((x) => x.id === ctxMenu.nodeId);
    if (!n) return;
    let fresh = {};
    if (n.type === 'message')
      fresh = { label: 'Mensagem', channel: 'whatsapp', mode: 'text', text: '' };
    if (n.type === 'api')
      fresh = { label: 'API Call', method: 'GET', url: '', headers: '{}', body: '{}', mappings: [], lastResponse: '' };
    if (n.type === 'code') fresh = { label: 'Code', code: '// return { nova_variavel: 123 };' };
    if (n.type === 'delay') fresh = { mode: 'duration', seconds: 30, summary: '30 seconds' };
    if (n.type === 'wait') fresh = { label: 'Wait & Reply' };
    patchNode(n.id, fresh);
    closeCtx();
  };
  const doDelete = () => {
    if (!ctxMenu) return;
    const id = ctxMenu.nodeId;
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setDirty(true);
    closeCtx();
  };

  // auto-layout simples
  const autoLayout = () => {
    const newNodes = [...nodes];
    const start = newNodes.find((n) => n.type === 'audience');
    if (!start) return;
    const byId = Object.fromEntries(newNodes.map((n) => [n.id, n]));
    const outs = {};
    edges.forEach((e) => {
      (outs[e.source] ||= []).push(e.target);
    });
    const ordered = [start.id];
    let cur = start.id;
    const visited = new Set([start.id]);
    // linear heurístico (pega primeira saída)
    while (outs[cur]?.[0] && !visited.has(outs[cur][0])) {
      ordered.push(outs[cur][0]);
      visited.add(outs[cur][0]);
      cur = outs[cur][0];
    }
    ordered.forEach((id, idx) => {
      const n = byId[id];
      if (n) n.position = { x: 140 + idx * 360, y: 180 + (n.type === 'audience' ? -20 : 0) };
    });
    setNodes(Object.values(byId));
    setTimeout(() => rfInstanceRef.current?.fitView({ padding: 0.2 }), 30);
  };

  // salvar → injeta End se não existir
  const handleSave = async () => {
    const hasEnd = nodes.some((n) => n.type === 'end');
    let nNodes = nodes;
    let nEdges = edges;

    if (!hasEnd) {
      const idsWithOut = new Set(edges.map((e) => e.source));
      const last = nodes.find((n) => !idsWithOut.has(n.id) && n.type !== 'end');
      if (last) {
        const endId = uid('end');
        const endNode = {
          id: endId,
          type: 'end',
          position: { x: last.position.x + 360, y: last.position.y },
          data: {},
        };
        const edge = { id: uid('e'), source: last.id, target: endId, type: 'smoothstep' };
        nNodes = [...nodes, endNode];
        nEdges = [...edges, edge];
        setNodes(nNodes);
        setEdges(nEdges);
      }
    }

    const payload = {
      id: flowId || 'flow_' + Date.now(),
      name: flowName || 'Flow',
      nodes: nNodes,
      edges: nEdges,
      updatedAt: new Date().toISOString(),
    };

    try {
      const url = flowId ? `/api/journeys/${flowId}` : `/api/journeys`;
      const method = flowId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('offline');
      const saved = await res.json();
      alert('Flow salvo!');
      setDirty(false);
      if (!flowId && saved?.id) {
        setFlowId(saved.id);
        window.history.replaceState(null, '', `/journeys/builder?id=${saved.id}`);
      }
    } catch {
      localStorage.setItem(payload.id, JSON.stringify(payload));
      alert('Flow salvo no navegador.');
      setDirty(false);
      if (!flowId) {
        setFlowId(payload.id);
        window.history.replaceState(null, '', `/journeys/builder?id=${payload.id}`);
      }
    }
  };

  // voltar → perguntar salvar
  const handleBack = async () => {
    if (dirty) {
      const ok = window.confirm('Salvar antes de voltar?\nOK: salvar e voltar • Cancel: voltar sem salvar');
      if (ok) await handleSave();
    }
    navigate('/journeys');
  };

  // inputs/styles
  const inputStyle = {
    width: '100%',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    padding: '10px 12px',
  };
  const small = { fontSize: 12, color: '#475569', marginBottom: 6 };
  const label = (t) => <div style={small}>{t}</div>;
  const panelWrap = {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: 16,
    width: 360,
  };

  // Drawer — NODE
  const selectedNode = nodes.find((n) => n.id === drawerNodeId);

  // helpers de input local (conserta foco)
  function useLocalField(initial, onCommit) {
    const [val, setVal] = useState(initial);
    useEffect(() => setVal(initial), [initial]);
    const commit = () => onCommit?.(val);
    return { val, setVal, commit };
  }

  const DrawerNode = () => {
    if (!selectedNode) return null;
    const n = selectedNode;

    // AUDIENCE
    if (n.type === 'audience') {
      return (
        <div style={{ position: 'fixed', right: 16, top: 72, zIndex: 20 }}>
          <div style={panelWrap}>
            <AudiencePanel
              node={n}
              patchNode={patchNode}
              inputStyle={inputStyle}
              label={label}
              slugFn={slug}
            />
          </div>
        </div>
      );
    }

    // Mensagem (usa estado local p/ não perder foco)
    if (n.type === 'message') {
      const d = n.data || {};
      const found = d.templateSid ? templates.find((t) => t.sid === d.templateSid) : null;
      const firstTypeBody = found ? (Object.values(found.types || {})[0]?.body || '') : '';

      const labelField = useLocalField(d.label || '', (v) => patchNode(n.id, { label: v }));
      const textField = useLocalField(d.text || '', (v) => patchNode(n.id, { text: v }));
      const mediaField = useLocalField(d.mediaUrl || '', (v) => patchNode(n.id, { mediaUrl: v }));
      const buttonsField = useLocalField(d.buttonsJson || '', (v) => patchNode(n.id, { buttonsJson: v }));

      return (
        <div style={{ position: 'fixed', right: 16, top: 72, zIndex: 20 }}>
          <div style={panelWrap}>
            {label('Label')}
            <input
              style={inputStyle}
              value={labelField.val}
              onChange={(e) => labelField.setVal(e.target.value)}
              onBlur={labelField.commit}
            />

            {label('Canal')}
            <select
              style={inputStyle}
              value={d.channel || 'whatsapp'}
              onChange={(e) => patchNode(n.id, { channel: e.target.value })}
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
            </select>

            {label('Mode')}
            <select
              style={inputStyle}
              value={d.mode || 'text'}
              onChange={(e) => patchNode(n.id, { mode: e.target.value })}
            >
              <option value="text">Text</option>
              <option value="rich">Rich (text + image + buttons)</option>
            </select>

            {label('Pick a Twilio template (optional)')}
            <select
              style={inputStyle}
              value={d.templateSid || ''}
              onChange={(e) => patchNode(n.id, { templateSid: e.target.value })}
            >
              <option value="">— none —</option>
              {templates.map((t) => (
                <option key={t.sid} value={t.sid}>
                  {t.friendly_name || t.sid}
                </option>
              ))}
            </select>

            {found && (
              <>
                {label('Template preview')}
                <textarea
                  readOnly
                  rows={6}
                  style={{ ...inputStyle, fontFamily: 'monospace' }}
                  value={firstTypeBody}
                />
              </>
            )}

            {label('Text')}
            <textarea
              rows={6}
              style={inputStyle}
              value={textField.val}
              onChange={(e) => textField.setVal(e.target.value)}
              onBlur={textField.commit}
              placeholder="Olá {{nome}}!"
            />

            {d.mode === 'rich' && (
              <>
                {label('Media URL')}
                <input
                  style={inputStyle}
                  value={mediaField.val}
                  onChange={(e) => mediaField.setVal(e.target.value)}
                  onBlur={mediaField.commit}
                  placeholder="https://..."
                />
                {label('Buttons (JSON)')}
                <textarea
                  rows={5}
                  style={inputStyle}
                  value={buttonsField.val}
                  onChange={(e) => buttonsField.setVal(e.target.value)}
                  onBlur={buttonsField.commit}
                  placeholder='[{"type":"reply","title":"Sim","id":"YES"}]'
                />
              </>
            )}
          </div>
        </div>
      );
    }

    // API (usa commit no blur)
    if (n.type === 'api') {
      const d = n.data || {};
      const labelField = useLocalField(d.label || 'API Call', (v) => patchNode(n.id, { label: v }));
      const headersField = useLocalField(d.headers || '{}', (v) => patchNode(n.id, { headers: v }));
      const bodyField = useLocalField(d.body || '{}', (v) => patchNode(n.id, { body: v }));

      const tryParse = (txt) => {
        try {
          return JSON.stringify(JSON.parse(txt), null, 2);
        } catch {
          return txt;
        }
      };
      const testRequest = async () => {
        try {
          const headers = d.headers ? JSON.parse(d.headers) : {};
          const body =
            d.method === 'GET' || d.method === 'DELETE'
              ? undefined
              : d.body && d.body.trim() !== '{}'
              ? JSON.parse(d.body)
              : undefined;
          const res = await fetch(d.url, {
            method: d.method || 'GET',
            headers,
            body: body ? JSON.stringify(body) : undefined,
          });
          const text = await res.text();
          patchNode(n.id, { lastResponse: text });
          alert('Request executada. Veja a resposta abaixo.');
        } catch (e) {
          alert('Falha: ' + e.message);
        }
      };
      const addMapping = () => {
        const m = Array.isArray(d.mappings) ? d.mappings.slice() : [];
        m.push({ path: '', var: '' });
        patchNode(n.id, { mappings: m });
      };
      const updateMap = (idx, patch) => {
        const m = (d.mappings || []).slice();
        m[idx] = { ...m[idx], ...patch };
        patchNode(n.id, { mappings: m });
      };
      const removeMap = (idx) => {
        const m = (d.mappings || []).slice();
        m.splice(idx, 1);
        patchNode(n.id, { mappings: m });
      };
      return (
        <div style={{ position: 'fixed', right: 16, top: 72, zIndex: 20 }}>
          <div style={panelWrap}>
            {label('Label')}
            <input
              style={inputStyle}
              value={labelField.val}
              onChange={(e) => labelField.setVal(e.target.value)}
              onBlur={labelField.commit}
            />

            {label('Método')}
            <select
              style={inputStyle}
              value={d.method || 'GET'}
              onChange={(e) => patchNode(n.id, { method: e.target.value })}
            >
              <option>GET</option>
              <option>POST</option>
              <option>PUT</option>
              <option>PATCH</option>
              <option>DELETE</option>
            </select>

            {label('URL')}
            <input
              style={inputStyle}
              placeholder="https://api.meuservico.com/..."
              value={d.url || ''}
              onChange={(e) => patchNode(n.id, { url: e.target.value })}
            />

            {label('Headers (JSON)')}
            <textarea
              rows={4}
              style={inputStyle}
              value={headersField.val}
              onChange={(e) => headersField.setVal(e.target.value)}
              onBlur={headersField.commit}
            />

            {(d.method === 'POST' || d.method === 'PUT' || d.method === 'PATCH') && (
              <>
                {label('Body (JSON)')}
                <textarea
                  rows={6}
                  style={inputStyle}
                  value={bodyField.val}
                  onChange={(e) => bodyField.setVal(e.target.value)}
                  onBlur={bodyField.commit}
                />
              </>
            )}

            <button className="btn" onClick={testRequest} style={{ marginTop: 10 }}>
              Executar request
            </button>

            {label('Resposta (último teste)')}
            <textarea
              rows={8}
              readOnly
              style={{ ...inputStyle, fontFamily: 'monospace' }}
              value={tryParse(d.lastResponse || '')}
            />

            {label('Mapeamentos JSON → Variáveis')}
            {(d.mappings || []).map((m, i) => (
              <div
                key={i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr auto',
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <input
                  style={inputStyle}
                  placeholder="ex.: data.user.id"
                  value={m.path}
                  onChange={(e) => updateMap(i, { path: e.target.value })}
                />
                <input
                  style={inputStyle}
                  placeholder="ex.: user_id"
                  value={m.var}
                  onChange={(e) => updateMap(i, { var: slug(e.target.value) })}
                />
                <button className="btn danger" onClick={() => removeMap(i)}>
                  x
                </button>
              </div>
            ))}
            <button className="btn" onClick={addMapping}>
              + adicionar mapeamento
            </button>

            <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
              Use paths tipo <code>data.user.id</code>. O executor gravará o valor em variáveis.
            </div>
          </div>
        </div>
      );
    }

    // CODE
    if (n.type === 'code') {
      const d = n.data || {};
      const codeField = useLocalField(d.code || '', (v) => patchNode(n.id, { code: v }));
      const labelField = useLocalField(d.label || 'Code', (v) => patchNode(n.id, { label: v }));

      return (
        <div style={{ position: 'fixed', right: 16, top: 72, zIndex: 20 }}>
          <div style={panelWrap}>
            {label('Label')}
            <input
              style={inputStyle}
              value={labelField.val}
              onChange={(e) => labelField.setVal(e.target.value)}
              onBlur={labelField.commit}
            />
            {label('JavaScript')}
            <textarea
              rows={14}
              style={{ ...inputStyle, fontFamily: 'monospace' }}
              value={codeField.val}
              onChange={(e) => codeField.setVal(e.target.value)}
              onBlur={codeField.commit}
              placeholder={`// Recebe "context" (variáveis atuais)\n// deve retornar um objeto com novas variáveis\nreturn { nova_variavel: 123 };`}
            />
          </div>
        </div>
      );
    }

    // DELAY
    if (n.type === 'delay') {
      const d = n.data || {};
      const upd = (p) => patchNode(n.id, { ...d, ...p });
      const updateSummary = (mode, v) => {
        if (mode === 'duration') {
          const { seconds = 0 } = { ...d, ...v };
          upd({ summary: `${seconds} second${seconds === 1 ? '' : 's'}` });
        } else {
          const dt = new Date(v?.until || d.until || Date.now());
          upd({ summary: `until ${dt.toLocaleString()}` });
        }
      };
      return (
        <div style={{ position: 'fixed', right: 16, top: 72, zIndex: 20 }}>
          <div style={panelWrap}>
            {label('Modo')}
            <select
              style={inputStyle}
              value={d.mode || 'duration'}
              onChange={(e) => {
                const mode = e.target.value;
                upd({ mode });
                updateSummary(mode);
              }}
            >
              <option value="duration">Por duração</option>
              <option value="until">Até data/hora</option>
            </select>

            {d.mode !== 'until' ? (
              <>
                {label('Segundos')}
                <input
                  type="number"
                  min={1}
                  style={inputStyle}
                  value={d.seconds || 30}
                  onChange={(e) => {
                    const seconds = Math.max(1, Number(e.target.value || 1));
                    upd({ seconds });
                    updateSummary('duration', { seconds });
                  }}
                />
              </>
            ) : (
              <>
                {label('Executar após (data/hora)')}
                <input
                  type="datetime-local"
                  style={inputStyle}
                  value={d.until || ''}
                  onChange={(e) => {
                    const until = e.target.value;
                    upd({ until });
                    updateSummary('until', { until });
                  }}
                />
              </>
            )}
          </div>
        </div>
      );
    }

    // WAIT — sem config: as rotas são nos edges
    if (n.type === 'wait') {
      const d = n.data || {};
      const labelField = useLocalField(d.label || 'Wait & Reply', (v) => patchNode(n.id, { label: v }));
      return (
        <div style={{ position: 'fixed', right: 16, top: 72, zIndex: 20 }}>
          <div style={panelWrap}>
            {label('Label')}
            <input
              style={inputStyle}
              value={labelField.val}
              onChange={(e) => labelField.setVal(e.target.value)}
              onBlur={labelField.commit}
            />
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
              Conecte múltiplos edges a este nó. Selecione um edge para editar a condição
              (palavras, payload de botão ou regex). Defina um “Fallback” em um edge, se desejar.
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  // Drawer — EDGE (condições)
  const selectedEdge = edges.find((e) => e.id === drawerEdgeId);
  const DrawerEdge = () => {
    if (!selectedEdge) return null;
    const d = selectedEdge.data || {};
    const condType = d.conditionType || 'keywords';
    const value = d.value || '';
    const isFallback = !!d.isFallback;
    const labelVal = selectedEdge.label || '';

    const setCondType = (v) => patchEdge(selectedEdge.id, { data: { conditionType: v } });
    const setValue = (v) => patchEdge(selectedEdge.id, { data: { value: v } });
    const setFallback = (v) => patchEdge(selectedEdge.id, { data: { isFallback: v } });
    const setLabel = (v) => patchEdge(selectedEdge.id, { label: v });

    return (
      <div style={{ position: 'fixed', right: 16, top: 72, zIndex: 21 }}>
        <div style={panelWrap}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Condição do Edge</div>

          {label('Rótulo (aparece no edge)')}
          <input style={inputStyle} value={labelVal} onChange={(e) => setLabel(e.target.value)} placeholder="ex.: SIM / NÃO / Outro" />

          {label('Tipo de condição')}
          <select style={inputStyle} value={condType} onChange={(e) => setCondType(e.target.value)}>
            <option value="keywords">keywords (palavras separadas por |)</option>
            <option value="payload">payload (ID de botão)</option>
            <option value="regex">regex (ex.: /sim|yes/i)</option>
          </select>

          {label(condType === 'keywords'
            ? 'Palavras (separadas por |)'
            : condType === 'payload'
            ? 'Payload(s) (separados por |)'
            : 'Regex (ex.: /sim|yes/i)')}
          <input style={inputStyle} value={value} onChange={(e) => setValue(e.target.value)} placeholder={condType === 'regex' ? '/sim|yes/i' : 'sim|yes'} />

          <label style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={isFallback} onChange={(e) => setFallback(e.target.checked)} />
            Tornar este edge Fallback (usado se nenhuma outra condição casar)
          </label>
        </div>
      </div>
    );
  };

  // toolbar chips (sem Audiência / sem End)
  const Chips = () => (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <span style={{ fontSize: 12, color: '#6b7280', marginRight: 8 }}>Arraste para o canvas:</span>
      {[
        ['message', 'Mensagem'],
        ['api', 'API'],
        ['code', 'Code'],
        ['delay', 'Delay'],
        ['wait', 'Wait & Reply'],
      ].map(([t, label]) => (
        <button key={t} className="btn secondary" draggable onDragStart={onDragStartChip(t)}>
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <div style={{ padding: 12, display: 'grid', gridTemplateColumns: '1fr auto', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="btn" onClick={handleBack}>
          Voltar
        </button>
        <Chips />
        <input
          value={flowName}
          onChange={(e) => {
            setFlowName(e.target.value);
            setDirty(true);
          }}
          style={{ marginLeft: 12, width: 320, border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px' }}
          placeholder="Nome do flow"
        />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn" onClick={autoLayout}>
          Auto-layout
        </button>
        <button
          className="btn"
          onClick={async () => {
            try {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'application/json';
              input.onchange = (ev) => {
                const f = ev.target.files?.[0];
                if (!f) return;
                const r = new FileReader();
                r.onload = () => {
                  try {
                    const data = JSON.parse(r.result);
                    if (Array.isArray(data.nodes) && Array.isArray(data.edges)) {
                      setNodes(data.nodes);
                      setEdges(data.edges);
                      setFlowName(data.name || 'Flow');
                      setDirty(true);
                      setTimeout(() => rfInstanceRef.current?.fitView({ padding: 0.2 }), 40);
                    } else alert('JSON inválido.');
                  } catch {
                    alert('Falha ao ler JSON.');
                  }
                };
                r.readAsText(f);
              };
              input.click();
            } catch {}
          }}
        >
          Importar
        </button>
        <button
          className="btn"
          onClick={() => {
            const blob = new Blob([JSON.stringify({ name: flowName, nodes, edges }, null, 2)], {
              type: 'application/json',
            });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${slug(flowName)}.json`;
            a.click();
            URL.revokeObjectURL(a.href);
          }}
        >
          Exportar
        </button>
        <button className="btn" onClick={handleSave}>
          Salvar flow
        </button>
      </div>

      <div
        style={{
          gridColumn: '1 / span 2',
          height: 'calc(100vh - 120px)',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          position: 'relative',
          overflow: 'hidden',
        }}
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onInit={(inst) => {
            rfInstanceRef.current = inst;
            setTimeout(() => inst.fitView({ padding: 0.2 }), 30);
          }}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onSelectionChange={onSelectionChange}
          onNodeContextMenu={onNodeContextMenu}
          onPaneClick={onPaneClick}
          fitView
        >
          <MiniMap />
          <Controls />
          <Background gap={16} />
        </ReactFlow>

        {/* Context menu vertical */}
        {ctxMenu && (
          <div
            onMouseLeave={closeCtx}
            style={{
              position: 'fixed',
              top: ctxMenu.y,
              left: ctxMenu.x,
              transform: 'translateY(-8px)',
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              boxShadow: '0 8px 24px rgba(0,0,0,.12)',
              zIndex: 30,
              overflow: 'hidden',
            }}
          >
            <button className="btn secondary" style={{ width: 180, display: 'block', borderRadius: 0 }} onClick={doRename}>
              Renomear
            </button>
            <button className="btn secondary" style={{ width: 180, display: 'block', borderRadius: 0 }} onClick={doDuplicate}>
              Duplicar
            </button>
            <button className="btn secondary" style={{ width: 180, display: 'block', borderRadius: 0 }} onClick={doReset}>
              Resetar
            </button>
            <button className="btn danger" style={{ width: 180, display: 'block', borderRadius: 0 }} onClick={doDelete}>
              Deletar
            </button>
          </div>
        )}
      </div>

      {/* Drawers */}
      <DrawerNode />
      <DrawerEdge />
    </div>
  );
}