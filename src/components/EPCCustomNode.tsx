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
  'start-end': {
    bgGradient: 'linear-gradient(135deg, #f0fdf4 0%, #bbf7d0 100%)',
    border: '#22c55e', text: '#14532d',
    shadow: '0 4px 14px -2px rgba(34,197,94,0.20)', badgeBg: '#dcfce7',
  },
  'decision': {
    bgGradient: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)',
    border: '#f97316', text: '#7c2d12',
    shadow: '0 4px 14px -2px rgba(249,115,22,0.20)', badgeBg: '#ffedd5',
  },
  'storage': {
    bgGradient: 'linear-gradient(135deg, #fefce8 0%, #fef08a 100%)',
    border: '#eab308', text: '#713f12',
    shadow: '0 4px 14px -2px rgba(234,179,8,0.20)', badgeBg: '#fef9c3',
  },
  'delay': {
    bgGradient: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)',
    border: '#ef4444', text: '#7f1d1d',
    shadow: '0 4px 14px -2px rgba(239,68,68,0.20)', badgeBg: '#fee2e2',
  },
  'document': {
    bgGradient: 'linear-gradient(135deg, #f5f3ff 0%, #e9d5ff 100%)',
    border: '#8b5cf6', text: '#3b0764',
    shadow: '0 4px 14px -2px rgba(139,92,246,0.20)', badgeBg: '#ede9fe',
  },
};

const TYPE_LABELS: Record<NodeType, string> = {
  'in-scope': 'Step', 'interface': 'Business Process', 'event': 'Event', 'xor': 'XOR',
  'start-end': 'Start/End', 'decision': 'Decision', 'storage': 'Storage', 'delay': 'Delay', 'document': 'Document',
};

const INTERFACE_SUBTYPE_LABELS: Record<string, string> = {
  'default': 'Business Process',
  'input': 'Business Process (Input)',
  'output': 'Business Process (Output)',
};

const handleStyle = (color: string) => ({
  background: color, width: 10, height: 10,
  border: '2px solid white', boxShadow: `0 0 0 1px ${color}40`,
});

interface EPCNodeData {
  label: string;
  nodeType: NodeType;
  nodeId: string;
  interfaceSubtype?: string;
  [key: string]: unknown;
}

function EPCCustomNode({ data }: NodeProps) {
  const d = data as EPCNodeData;
  const s = STYLE_MAP[d.nodeType] || STYLE_MAP['in-scope'];

  // XOR — diamond
  if (d.nodeType === 'xor') {
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

  // Decision — diamond (orange)
  if (d.nodeType === 'decision') {
    return (
      <div className="flex flex-col items-center">
        <span className="text-[9px] font-mono font-medium tracking-tight px-1.5 py-0.5 rounded-md mb-1.5"
          style={{ color: s.border, backgroundColor: s.badgeBg }}>{d.nodeId}</span>
        <div className="relative flex items-center justify-center"
          style={{
            width: 80, height: 80, background: s.bgGradient,
            border: `2px solid ${s.border}`, borderRadius: 6,
            transform: 'rotate(45deg)', boxShadow: s.shadow,
          }}>
          <Handle type="target" position={Position.Top} style={{ ...handleStyle(s.border), transform: 'rotate(-45deg)' }} />
          <span className="text-[10px] font-bold leading-tight text-center max-w-[50px]" style={{ color: s.text, transform: 'rotate(-45deg)' }}>
            {d.label}
          </span>
          <Handle type="source" position={Position.Bottom} style={{ ...handleStyle(s.border), transform: 'rotate(-45deg)' }} />
        </div>
      </div>
    );
  }

  // Event — hexagon
  if (d.nodeType === 'event') {
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

  // Start/End — oval/pill
  if (d.nodeType === 'start-end') {
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
            minWidth: 160, padding: '14px 28px',
            background: s.bgGradient, border: `2px solid ${s.border}`,
            borderRadius: 999, boxShadow: s.shadow,
          }}>
          <Handle type="target" position={Position.Top} style={handleStyle(s.border)} />
          <span className="text-xs font-semibold leading-snug">{d.label}</span>
          <Handle type="source" position={Position.Bottom} style={handleStyle(s.border)} />
        </div>
      </div>
    );
  }

  // Storage — triangle
  if (d.nodeType === 'storage') {
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
            width: 120, height: 90, background: s.bgGradient,
            clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)',
            boxShadow: s.shadow,
          }}>
          <Handle type="target" position={Position.Top} style={handleStyle(s.border)} />
          <span className="text-[10px] font-semibold leading-tight text-center mt-4" style={{ color: s.text }}>
            {d.label}
          </span>
          <Handle type="source" position={Position.Bottom} style={handleStyle(s.border)} />
        </div>
        {/* Triangle border overlay via SVG */}
        <svg width="120" height="90" className="absolute" style={{ pointerEvents: 'none', top: 0 }}>
          <polygon points="60,0 120,90 0,90" fill="none" stroke={s.border} strokeWidth="2" />
        </svg>
      </div>
    );
  }

  // Delay — D-shape (flat left, rounded right)
  if (d.nodeType === 'delay') {
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
            minWidth: 160, padding: '14px 20px',
            background: s.bgGradient, border: `2px solid ${s.border}`,
            borderRadius: '0 999px 999px 0', boxShadow: s.shadow,
          }}>
          <Handle type="target" position={Position.Top} style={handleStyle(s.border)} />
          <span className="text-xs font-semibold leading-snug">{d.label}</span>
          <Handle type="source" position={Position.Bottom} style={handleStyle(s.border)} />
        </div>
      </div>
    );
  }

  // Document — wavy bottom rectangle
  if (d.nodeType === 'document') {
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
        <div className="relative" style={{ minWidth: 180 }}>
          <svg width="100%" height="80" viewBox="0 0 180 80" preserveAspectRatio="none">
            <path d="M0,0 H180 V60 Q135,80 90,60 Q45,40 0,60 Z" fill="url(#docGrad)" stroke={s.border} strokeWidth="2" />
            <defs>
              <linearGradient id="docGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f5f3ff" />
                <stop offset="100%" stopColor="#e9d5ff" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center pb-3">
            <Handle type="target" position={Position.Top} style={handleStyle(s.border)} />
            <span className="text-xs font-semibold leading-tight text-center px-4" style={{ color: s.text }}>{d.label}</span>
            <Handle type="source" position={Position.Bottom} style={handleStyle(s.border)} />
          </div>
        </div>
      </div>
    );
  }

  // Default: Process / Interface — rounded rectangle
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
