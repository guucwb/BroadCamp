// frontend/src/components/FreeFormNode.jsx
import React from 'react';
import { Handle, Position } from 'reactflow';

export default function FreeFormNode({ data, selected }) {
  const label = data?.label || 'Free Form';
  const channel = data?.channel || 'whatsapp';
  const mode = data?.mode || 'text';

  return (
    <div
      style={{
        minWidth: 240,
        background: '#fff',
        border: selected ? '2px solid #2563eb' : '1px solid #e5e7eb',
        borderRadius: 12,
        padding: '12px 14px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 12, color: '#475569' }}>
        Canal: <b>{channel.toUpperCase()}</b> • Tipo: <b>{mode}</b>
      </div>

      {/* Entrada (esquerda) e saída (direita) */}
      <Handle type="target" position={Position.Left}  id="in"  />
      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
}
