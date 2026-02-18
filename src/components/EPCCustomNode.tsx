import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { NodeType } from '@/types/epc';

interface EPCNodeData {
  label: string;
  nodeType: NodeType;
  nodeId: string;
  [key: string]: unknown;
}

const STYLE_MAP: Record<NodeType, { bg: string; border: string; text: string; shape: string }> = {
  'in-scope': { bg: '#dcfce7', border: '#16a34a', text: '#14532d', shape: 'rounded-lg' },
  'interface': { bg: '#f8fafc', border: '#94a3b8', text: '#1e293b', shape: 'rounded-sm' },
  'event': { bg: '#fce7f3', border: '#db2777', text: '#831843', shape: 'clip-hexagon' },
  'xor': { bg: '#dbeafe', border: '#2563eb', text: '#1e3a8a', shape: 'rounded-full' },
};

function EPCCustomNode({ data }: NodeProps) {
  const d = data as EPCNodeData;
  const style = STYLE_MAP[d.nodeType] || STYLE_MAP['in-scope'];
  const isXor = d.nodeType === 'xor';
  const isEvent = d.nodeType === 'event';

  return (
    <div className="flex flex-col items-center">
      {/* Node ID label above */}
      <div className="text-[10px] font-mono mb-1 px-1 rounded"
        style={{ color: style.border, backgroundColor: `${style.bg}dd` }}>
        {d.nodeId}
      </div>

      <div
        className={`relative flex items-center justify-center text-center px-4 py-3 border-2 shadow-sm min-w-[180px] max-w-[240px] ${isXor ? 'rounded-full min-w-[70px] max-w-[70px] min-h-[70px] max-h-[70px] p-2' : isEvent ? 'min-w-[160px]' : 'rounded-lg'}`}
        style={{
          backgroundColor: style.bg,
          borderColor: style.border,
          color: style.text,
          clipPath: isEvent ? 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' : undefined,
          minHeight: isEvent ? '80px' : undefined,
          padding: isEvent ? '16px 32px' : undefined,
        }}
      >
        <Handle type="target" position={Position.Top} className="!bg-slate-400 !w-2 !h-2" />
        <span className={`${isXor ? 'text-xs font-bold' : 'text-xs leading-tight'}`}>
          {isXor ? 'XOR' : d.label}
        </span>
        <Handle type="source" position={Position.Bottom} className="!bg-slate-400 !w-2 !h-2" />
      </div>
    </div>
  );
}

export default memo(EPCCustomNode);
