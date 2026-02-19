import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { NodeType } from '@/types/epc';

interface EPCNodeData {
  label: string;
  nodeType: NodeType;
  nodeId: string;
  [key: string]: unknown;
}

const STYLE_MAP: Record<NodeType, {
  bgGradient: string; border: string; text: string; shadow: string; badgeBg: string;
}> = {
  'in-scope': {
    bgGradient: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
    border: '#10b981', text: '#065f46',
    shadow: '0 4px 14px -2px rgba(16,185,129,0.20)', badgeBg: '#d1fae5',
  },
  'interface': {
    bgGradient: 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
    border: '#64748b', text: '#1e293b',
    shadow: '0 4px 14px -2px rgba(100,116,139,0.15)', badgeBg: '#e2e8f0',
  },
  'event': {
    bgGradient: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)',
    border: '#ec4899', text: '#831843',
    shadow: '0 4px 14px -2px rgba(236,72,153,0.20)', badgeBg: '#fce7f3',
  },
  'xor': {
    bgGradient: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
    border: '#3b82f6', text: '#1e3a8a',
    shadow: '0 4px 14px -2px rgba(59,130,246,0.20)', badgeBg: '#dbeafe',
  },
};

const TYPE_LABELS: Record<NodeType, string> = {
  'in-scope': 'Process', 'interface': 'Interface', 'event': 'Event', 'xor': 'XOR',
};

const handleStyle = (color: string) => ({
  background: color, width: 10, height: 10,
  border: '2px solid white', boxShadow: `0 0 0 1px ${color}40`,
});

function EPCCustomNode({ data }: NodeProps) {
  const d = data as EPCNodeData;
  const s = STYLE_MAP[d.nodeType] || STYLE_MAP['in-scope'];
  const isXor = d.nodeType === 'xor';
  const isEvent = d.nodeType === 'event';

  if (isXor) {
    return (
      <div className="flex flex-col items-center">
        <span className="text-[9px] font-mono font-medium tracking-tight px-1.5 py-0.5 rounded-md mb-1.5"
          style={{ color: s.border, backgroundColor: s.badgeBg }}>{d.nodeId}</span>
        <div className="relative flex items-center justify-center"
          style={{
            width: 72, height: 72, background: s.bgGradient,
            border: `2px solid ${s.border}`, borderRadius: 14,
            transform: 'rotate(45deg)', boxShadow: s.shadow,
          }}>
          <Handle type="target" position={Position.Top} style={{ ...handleStyle(s.border), transform: 'rotate(-45deg)' }} />
          <span className="text-xs font-bold" style={{ color: s.text, transform: 'rotate(-45deg)' }}>XOR</span>
          <Handle type="source" position={Position.Bottom} style={{ ...handleStyle(s.border), transform: 'rotate(-45deg)' }} />
        </div>
        {d.label && d.label !== 'XOR' && (
          <span className="mt-1.5 text-[10px] font-medium max-w-[120px] text-center leading-tight" style={{ color: s.text }}>
            {d.label}
          </span>
        )}
      </div>
    );
  }

  if (isEvent) {
    return (
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-[9px] font-mono font-medium tracking-tight px-1.5 py-0.5 rounded-md"
            style={{ color: s.border, backgroundColor: s.badgeBg }}>{d.nodeId}</span>
          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full border"
            style={{ borderColor: s.border, color: s.text, backgroundColor: s.badgeBg }}>
            {TYPE_LABELS[d.nodeType]}
          </span>
        </div>
        <div className="relative flex items-center justify-center"
          style={{
            minWidth: 160, minHeight: 72, background: s.bgGradient,
            border: `2px solid ${s.border}`,
            clipPath: 'polygon(20% 0%, 80% 0%, 100% 50%, 80% 100%, 20% 100%, 0% 50%)',
            padding: '16px 36px', boxShadow: s.shadow,
          }}>
          <Handle type="target" position={Position.Top} style={handleStyle(s.border)} />
          <span className="text-xs font-semibold leading-tight">{d.label}</span>
          <Handle type="source" position={Position.Bottom} style={handleStyle(s.border)} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-[9px] font-mono font-medium tracking-tight px-1.5 py-0.5 rounded-md"
          style={{ color: s.border, backgroundColor: s.badgeBg }}>{d.nodeId}</span>
        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full border"
          style={{ borderColor: s.border, color: s.text, backgroundColor: s.badgeBg }}>
          {TYPE_LABELS[d.nodeType]}
        </span>
      </div>
      <div className="relative flex items-center justify-center text-center"
        style={{
          minWidth: 190, maxWidth: 260, padding: '14px 20px',
          background: s.bgGradient, border: `2px solid ${s.border}`,
          borderRadius: d.nodeType === 'interface' ? 8 : 12,
          boxShadow: s.shadow,
          ...(d.nodeType === 'interface' ? { borderLeft: `4px solid ${s.border}` } : {}),
        }}>
        <Handle type="target" position={Position.Top} style={handleStyle(s.border)} />
        <span className="text-xs font-medium leading-snug">{d.label}</span>
        <Handle type="source" position={Position.Bottom} style={handleStyle(s.border)} />
      </div>
    </div>
  );
}

export default memo(EPCCustomNode);
