import { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Trash2, Database } from 'lucide-react';
import { MF_NODE_TYPE_META, type MFNodeType } from '@/lib/api-mainframe-flows';

interface MFNodeData {
  label: string;
  nodeType: MFNodeType;
  nodeId: string;
  description: string;
  dataSourceCount?: number;
  onDelete: (id: string) => void;
  onLabelChange: (id: string, label: string) => void;
  onAttachDataSource?: (nodeId: string) => void;
  [key: string]: unknown;
}

const handleStyle = (color: string) => ({
  background: color, width: 10, height: 10,
  border: '2px solid white', boxShadow: `0 0 0 1px ${color}40`,
});

function MFCustomNode({ data }: NodeProps) {
  const d = data as MFNodeData;
  const meta = MF_NODE_TYPE_META[d.nodeType] || MF_NODE_TYPE_META['program'];
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(d.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

  const commitEdit = () => {
    setEditing(false);
    if (editLabel.trim() && editLabel !== d.label) d.onLabelChange(d.nodeId, editLabel.trim());
    else setEditLabel(d.label);
  };

  return (
    <div className="flex flex-col items-center group">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full border"
          style={{ borderColor: meta.color, color: meta.color, backgroundColor: meta.badgeBg }}>
          {meta.label}
        </span>
        {/* Data source indicator */}
        {(d.dataSourceCount ?? 0) > 0 && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-300 flex items-center gap-0.5"
            title={`${d.dataSourceCount} data source(s)`}>
            <Database className="h-2.5 w-2.5" /> {d.dataSourceCount}
          </span>
        )}
        {d.onAttachDataSource && (
          <button onClick={() => d.onAttachDataSource?.(d.nodeId)}
            className="opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 flex items-center justify-center rounded hover:bg-blue-100"
            title="Attach data source">
            <Database className="h-3 w-3 text-blue-600" />
          </button>
        )}
        <button onClick={() => d.onDelete(d.nodeId)}
          className="opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 flex items-center justify-center rounded hover:bg-destructive/20">
          <Trash2 className="h-3 w-3 text-destructive" />
        </button>
      </div>
      <div className="relative flex items-center justify-center text-center"
        style={{
          minWidth: 190, maxWidth: 260, padding: '14px 20px',
          background: `linear-gradient(135deg, ${meta.badgeBg} 0%, white 100%)`,
          border: `2px solid ${meta.color}`, borderRadius: 12,
          boxShadow: `0 4px 14px -2px ${meta.color}30`,
        }}>
        <Handle type="target" position={Position.Top} style={handleStyle(meta.color)} />
        {editing ? (
          <input ref={inputRef} value={editLabel} onChange={e => setEditLabel(e.target.value)}
            onBlur={commitEdit} onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') { setEditLabel(d.label); setEditing(false); } }}
            className="text-xs font-medium bg-transparent border-b border-current outline-none text-center w-full" style={{ color: meta.color }} />
        ) : (
          <span className="text-xs font-medium leading-snug cursor-text" onDoubleClick={() => { setEditLabel(d.label); setEditing(true); }}
            style={{ color: '#1e293b' }}>{d.label}</span>
        )}
        <Handle type="source" position={Position.Bottom} style={handleStyle(meta.color)} />
      </div>
    </div>
  );
}

export default memo(MFCustomNode);
