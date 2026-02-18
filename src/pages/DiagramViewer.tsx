import { useEffect, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  useNodesState,
  useEdgesState,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowLeft, Download, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDiagram } from '@/lib/store';
import { getLayoutedElements } from '@/lib/layout';
import { exportToExcel } from '@/lib/excel-export';
import EPCCustomNode from '@/components/EPCCustomNode';
import type { EPCDiagram } from '@/types/epc';

const nodeTypes = { epc: EPCCustomNode };

function buildFlowElements(diagram: EPCDiagram) {
  const initialNodes: Node[] = diagram.nodes.map((n) => ({
    id: n.id,
    type: 'epc',
    position: { x: 0, y: 0 },
    data: { label: n.label, nodeType: n.type, nodeId: n.id },
  }));

  const initialEdges: Edge[] = diagram.connections.map((c) => ({
    id: c.id,
    source: c.source,
    target: c.target,
    label: c.label,
    type: 'smoothstep',
    animated: false,
    style: { stroke: '#64748b', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
    labelStyle: { fontSize: 11, fontWeight: 600, fill: '#475569' },
    labelBgStyle: { fill: '#f1f5f9', stroke: '#cbd5e1', strokeWidth: 1 },
    labelBgPadding: [6, 4] as [number, number],
  }));

  return getLayoutedElements(initialNodes, initialEdges, 'TB');
}

export default function DiagramViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [diagram, setDiagram] = useState<EPCDiagram | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (!id) return;
    const d = getDiagram(id);
    if (d) {
      setDiagram(d);
      const { nodes: ln, edges: le } = buildFlowElements(d);
      setNodes(ln);
      setEdges(le);
    }
  }, [id, setNodes, setEdges]);

  const handleExport = useCallback(() => {
    if (diagram) exportToExcel(diagram);
  }, [diagram]);

  if (!diagram) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Diagram not found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-foreground">{diagram.processName}</h1>
            <p className="text-xs text-muted-foreground font-mono">{diagram.processId} · {diagram.nodes.length} nodes · {diagram.connections.length} connections</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate(`/edit/${diagram.id}`)} variant="outline" size="sm">
            <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
          </Button>
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="mr-2 h-3.5 w-3.5" /> Export Excel
          </Button>
        </div>
      </div>
      <div className="flex-1" style={{ minHeight: 500 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          attributionPosition="bottom-left"
        >
          <Background />
          <Controls />
          <MiniMap nodeStrokeWidth={2} pannable zoomable />
        </ReactFlow>
      </div>
    </div>
  );
}
