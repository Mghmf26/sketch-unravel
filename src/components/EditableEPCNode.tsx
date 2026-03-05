import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { NodeType, InterfaceSubtype } from '@/types/epc';
import { Trash2, ShieldAlert, ShieldCheck, Scale, AlertCircle, Monitor } from 'lucide-react';

interface EditableEPCNodeData {
  label: string;
  nodeType: NodeType;
  nodeId: string;
  description?: string;
  interfaceSubtype?: InterfaceSubtype;
  riskCount?: number;
  controlCount?: number;
  regulationCount?: number;
  incidentCount?: number;
  appCount?: number;
  onDelete?: (id: string) => void;
  onLabelChange?: (id: string, label: string) => void;
  onTypeChange?: (id: string, type: NodeType) => void;
  onNodeClick?: (id: string) => void;
  onIndicatorClick?: (id: string, type: 'risks' | 'controls' | 'regulations' | 'incidents' | 'applications') => void;
  [key: string]: unknown;
}

const STYLE_MAP: Record<NodeType, {
  bg: string; bgGradient: string; border: string; text: string;
  shadow: string; glow: string; badgeBg: string; iconBg: string;
}> = {
  'in-scope': {
    bg: '#ecfdf5', bgGradient: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
    border: '#10b981', text: '#065f46',
    shadow: '0 4px 14px -2px rgba(16,185,129,0.20)', glow: '0 0 0 3px rgba(16,185,129,0.15)',
    badgeBg: '#d1fae5', iconBg: '#10b981',
  },
  'interface': {
    bg: '#f8fafc', bgGradient: 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
    border: '#64748b', text: '#1e293b',
    shadow: '0 4px 14px -2px rgba(100,116,139,0.15)', glow: '0 0 0 3px rgba(100,116,139,0.12)',
    badgeBg: '#e2e8f0', iconBg: '#64748b',
  },
  'event': {
    bg: '#fdf2f8', bgGradient: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)',
    border: '#ec4899', text: '#831843',
    shadow: '0 4px 14px -2px rgba(236,72,153,0.20)', glow: '0 0 0 3px rgba(236,72,153,0.15)',
    badgeBg: '#fce7f3', iconBg: '#ec4899',
  },
  'xor': {
    bg: '#eff6ff', bgGradient: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
    border: '#3b82f6', text: '#1e3a8a',
    shadow: '0 4px 14px -2px rgba(59,130,246,0.20)', glow: '0 0 0 3px rgba(59,130,246,0.15)',
    badgeBg: '#dbeafe', iconBg: '#3b82f6',
  },
  'start-end': {
    bg: '#f0fdf4', bgGradient: 'linear-gradient(135deg, #f0fdf4 0%, #bbf7d0 100%)',
    border: '#22c55e', text: '#14532d',
    shadow: '0 4px 14px -2px rgba(34,197,94,0.20)', glow: '0 0 0 3px rgba(34,197,94,0.15)',
    badgeBg: '#dcfce7', iconBg: '#22c55e',
  },
  'decision': {
    bg: '#fff7ed', bgGradient: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)',
    border: '#f97316', text: '#7c2d12',
    shadow: '0 4px 14px -2px rgba(249,115,22,0.20)', glow: '0 0 0 3px rgba(249,115,22,0.15)',
    badgeBg: '#ffedd5', iconBg: '#f97316',
  },
  'storage': {
    bg: '#fefce8', bgGradient: 'linear-gradient(135deg, #fefce8 0%, #fef08a 100%)',
    border: '#eab308', text: '#713f12',
    shadow: '0 4px 14px -2px rgba(234,179,8,0.20)', glow: '0 0 0 3px rgba(234,179,8,0.15)',
    badgeBg: '#fef9c3', iconBg: '#eab308',
  },
  'delay': {
    bg: '#fef2f2', bgGradient: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)',
    border: '#ef4444', text: '#7f1d1d',
    shadow: '0 4px 14px -2px rgba(239,68,68,0.20)', glow: '0 0 0 3px rgba(239,68,68,0.15)',
    badgeBg: '#fee2e2', iconBg: '#ef4444',
  },
  'document': {
    bg: '#f5f3ff', bgGradient: 'linear-gradient(135deg, #f5f3ff 0%, #e9d5ff 100%)',
    border: '#8b5cf6', text: '#3b0764',
    shadow: '0 4px 14px -2px rgba(139,92,246,0.20)', glow: '0 0 0 3px rgba(139,92,246,0.15)',
    badgeBg: '#ede9fe', iconBg: '#8b5cf6',
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

const NODE_TYPES: NodeType[] = ['in-scope', 'interface', 'event', 'xor', 'start-end', 'decision', 'storage', 'delay', 'document'];

const handleStyle = (color: string) => ({
  background: color, width: 10, height: 10,
  border: '2px solid white', boxShadow: `0 0 0 1px ${color}40`,
});

function useNodeEditing(id: string, data: EditableEPCNodeData) {
  const [editing, setEditing] = useState(false);
  const [labelText, setLabelText] = useState(data.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setLabelText(data.label); }, [data.label]);
  useEffect(() => {
    if (editing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); }
  }, [editing]);

  const commitLabel = useCallback(() => {
    setEditing(false);
    if (labelText.trim() && labelText !== data.label) data.onLabelChange?.(id, labelText.trim());
    else setLabelText(data.label);
  }, [labelText, data, id]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitLabel();
    if (e.key === 'Escape') { setLabelText(data.label); setEditing(false); }
  }, [commitLabel, data.label]);

  const cycleType = useCallback(() => {
    const idx = NODE_TYPES.indexOf(data.nodeType);
    data.onTypeChange?.(id, NODE_TYPES[(idx + 1) % NODE_TYPES.length]);
  }, [data, id]);

  return { editing, setEditing, labelText, setLabelText, inputRef, commitLabel, handleKeyDown, cycleType };
}

function InlineInput({ inputRef, value, onChange, onBlur, onKeyDown, style }: {
  inputRef: React.RefObject<HTMLInputElement>; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void; onKeyDown: (e: React.KeyboardEvent) => void;
  style: { color: string; borderColor: string };
}) {
  return (
    <input ref={inputRef} value={value} onChange={onChange} onBlur={onBlur} onKeyDown={onKeyDown}
      className="bg-transparent text-left text-xs w-full outline-none border-b border-dashed"
      style={style} />
  );
}

// Relation indicator dot
function RelationDot({ count, color, icon: Icon, label, onClick }: {
  count: number; color: string; icon: any; label: string; onClick: () => void;
}) {
  if (count === 0) return null;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold transition-all hover:scale-110 cursor-pointer"
      style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}40` }}
      title={`${count} ${label}`}
    >
      <Icon className="h-2.5 w-2.5" />
      <span>{count}</span>
    </button>
  );
}

// Type badge (no ID)
function TypeBadge({ nodeType, interfaceSubtype, style, onCycleType }: {
  nodeType: NodeType;
  interfaceSubtype?: InterfaceSubtype;
  style: { border: string; text: string; badgeBg: string };
  onCycleType: () => void;
}) {
  const label = nodeType === 'interface' && interfaceSubtype
    ? INTERFACE_SUBTYPE_LABELS[interfaceSubtype] || INTERFACE_SUBTYPE_LABELS['default']
    : TYPE_LABELS[nodeType];
  return (
    <button onClick={onCycleType}
      className="text-[9px] font-semibold px-2 py-0.5 rounded-full border cursor-pointer hover:scale-105 transition-transform"
      style={{ borderColor: style.border, color: style.text, backgroundColor: style.badgeBg }}>
      {label}
    </button>
  );
}

function DeleteButton({ id, onDelete }: { id: string; onDelete?: (id: string) => void }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onDelete?.(id); }}
      className="p-1 rounded-full bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors">
      <Trash2 className="h-3 w-3" />
    </button>
  );
}

function EditableEPCNode({ id, data, selected }: NodeProps) {
  const d = data as EditableEPCNodeData;
  const s = STYLE_MAP[d.nodeType] || STYLE_MAP['in-scope'];
  const edit = useNodeEditing(id, d);
  const inputProps = {
    inputRef: edit.inputRef, value: edit.labelText,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => edit.setLabelText(e.target.value),
    onBlur: edit.commitLabel, onKeyDown: edit.handleKeyDown,
    style: { color: s.text, borderColor: s.border },
  };
  const boxShadow = selected ? `${s.shadow}, ${s.glow}` : s.shadow;

  const handleNodeClick = useCallback(() => {
    d.onNodeClick?.(id);
  }, [d, id]);

  const handleIndicatorClick = useCallback((type: 'risks' | 'controls' | 'regulations' | 'incidents' | 'applications') => {
    d.onIndicatorClick?.(id, type);
  }, [d, id]);

  // Relation indicator row
  const indicatorRow = (
    <div className="flex items-center gap-1 mt-1.5">
      <RelationDot count={d.riskCount || 0} color="#f97316" icon={ShieldAlert} label="Risks" onClick={() => handleIndicatorClick('risks')} />
      <RelationDot count={d.controlCount || 0} color="#3b82f6" icon={ShieldCheck} label="Controls" onClick={() => handleIndicatorClick('controls')} />
      <RelationDot count={d.regulationCount || 0} color="#8b5cf6" icon={Scale} label="Regulations" onClick={() => handleIndicatorClick('regulations')} />
      <RelationDot count={d.incidentCount || 0} color="#ef4444" icon={AlertCircle} label="Incidents" onClick={() => handleIndicatorClick('incidents')} />
      <RelationDot count={d.appCount || 0} color="#0ea5e9" icon={Monitor} label="Applications" onClick={() => handleIndicatorClick('applications')} />
    </div>
  );

  // Only step-type nodes can have relations
  const isStepType = d.nodeType === 'in-scope';
  const hasRelations = isStepType && (d.riskCount || 0) + (d.controlCount || 0) + (d.regulationCount || 0) + (d.incidentCount || 0) + (d.appCount || 0) > 0;

  // XOR — blue diamond
  if (d.nodeType === 'xor') {
    return (
      <div className="flex flex-col items-center" onClick={handleNodeClick}>
        <TypeBadge nodeType={d.nodeType} style={s} onCycleType={edit.cycleType} />
        <div className="relative flex items-center justify-center transition-all duration-200 mt-1"
          style={{ width: 72, height: 72, background: s.bgGradient, border: `2px solid ${s.border}`, borderRadius: 14, transform: 'rotate(45deg)', boxShadow }}>
          <Handle type="target" position={Position.Top} style={{ ...handleStyle(s.border), transform: 'rotate(-45deg)' }} />
          <span className="text-xs font-bold" style={{ color: s.text, transform: 'rotate(-45deg)' }}>XOR</span>
          <Handle type="source" position={Position.Bottom} style={{ ...handleStyle(s.border), transform: 'rotate(-45deg)' }} />
        </div>
        {d.label && d.label !== 'XOR' && (
          <span className="mt-1.5 text-[10px] font-medium max-w-[120px] text-center leading-tight" style={{ color: s.text }}
            onDoubleClick={() => edit.setEditing(true)}>
            {edit.editing ? <InlineInput {...inputProps} /> : d.label}
          </span>
        )}
        {selected && <DeleteButton id={id} onDelete={d.onDelete} />}
      </div>
    );
  }

  // Decision — orange diamond
  if (d.nodeType === 'decision') {
    return (
      <div className="flex flex-col items-center" onClick={handleNodeClick}>
        <TypeBadge nodeType={d.nodeType} style={s} onCycleType={edit.cycleType} />
        <div className="relative flex items-center justify-center transition-all duration-200 mt-1"
          style={{ width: 80, height: 80, background: s.bgGradient, border: `2px solid ${s.border}`, borderRadius: 6, transform: 'rotate(45deg)', boxShadow }}>
          <Handle type="target" position={Position.Top} style={{ ...handleStyle(s.border), transform: 'rotate(-45deg)' }} />
          {edit.editing ? (
            <div style={{ transform: 'rotate(-45deg)', width: 60 }}><InlineInput {...inputProps} /></div>
          ) : (
            <span className="text-[10px] font-bold leading-tight text-center max-w-[50px] cursor-text"
              style={{ color: s.text, transform: 'rotate(-45deg)' }} onDoubleClick={() => edit.setEditing(true)}>
              {d.label}
            </span>
          )}
          <Handle type="source" position={Position.Bottom} style={{ ...handleStyle(s.border), transform: 'rotate(-45deg)' }} />
        </div>
        {selected && <DeleteButton id={id} onDelete={d.onDelete} />}
      </div>
    );
  }

  // Event — hexagon
  if (d.nodeType === 'event') {
    return (
      <div className="flex flex-col items-center" onClick={handleNodeClick}>
        <TypeBadge nodeType={d.nodeType} style={s} onCycleType={edit.cycleType} />
        <div className="relative flex items-center justify-center transition-all duration-200 mt-1"
          style={{ minWidth: 160, minHeight: 72, background: s.bgGradient, border: `2px solid ${s.border}`,
            clipPath: 'polygon(20% 0%, 80% 0%, 100% 50%, 80% 100%, 20% 100%, 0% 50%)',
            padding: '16px 36px', boxShadow }}>
          <Handle type="target" position={Position.Top} style={handleStyle(s.border)} />
          {edit.editing ? <InlineInput {...inputProps} /> : (
            <span className="text-xs font-semibold leading-tight cursor-text" onDoubleClick={() => edit.setEditing(true)}>{d.label}</span>
          )}
          <Handle type="source" position={Position.Bottom} style={handleStyle(s.border)} />
        </div>
        {selected && <DeleteButton id={id} onDelete={d.onDelete} />}
      </div>
    );
  }

  // Start/End — pill/oval
  if (d.nodeType === 'start-end') {
    return (
      <div className="flex flex-col items-center" onClick={handleNodeClick}>
        <TypeBadge nodeType={d.nodeType} style={s} onCycleType={edit.cycleType} />
        <div className="relative flex items-center justify-center text-center transition-all duration-200 mt-1"
          style={{ minWidth: 160, padding: '14px 28px', background: s.bgGradient, border: `2px solid ${s.border}`, borderRadius: 999, boxShadow }}>
          <Handle type="target" position={Position.Top} style={handleStyle(s.border)} />
          {edit.editing ? <InlineInput {...inputProps} /> : (
            <span className="text-xs font-semibold leading-snug cursor-text" onDoubleClick={() => edit.setEditing(true)}>{d.label}</span>
          )}
          <Handle type="source" position={Position.Bottom} style={handleStyle(s.border)} />
        </div>
        {selected && <DeleteButton id={id} onDelete={d.onDelete} />}
      </div>
    );
  }

  // Storage — triangle
  if (d.nodeType === 'storage') {
    return (
      <div className="flex flex-col items-center" onClick={handleNodeClick}>
        <TypeBadge nodeType={d.nodeType} style={s} onCycleType={edit.cycleType} />
        <div className="relative flex items-center justify-center transition-all duration-200 mt-1"
          style={{ width: 120, height: 90, background: s.bgGradient,
            clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)', boxShadow }}>
          <Handle type="target" position={Position.Top} style={handleStyle(s.border)} />
          <div className="mt-5 text-center px-2">
            {edit.editing ? <InlineInput {...inputProps} /> : (
              <span className="text-[10px] font-semibold leading-tight cursor-text" style={{ color: s.text }}
                onDoubleClick={() => edit.setEditing(true)}>{d.label}</span>
            )}
          </div>
          <Handle type="source" position={Position.Bottom} style={handleStyle(s.border)} />
        </div>
        {selected && <DeleteButton id={id} onDelete={d.onDelete} />}
      </div>
    );
  }

  // Delay — D-shape
  if (d.nodeType === 'delay') {
    return (
      <div className="flex flex-col items-center" onClick={handleNodeClick}>
        <TypeBadge nodeType={d.nodeType} style={s} onCycleType={edit.cycleType} />
        <div className="relative flex items-center justify-center text-center transition-all duration-200 mt-1"
          style={{ minWidth: 160, padding: '14px 20px', background: s.bgGradient, border: `2px solid ${s.border}`,
            borderRadius: '0 999px 999px 0', boxShadow }}>
          <Handle type="target" position={Position.Top} style={handleStyle(s.border)} />
          {edit.editing ? <InlineInput {...inputProps} /> : (
            <span className="text-xs font-semibold leading-snug cursor-text" onDoubleClick={() => edit.setEditing(true)}>{d.label}</span>
          )}
          <Handle type="source" position={Position.Bottom} style={handleStyle(s.border)} />
        </div>
        {selected && <DeleteButton id={id} onDelete={d.onDelete} />}
      </div>
    );
  }

  // Document — wavy bottom
  if (d.nodeType === 'document') {
    return (
      <div className="flex flex-col items-center" onClick={handleNodeClick}>
        <TypeBadge nodeType={d.nodeType} style={s} onCycleType={edit.cycleType} />
        <div className="relative mt-1" style={{ minWidth: 180 }}>
          <svg width="100%" height="80" viewBox="0 0 180 80" preserveAspectRatio="none">
            <path d="M0,0 H180 V60 Q135,80 90,60 Q45,40 0,60 Z"
              fill="url(#editDocGrad)" stroke={s.border} strokeWidth="2" />
            <defs>
              <linearGradient id="editDocGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f5f3ff" />
                <stop offset="100%" stopColor="#e9d5ff" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center pb-3">
            <Handle type="target" position={Position.Top} style={handleStyle(s.border)} />
            {edit.editing ? (
              <div className="px-4 w-full"><InlineInput {...inputProps} /></div>
            ) : (
              <span className="text-xs font-semibold leading-tight text-center px-4 cursor-text"
                style={{ color: s.text }} onDoubleClick={() => edit.setEditing(true)}>{d.label}</span>
            )}
            <Handle type="source" position={Position.Bottom} style={handleStyle(s.border)} />
          </div>
        </div>
        {selected && <DeleteButton id={id} onDelete={d.onDelete} />}
      </div>
    );
  }

  // Default: Step / Interface — card-style with description and indicators
  return (
    <div className="flex flex-col items-center" onClick={handleNodeClick}>
      <div className="relative transition-all duration-200"
        style={{
          minWidth: 220, maxWidth: 280,
          background: s.bgGradient, border: `2px solid ${s.border}`,
          borderRadius: d.nodeType === 'interface' ? 8 : 12, boxShadow,
          ...(d.nodeType === 'interface' ? { borderLeft: `4px solid ${s.border}` } : {}),
        }}>
        <Handle type="target" position={Position.Top} style={handleStyle(s.border)} />

        {/* Header with icon and type */}
        <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5">
          <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
            style={{ backgroundColor: s.iconBg }}>
            <span className="text-[10px] font-bold text-white">
              {d.nodeType === 'in-scope' ? '≡' : d.nodeType === 'interface' ? '⇔' : '•'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            {edit.editing ? <InlineInput {...inputProps} /> : (
              <span className="text-xs font-semibold leading-snug cursor-text block truncate"
                style={{ color: s.text }}
                onDoubleClick={() => edit.setEditing(true)}>{d.label}</span>
            )}
          </div>
          <TypeBadge nodeType={d.nodeType} style={s} onCycleType={edit.cycleType} />
        </div>

        {/* Divider */}
        <div className="mx-3 border-t" style={{ borderColor: `${s.border}40` }} />

        {/* Description */}
        <div className="px-3 py-1.5">
          <span className="text-[10px] leading-tight block" style={{ color: `${s.text}99` }}>
            {d.description || 'No description'}
          </span>
        </div>

        {/* Relation indicators */}
        {hasRelations && (
          <>
            <div className="mx-3 border-t" style={{ borderColor: `${s.border}40` }} />
            <div className="px-3 py-1.5 flex items-center gap-1">
              {indicatorRow}
            </div>
          </>
        )}

        {/* Delete */}
        {selected && (
          <div className="absolute -top-2 -right-2">
            <DeleteButton id={id} onDelete={d.onDelete} />
          </div>
        )}

        <Handle type="source" position={Position.Bottom} style={handleStyle(s.border)} />
      </div>
    </div>
  );
}

export default memo(EditableEPCNode);
