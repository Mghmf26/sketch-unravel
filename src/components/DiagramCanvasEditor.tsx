import { useCallback, useMemo, useState, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  type Node,
  type Edge,
  type Connection,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus, LayoutGrid, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import EditableEPCNode from '@/components/EditableEPCNode';
import { getLayoutedElements } from '@/lib/layout';
import type { EPCNode, EPCConnection, NodeType } from '@/types/epc';

interface DiagramCanvasEditorProps {
  nodes: EPCNode[];
  connections: EPCConnection[];
  onChange: (nodes: EPCNode[], connections: EPCConnection[]) => void;
}

const nodeTypes = { epc: EditableEPCNode };

const EDGE_STYLE = {
  type: 'smoothstep' as const,
  animated: false,
  style: { stroke: '#94a3b8', strokeWidth: 2.5 },
  markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b', width: 18, height: 18 },
  labelStyle: { fontSize: 11, fontWeight: 700, fill: '#334155', letterSpacing: '0.02em' },
  labelBgStyle: { fill: '#f8fafc', stroke: '#e2e8f0', strokeWidth: 1, rx: 6, ry: 6 },
  labelBgPadding: [8, 5] as [number, number],
};

function toFlowElements(
  epcNodes: EPCNode[],
  epcConnections: EPCConnection[],
  callbacks: { onDelete: (id: string) => void; onLabelChange: (id: string, label: string) => void; onTypeChange: (id: string, type: NodeType) => void }
) {
  const flowNodes: Node[] = epcNodes.map((n) => ({
    id: n.id,
    type: 'epc',
    position: { x: 0, y: 0 },
    data: {
      label: n.label,
      nodeType: n.type,
      nodeId: n.id,
      onDelete: callbacks.onDelete,
      onLabelChange: callbacks.onLabelChange,
      onTypeChange: callbacks.onTypeChange,
    },
  }));

  const flowEdges: Edge[] = epcConnections.map((c) => ({
    id: c.id,
    source: c.source,
    target: c.target,
    label: c.label || undefined,
    ...EDGE_STYLE,
  }));

  return getLayoutedElements(flowNodes, flowEdges, 'TB');
}

export default function DiagramCanvasEditor({ nodes: epcNodes, connections: epcConnections, onChange }: DiagramCanvasEditorProps) {
  const epcNodesRef = useRef(epcNodes);
  const epcConnectionsRef = useRef(epcConnections);
  epcNodesRef.current = epcNodes;
  epcConnectionsRef.current = epcConnections;

  // Callbacks for node data changes
  const handleDeleteNode = useCallback((nodeId: string) => {
    const updatedNodes = epcNodesRef.current.filter(n => n.id !== nodeId);
    const updatedConns = epcConnectionsRef.current.filter(c => c.source !== nodeId && c.target !== nodeId);
    onChange(updatedNodes, updatedConns);
  }, [onChange]);

  const handleLabelChange = useCallback((nodeId: string, label: string) => {
    const updatedNodes = epcNodesRef.current.map(n => n.id === nodeId ? { ...n, label } : n);
    onChange(updatedNodes, epcConnectionsRef.current);
  }, [onChange]);

  const handleTypeChange = useCallback((nodeId: string, type: NodeType) => {
    const updatedNodes = epcNodesRef.current.map(n => n.id === nodeId ? { ...n, type } : n);
    onChange(updatedNodes, epcConnectionsRef.current);
  }, [onChange]);

  const callbacks = useMemo(() => ({
    onDelete: handleDeleteNode,
    onLabelChange: handleLabelChange,
    onTypeChange: handleTypeChange,
  }), [handleDeleteNode, handleLabelChange, handleTypeChange]);

  // Build flow elements
  const initial = useMemo(() => toFlowElements(epcNodes, epcConnections, callbacks), []);
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(initial.nodes);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(initial.edges);

  // Re-layout when epc data changes externally
  const prevDataRef = useRef({ nodes: epcNodes, connections: epcConnections });
  if (epcNodes !== prevDataRef.current.nodes || epcConnections !== prevDataRef.current.connections) {
    prevDataRef.current = { nodes: epcNodes, connections: epcConnections };
    const { nodes: ln, edges: le } = toFlowElements(epcNodes, epcConnections, callbacks);
    // Preserve positions if possible
    const posMap = new Map(flowNodes.map(n => [n.id, n.position]));
    const merged = ln.map(n => ({ ...n, position: posMap.get(n.id) || n.position }));
    setFlowNodes(merged);
    setFlowEdges(le);
  }

  // Handle new connection drawn by user
  const onConnect = useCallback((connection: Connection) => {
    const newConn: EPCConnection = {
      id: crypto.randomUUID(),
      source: connection.source,
      target: connection.target,
      label: '',
    };
    onChange(epcNodesRef.current, [...epcConnectionsRef.current, newConn]);
  }, [onChange]);

  // Handle edge deletion
  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    onEdgesChange(changes);
    const removals = changes.filter(c => c.type === 'remove').map(c => (c as any).id);
    if (removals.length > 0) {
      const updatedConns = epcConnectionsRef.current.filter(c => !removals.includes(c.id));
      onChange(epcNodesRef.current, updatedConns);
    }
  }, [onEdgesChange, onChange]);

  // Handle node position changes (just visual, no data change needed)
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes);
  }, [onNodesChange]);

  // Add node
  const addNode = useCallback((type: NodeType) => {
    const id = crypto.randomUUID();
    const labels: Record<NodeType, string> = {
      'in-scope': 'New Step', 'interface': 'New Process Interface', 'event': 'New Event', 'xor': 'XOR',
      'start-end': 'Start', 'decision': 'Decision?', 'storage': 'Storage', 'delay': 'Delay', 'document': 'Document',
    };
    const newNode: EPCNode = { id, label: labels[type], type, description: '' };
    onChange([...epcNodesRef.current, newNode], epcConnectionsRef.current);
  }, [onChange]);

  // Auto-layout
  const autoLayout = useCallback(() => {
    const { nodes: ln, edges: le } = toFlowElements(epcNodesRef.current, epcConnectionsRef.current, callbacks);
    setFlowNodes(ln);
    setFlowEdges(le);
  }, [callbacks, setFlowNodes, setFlowEdges]);

  // Edge click to edit label
  const onEdgeDoubleClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    const newLabel = prompt('Connection label (e.g. Yes, No, or leave empty):', (edge.label as string) || '');
    if (newLabel === null) return;
    const updatedConns = epcConnectionsRef.current.map(c =>
      c.id === edge.id ? { ...c, label: newLabel || undefined } : c
    );
    onChange(epcNodesRef.current, updatedConns);
  }, [onChange]);

  return (
    <div className="h-[75vh] rounded-lg border bg-background overflow-hidden">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onEdgeDoubleClick={onEdgeDoubleClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        deleteKeyCode="Delete"
        attributionPosition="bottom-left"
        connectionLineStyle={{ stroke: '#94a3b8', strokeWidth: 2.5 }}
        defaultEdgeOptions={EDGE_STYLE}
        snapToGrid
        snapGrid={[15, 15]}
        style={{ background: '#f8fafc' }}
      >
        <Background gap={20} size={1} color="#e2e8f0" />
        <Controls className="!bg-white !border-border !shadow-lg !rounded-lg" />
        <MiniMap
          nodeStrokeWidth={2} pannable zoomable
          style={{ border: '1px solid #e2e8f0', borderRadius: 8 }}
          nodeColor={(n: any) => {
            const t = n.data?.nodeType;
            if (t === 'in-scope') return '#10b981';
            if (t === 'event') return '#ec4899';
            if (t === 'xor') return '#3b82f6';
            if (t === 'start-end') return '#22c55e';
            if (t === 'decision') return '#f97316';
            if (t === 'storage') return '#eab308';
            if (t === 'delay') return '#ef4444';
            if (t === 'document') return '#8b5cf6';
            return '#94a3b8';
          }}
        />

        <Panel position="top-right" className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="secondary" className="shadow-md">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Node
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => addNode('in-scope')}>
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 mr-2" /> Step
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addNode('interface')}>
                <span className="w-2.5 h-2.5 rounded-sm bg-slate-300 mr-2" /> Process Interface
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addNode('event')}>
                <span className="w-2.5 h-2.5 rounded-sm bg-pink-400 mr-2" /> Event
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addNode('xor')}>
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400 mr-2" /> XOR Gateway
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addNode('start-end')}>
                <span className="w-2.5 h-2.5 rounded-full bg-green-400 mr-2" /> Start / End
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addNode('decision')}>
                <span className="w-2.5 h-2.5 rotate-45 bg-orange-400 mr-2" /> Decision
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addNode('storage')}>
                <span className="w-0 h-0 border-l-[5px] border-r-[5px] border-b-[8px] border-transparent border-b-yellow-400 mr-2" /> Storage
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addNode('delay')}>
                <span className="w-2.5 h-2.5 rounded-r-full bg-red-400 mr-2" /> Delay / Wait
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addNode('document')}>
                <span className="w-2.5 h-2.5 rounded-sm bg-violet-400 mr-2" /> Document
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button size="sm" variant="secondary" className="shadow-md" onClick={autoLayout} title="Auto-layout">
            <LayoutGrid className="h-3.5 w-3.5 mr-1" /> Layout
          </Button>
        </Panel>

        <Panel position="bottom-right" className="text-[10px] text-muted-foreground bg-background/80 px-2 py-1 rounded">
          Double-click node to edit label · Click type badge to cycle · Drag from handle to connect · Select + Delete to remove · Double-click edge to label
        </Panel>
      </ReactFlow>
    </div>
  );
}
