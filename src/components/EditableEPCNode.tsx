import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { NodeType } from '@/types/epc';
import { Trash2 } from 'lucide-react';

interface EditableEPCNodeData {
  label: string;
  nodeType: NodeType;
  nodeId: string;
  onDelete?: (id: string) => void;
  onLabelChange?: (id: string, label: string) => void;
  onTypeChange?: (id: string, type: NodeType) => void;
  [key: string]: unknown;
}

const STYLE_MAP: Record<NodeType, {
  bg: string; bgGradient: string; border: string; text: string;
  shadow: string; glow: string; badgeBg: string; icon: string;
}> = {
  'in-scope': {
    bg: '#ecfdf5', bgGradient: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
    border: '#10b981', text: '#065f46',
    shadow: '0 4px 14px -2px rgba(16,185,129,0.20)', glow: '0 0 0 3px rgba(16,185,129,0.15)',
    badgeBg: '#d1fae5', icon: '⬢',
  },
  'interface': {
    bg: '#f8fafc', bgGradient: 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
    border: '#64748b', text: '#1e293b',
    shadow: '0 4px 14px -2px rgba(100,116,139,0.15)', glow: '0 0 0 3px rgba(100,116,139,0.12)',
    badgeBg: '#e2e8f0', icon: '▸',
  },
  'event': {
    bg: '#fdf2f8', bgGradient: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)',
    border: '#ec4899', text: '#831843',
    shadow: '0 4px 14px -2px rgba(236,72,153,0.20)', glow: '0 0 0 3px rgba(236,72,153,0.15)',
    badgeBg: '#fce7f3', icon: '⬡',
  },
  'xor': {
    bg: '#eff6ff', bgGradient: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
    border: '#3b82f6', text: '#1e3a8a',
    shadow: '0 4px 14px -2px rgba(59,130,246,0.20)', glow: '0 0 0 3px rgba(59,130,246,0.15)',
    badgeBg: '#dbeafe', icon: '◇',
  },
};

const TYPE_LABELS: Record<NodeType, string> = {
  'in-scope': 'Process', 'interface': 'Interface', 'event': 'Event', 'xor': 'XOR',
};

const NODE_TYPES: NodeType[] = ['in-scope', 'interface', 'event', 'xor'];

const handleStyle = (color: string) => ({
  background: color,
  width: 10,
  height: 10,
  border: '2px solid white',
  boxShadow: `0 0 0 1px ${color}40`,
});

function EditableEPCNode({ id, data, selected }: NodeProps) {
  const d = data as EditableEPCNodeData;
  const s = STYLE_MAP[d.nodeType] || STYLE_MAP['in-scope'];
  const isXor = d.nodeType === 'xor';
  const isEvent = d.nodeType === 'event';
  const [editing, setEditing] = useState(false);
  const [labelText, setLabelText] = useState(d.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setLabelText(d.label); }, [d.label]);
  useEffect(() => {
    if (editing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); }
  }, [editing]);

  const commitLabel = useCallback(() => {
    setEditing(false);
    if (labelText.trim() && labelText !== d.label) d.onLabelChange?.(id, labelText.trim());
    else setLabelText(d.label);
  }, [labelText, d, id]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitLabel();
    if (e.key === 'Escape') { setLabelText(d.label); setEditing(false); }
  }, [commitLabel, d.label]);

  const cycleType = useCallback(() => {
    const idx = NODE_TYPES.indexOf(d.nodeType);
    d.onTypeChange?.(id, NODE_TYPES[(idx + 1) % NODE_TYPES.length]);
  }, [d, id]);

  // XOR diamond shape
  if (isXor) {
    return (
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-[9px] font-mono font-medium tracking-tight px-1.5 py-0.5 rounded-md"
            style={{ color: s.border, backgroundColor: s.badgeBg }}>
            {d.nodeId}
          </span>
        </div>
        <div
          className="relative flex items-center justify-center transition-all duration-200"
          style={{
            width: 72, height: 72,
            background: s.bgGradient,
            border: `2px solid ${s.border}`,
            borderRadius: 14,
            transform: 'rotate(45deg)',
            boxShadow: selected ? `${s.shadow}, ${s.glow}` : s.shadow,
          }}
        >
          <Handle type="target" position={Position.Top} style={{ ...handleStyle(s.border), transform: 'rotate(-45deg) translate(-50%, -50%)', top: 0, left: '50%' }} />
          <span className="text-xs font-bold" style={{ color: s.text, transform: 'rotate(-45deg)' }}>XOR</span>
          <Handle type="source" position={Position.Bottom} style={{ ...handleStyle(s.border), transform: 'rotate(-45deg) translate(50%, 50%)', bottom: 0, right: '50%' }} />
        </div>
        {/* Decision label below */}
        {d.label && d.label !== 'XOR' && (
          <span
            className="mt-1.5 text-[10px] font-medium max-w-[120px] text-center leading-tight"
            style={{ color: s.text }}
            onDoubleClick={() => setEditing(true)}
          >
            {editing ? (
              <input ref={inputRef} value={labelText} onChange={e => setLabelText(e.target.value)}
                onBlur={commitLabel} onKeyDown={handleKeyDown}
                className="bg-transparent text-center text-[10px] w-full outline-none border-b border-dashed"
                style={{ color: s.text, borderColor: s.border }} />
            ) : d.label}
          </span>
        )}
        {selected && (
          <button onClick={() => d.onDelete?.(id)}
            className="mt-1 p-1 rounded-full bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors">
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  }

  // Event hexagon
  if (isEvent) {
    return (
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-[9px] font-mono font-medium tracking-tight px-1.5 py-0.5 rounded-md"
            style={{ color: s.border, backgroundColor: s.badgeBg }}>
            {d.nodeId}
          </span>
          <button onClick={cycleType}
            className="text-[9px] font-semibold px-2 py-0.5 rounded-full border cursor-pointer hover:scale-105 transition-transform"
            style={{ borderColor: s.border, color: s.text, backgroundColor: s.badgeBg }}>
            {TYPE_LABELS[d.nodeType]}
          </button>
        </div>
        <div className="relative flex items-center justify-center transition-all duration-200"
          style={{
            minWidth: 160, minHeight: 72,
            background: s.bgGradient,
            border: `2px solid ${s.border}`,
            clipPath: 'polygon(20% 0%, 80% 0%, 100% 50%, 80% 100%, 20% 100%, 0% 50%)',
            padding: '16px 36px',
            boxShadow: selected ? `${s.shadow}, ${s.glow}` : s.shadow,
          }}>
          <Handle type="target" position={Position.Top} style={handleStyle(s.border)} />
          {editing ? (
            <input ref={inputRef} value={labelText} onChange={e => setLabelText(e.target.value)}
              onBlur={commitLabel} onKeyDown={handleKeyDown}
              className="bg-transparent text-center text-xs w-full outline-none border-b border-dashed"
              style={{ color: s.text, borderColor: s.border }} />
          ) : (
            <span className="text-xs font-semibold leading-tight cursor-text" onDoubleClick={() => setEditing(true)}>
              {d.label}
            </span>
          )}
          <Handle type="source" position={Position.Bottom} style={handleStyle(s.border)} />
        </div>
        {selected && (
          <button onClick={() => d.onDelete?.(id)}
            className="mt-1 p-1 rounded-full bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors">
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  }

  // Process / Interface — rounded rectangle
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-[9px] font-mono font-medium tracking-tight px-1.5 py-0.5 rounded-md"
          style={{ color: s.border, backgroundColor: s.badgeBg }}>
          {d.nodeId}
        </span>
        <button onClick={cycleType}
          className="text-[9px] font-semibold px-2 py-0.5 rounded-full border cursor-pointer hover:scale-105 transition-transform"
          style={{ borderColor: s.border, color: s.text, backgroundColor: s.badgeBg }}>
          {TYPE_LABELS[d.nodeType]}
        </button>
      </div>
      <div
        className="relative flex items-center justify-center text-center transition-all duration-200"
        style={{
          minWidth: 190, maxWidth: 260,
          padding: '14px 20px',
          background: s.bgGradient,
          border: `2px solid ${s.border}`,
          borderRadius: d.nodeType === 'interface' ? 8 : 12,
          boxShadow: selected ? `${s.shadow}, ${s.glow}` : s.shadow,
          ...(d.nodeType === 'interface' ? { borderLeft: `4px solid ${s.border}` } : {}),
        }}
      >
        <Handle type="target" position={Position.Top} style={handleStyle(s.border)} />
        {editing ? (
          <input ref={inputRef} value={labelText} onChange={e => setLabelText(e.target.value)}
            onBlur={commitLabel} onKeyDown={handleKeyDown}
            className="bg-transparent text-center text-xs w-full outline-none border-b border-dashed"
            style={{ color: s.text, borderColor: s.border }} />
        ) : (
          <span className="text-xs font-medium leading-snug cursor-text" onDoubleClick={() => setEditing(true)}>
            {d.label}
          </span>
        )}
        <Handle type="source" position={Position.Bottom} style={handleStyle(s.border)} />
      </div>
      {selected && (
        <button onClick={() => d.onDelete?.(id)}
          className="mt-1 p-1 rounded-full bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors">
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

export default memo(EditableEPCNode);
