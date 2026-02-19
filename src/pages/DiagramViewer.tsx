import { useEffect, useCallback, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  MarkerType,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowLeft, Download, Save, Plus, LayoutGrid, Eye, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { getDiagram, saveDiagram } from '@/lib/store';
import { getLayoutedElements } from '@/lib/layout';
import { exportToExcel } from '@/lib/excel-export';
import EditableEPCNode from '@/components/EditableEPCNode';
import type { EPCDiagram, EPCNode, EPCConnection, NodeType } from '@/types/epc';

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

export default function DiagramViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [diagram, setDiagram] = useState<EPCDiagram | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Keep mutable refs for EPC data used by callbacks
  const epcNodesRef = useRef<EPCNode[]>([]);
  const epcConnsRef = useRef<EPCConnection[]>([]);

  // Node callbacks
  const handleDeleteNode = useCallback((nodeId: string) => {
    epcNodesRef.current = epcNodesRef.current.filter(n => n.id !== nodeId);
    epcConnsRef.current = epcConnsRef.current.filter(c => c.source !== nodeId && c.target !== nodeId);
    rebuildFlow();
    setHasChanges(true);
  }, []);

  const handleLabelChange = useCallback((nodeId: string, label: string) => {
    epcNodesRef.current = epcNodesRef.current.map(n => n.id === nodeId ? { ...n, label } : n);
    rebuildFlow();
    setHasChanges(true);
  }, []);

  const handleTypeChange = useCallback((nodeId: string, type: NodeType) => {
    epcNodesRef.current = epcNodesRef.current.map(n => n.id === nodeId ? { ...n, type } : n);
    rebuildFlow();
    setHasChanges(true);
  }, []);

  const callbacks = useRef({ onDelete: handleDeleteNode, onLabelChange: handleLabelChange, onTypeChange: handleTypeChange });

  function buildFlow(epcNodes: EPCNode[], epcConns: EPCConnection[]) {
    const flowNodes: Node[] = epcNodes.map((n) => ({
      id: n.id,
      type: 'epc',
      position: { x: 0, y: 0 },
      data: {
        label: n.label, nodeType: n.type, nodeId: n.id,
        onDelete: callbacks.current.onDelete,
        onLabelChange: callbacks.current.onLabelChange,
        onTypeChange: callbacks.current.onTypeChange,
      },
    }));
    const flowEdges: Edge[] = epcConns.map((c) => ({
      id: c.id, source: c.source, target: c.target,
      label: c.label || undefined,
      ...EDGE_STYLE,
    }));
    return getLayoutedElements(flowNodes, flowEdges, 'TB');
  }

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Rebuild flow from EPC data, preserving positions where possible
  const rebuildFlow = useCallback(() => {
    const { nodes: ln, edges: le } = buildFlow(epcNodesRef.current, epcConnsRef.current);
    setNodes(prev => {
      const posMap = new Map(prev.map(n => [n.id, n.position]));
      return ln.map(n => ({ ...n, position: posMap.get(n.id) || n.position }));
    });
    setEdges(le);
  }, [setNodes, setEdges]);

  useEffect(() => {
    if (!id) return;
    const d = getDiagram(id);
    if (d) {
      setDiagram(d);
      epcNodesRef.current = [...d.nodes];
      epcConnsRef.current = [...d.connections];
      const { nodes: ln, edges: le } = buildFlow(d.nodes, d.connections);
      setNodes(ln);
      setEdges(le);
    }
  }, [id, setNodes, setEdges]);

  // Connection handling
  const onConnect = useCallback((connection: Connection) => {
    if (!editMode) return;
    epcConnsRef.current = [...epcConnsRef.current, {
      id: crypto.randomUUID(), source: connection.source, target: connection.target, label: '',
    }];
    rebuildFlow();
    setHasChanges(true);
  }, [editMode, rebuildFlow]);

  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    if (!editMode) {
      // In view mode, allow selection only
      const safe = changes.filter(c => c.type === 'select');
      onEdgesChange(safe);
      return;
    }
    onEdgesChange(changes);
    const removals = changes.filter(c => c.type === 'remove').map(c => (c as any).id);
    if (removals.length > 0) {
      epcConnsRef.current = epcConnsRef.current.filter(c => !removals.includes(c.id));
      setHasChanges(true);
    }
  }, [editMode, onEdgesChange]);

  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    if (!editMode) {
      const safe = changes.filter(c => c.type === 'select' || c.type === 'dimensions');
      onNodesChange(safe);
      return;
    }
    onNodesChange(changes);
    const removals = changes.filter(c => c.type === 'remove').map(c => (c as any).id);
    if (removals.length > 0) {
      removals.forEach(nodeId => {
        epcNodesRef.current = epcNodesRef.current.filter(n => n.id !== nodeId);
        epcConnsRef.current = epcConnsRef.current.filter(c => c.source !== nodeId && c.target !== nodeId);
      });
      setHasChanges(true);
    }
  }, [editMode, onNodesChange]);

  const onEdgeDoubleClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    if (!editMode) return;
    const newLabel = prompt('Connection label (e.g. Yes, No, or leave empty):', (edge.label as string) || '');
    if (newLabel === null) return;
    epcConnsRef.current = epcConnsRef.current.map(c => c.id === edge.id ? { ...c, label: newLabel || undefined } : c);
    rebuildFlow();
    setHasChanges(true);
  }, [editMode, rebuildFlow]);

  // Add node
  const addNode = useCallback((type: NodeType) => {
    const id = `${type.toUpperCase().replace('-', '')}-${Date.now().toString(36)}`;
    const labels: Record<NodeType, string> = {
      'in-scope': 'New Process Step', 'interface': 'New Interface', 'event': 'New Event', 'xor': 'XOR',
    };
    epcNodesRef.current = [...epcNodesRef.current, { id, label: labels[type], type, description: '' }];
    rebuildFlow();
    setHasChanges(true);
  }, [rebuildFlow]);

  // Auto-layout
  const autoLayout = useCallback(() => {
    const { nodes: ln, edges: le } = buildFlow(epcNodesRef.current, epcConnsRef.current);
    setNodes(ln);
    setEdges(le);
  }, [setNodes, setEdges]);

  // Save
  const handleSave = useCallback(() => {
    if (!diagram) return;
    const updated: EPCDiagram = {
      ...diagram,
      nodes: epcNodesRef.current,
      connections: epcConnsRef.current,
      updatedAt: new Date().toISOString(),
    };
    saveDiagram(updated);
    setDiagram(updated);
    setHasChanges(false);
    toast({ title: 'Diagram saved!', description: `${updated.nodes.length} nodes, ${updated.connections.length} connections.` });
  }, [diagram]);

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
            <p className="text-xs text-muted-foreground font-mono">
              {diagram.processId} · {epcNodesRef.current.length} nodes · {epcConnsRef.current.length} connections
              {editMode && <span className="ml-2 text-primary font-semibold">✎ Editing</span>}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setEditMode(!editMode)}
            variant={editMode ? 'default' : 'outline'}
            size="sm"
          >
            {editMode ? <Eye className="mr-2 h-3.5 w-3.5" /> : <Pencil className="mr-2 h-3.5 w-3.5" />}
            {editMode ? 'View Mode' : 'Edit Mode'}
          </Button>
          {hasChanges && (
            <Button onClick={handleSave} size="sm" variant="default">
              <Save className="mr-2 h-3.5 w-3.5" /> Save
            </Button>
          )}
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="mr-2 h-3.5 w-3.5" /> Export
          </Button>
        </div>
      </div>
      <div className="flex-1" style={{ minHeight: 500 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onEdgeDoubleClick={onEdgeDoubleClick}
          nodeTypes={nodeTypes}
          nodesDraggable={editMode}
          nodesConnectable={editMode}
          elementsSelectable={true}
          deleteKeyCode={editMode ? 'Delete' : null}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          attributionPosition="bottom-left"
          connectionLineStyle={{ stroke: '#94a3b8', strokeWidth: 2.5 }}
          defaultEdgeOptions={EDGE_STYLE}
          snapToGrid={editMode}
          snapGrid={[15, 15]}
          style={{ background: '#f8fafc' }}
        >
          <Background gap={20} size={1} color="#e2e8f0" />
          <Controls className="!bg-white !border-border !shadow-lg !rounded-lg" />
          <MiniMap
            nodeStrokeWidth={2}
            pannable
            zoomable
            style={{ border: '1px solid #e2e8f0', borderRadius: 8 }}
            nodeColor={(n: any) => {
              const t = n.data?.nodeType;
              if (t === 'in-scope') return '#10b981';
              if (t === 'event') return '#ec4899';
              if (t === 'xor') return '#3b82f6';
              return '#94a3b8';
            }}
          />

          {editMode && (
            <>
              <Panel position="top-right" className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="secondary" className="shadow-md">
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Node
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => addNode('in-scope')}>
                      <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 mr-2" /> Process Step (Green)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => addNode('interface')}>
                      <span className="w-2.5 h-2.5 rounded-sm bg-slate-300 mr-2" /> Interface (White)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => addNode('event')}>
                      <span className="w-2.5 h-2.5 rounded-sm bg-pink-400 mr-2" /> Event (Pink)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => addNode('xor')}>
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-400 mr-2" /> XOR Gateway (Blue)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button size="sm" variant="secondary" className="shadow-md" onClick={autoLayout}>
                  <LayoutGrid className="h-3.5 w-3.5 mr-1" /> Layout
                </Button>
              </Panel>

              <Panel position="bottom-right" className="text-[10px] text-muted-foreground bg-background/80 px-2 py-1 rounded">
                Double-click node to edit label · Click type badge to cycle · Drag handle to connect · Select + Delete to remove · Double-click edge to label
              </Panel>
            </>
          )}
        </ReactFlow>
      </div>
    </div>
  );
}
