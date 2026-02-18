import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react';
import type { NodeType } from '@/types/epc';
import { Trash2, GripVertical } from 'lucide-react';

interface EditableEPCNodeData {
  label: string;
  nodeType: NodeType;
  nodeId: string;
  onDelete?: (id: string) => void;
  onLabelChange?: (id: string, label: string) => void;
  onTypeChange?: (id: string, type: NodeType) => void;
  [key: string]: unknown;
}

const STYLE_MAP: Record<NodeType, { bg: string; border: string; text: string }> = {
  'in-scope': { bg: '#dcfce7', border: '#16a34a', text: '#14532d' },
  'interface': { bg: '#f8fafc', border: '#94a3b8', text: '#1e293b' },
  'event': { bg: '#fce7f3', border: '#db2777', text: '#831843' },
  'xor': { bg: '#dbeafe', border: '#2563eb', text: '#1e3a8a' },
};

const NODE_TYPES: NodeType[] = ['in-scope', 'interface', 'event', 'xor'];

function EditableEPCNode({ id, data, selected }: NodeProps) {
  const d = data as EditableEPCNodeData;
  const style = STYLE_MAP[d.nodeType] || STYLE_MAP['in-scope'];
  const isXor = d.nodeType === 'xor';
  const isEvent = d.nodeType === 'event';
  const [editing, setEditing] = useState(false);
  const [labelText, setLabelText] = useState(d.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setLabelText(d.label); }, [d.label]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commitLabel = useCallback(() => {
    setEditing(false);
    if (labelText.trim() && labelText !== d.label) {
      d.onLabelChange?.(id, labelText.trim());
    } else {
      setLabelText(d.label);
    }
  }, [labelText, d, id]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitLabel();
    if (e.key === 'Escape') { setLabelText(d.label); setEditing(false); }
  }, [commitLabel, d.label]);

  const cycleType = useCallback(() => {
    const idx = NODE_TYPES.indexOf(d.nodeType);
    const next = NODE_TYPES[(idx + 1) % NODE_TYPES.length];
    d.onTypeChange?.(id, next);
  }, [d, id]);

  return (
    <div className="group flex flex-col items-center">
      {/* Node ID + type badge */}
      <div className="flex items-center gap-1 mb-1">
        <span className="text-[10px] font-mono px-1 rounded" style={{ color: style.border, backgroundColor: `${style.bg}dd` }}>
          {d.nodeId}
        </span>
        <button
          onClick={cycleType}
          className="text-[9px] font-medium px-1.5 py-0.5 rounded-full border cursor-pointer hover:opacity-80 transition-opacity"
          style={{ borderColor: style.border, color: style.text, backgroundColor: style.bg }}
          title="Click to cycle node type"
        >
          {d.nodeType}
        </button>
      </div>

      <div
        className={`relative flex items-center justify-center text-center border-2 shadow-sm transition-shadow ${selected ? 'shadow-md ring-2 ring-primary/40' : ''} ${isXor ? 'rounded-full w-[70px] h-[70px] p-2' : isEvent ? 'min-w-[160px]' : 'rounded-lg min-w-[180px] max-w-[240px] px-4 py-3'}`}
        style={{
          backgroundColor: style.bg,
          borderColor: style.border,
          color: style.text,
          clipPath: isEvent ? 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' : undefined,
          minHeight: isEvent ? '80px' : undefined,
          padding: isEvent ? '16px 32px' : undefined,
        }}
      >
        <Handle type="target" position={Position.Top} className="!bg-slate-400 !w-3 !h-3 !border-2 !border-background hover:!bg-primary transition-colors" />

        {editing && !isXor ? (
          <input
            ref={inputRef}
            value={labelText}
            onChange={e => setLabelText(e.target.value)}
            onBlur={commitLabel}
            onKeyDown={handleKeyDown}
            className="bg-transparent text-center text-xs w-full outline-none border-b border-dashed"
            style={{ color: style.text, borderColor: style.border }}
          />
        ) : (
          <span
            className={`cursor-text ${isXor ? 'text-xs font-bold' : 'text-xs leading-tight'}`}
            onDoubleClick={() => !isXor && setEditing(true)}
            title={isXor ? 'XOR Gateway' : 'Double-click to edit'}
          >
            {isXor ? 'XOR' : d.label}
          </span>
        )}

        <Handle type="source" position={Position.Bottom} className="!bg-slate-400 !w-3 !h-3 !border-2 !border-background hover:!bg-primary transition-colors" />
      </div>

      {/* Delete button on hover/select */}
      {selected && (
        <button
          onClick={() => d.onDelete?.(id)}
          className="mt-1 p-1 rounded-full bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors"
          title="Delete node"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

export default memo(EditableEPCNode);
