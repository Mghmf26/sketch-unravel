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
  MarkerType,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus, LayoutGrid, Save, Undo2, Redo2, History, ChevronRight, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import EditableEPCNode from '@/components/EditableEPCNode';
import NodeDetailPanel from '@/components/NodeDetailPanel';
import { getLayoutedElements } from '@/lib/layout';
import type { EPCNode, EPCConnection, NodeType } from '@/types/epc';
import type { Risk, Control, Regulation, Incident } from '@/lib/api';

interface DiagramCanvasEditorProps {
  nodes: EPCNode[];
  connections: EPCConnection[];
  risks?: Risk[];
  controls?: Control[];
  regulations?: Regulation[];
  incidents?: Incident[];
  processId?: string;
  onChange: (nodes: EPCNode[], connections: EPCConnection[]) => void;
  onDataChanged?: () => void;
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

interface HistoryEntry {
  id: string;
  timestamp: Date;
  description: string;
  nodes: EPCNode[];
  connections: EPCConnection[];
}

function toFlowElements(
  epcNodes: EPCNode[],
  epcConnections: EPCConnection[],
  risks: Risk[],
  controls: Control[],
  regulations: Regulation[],
  incidents: Incident[],
  callbacks: {
    onDelete: (id: string) => void;
    onLabelChange: (id: string, label: string) => void;
    onTypeChange: (id: string, type: NodeType) => void;
    onNodeClick: (id: string) => void;
    onIndicatorClick: (id: string, type: 'risks' | 'controls' | 'regulations' | 'incidents') => void;
  }
) {
  const flowNodes: Node[] = epcNodes.map((n) => {
    const stepRisks = risks.filter(r => r.step_id === n.id);
    const stepRiskIds = new Set(stepRisks.map(r => r.id));
    const stepControls = controls.filter(c => stepRiskIds.has(c.risk_id));
    const stepRegulations = regulations.filter(r => r.step_id === n.id);
    const stepIncidents = incidents.filter(i => i.step_id === n.id);

    return {
      id: n.id,
      type: 'epc',
      position: { x: 0, y: 0 },
      data: {
        label: n.label,
        nodeType: n.type,
        nodeId: n.id,
        description: n.description || '',
        riskCount: stepRisks.length,
        controlCount: stepControls.length,
        regulationCount: stepRegulations.length,
        incidentCount: stepIncidents.length,
        onDelete: callbacks.onDelete,
        onLabelChange: callbacks.onLabelChange,
        onTypeChange: callbacks.onTypeChange,
        onNodeClick: callbacks.onNodeClick,
        onIndicatorClick: callbacks.onIndicatorClick,
      },
    };
  });

  const flowEdges: Edge[] = epcConnections.map((c) => ({
    id: c.id,
    source: c.source,
    target: c.target,
    label: c.label || undefined,
    ...EDGE_STYLE,
  }));

  return getLayoutedElements(flowNodes, flowEdges, 'TB');
}

export default function DiagramCanvasEditor({
  nodes: initialNodes, connections: initialConnections,
  risks = [], controls = [], regulations = [], incidents = [],
  processId, onChange, onDataChanged
}: DiagramCanvasEditorProps) {
  // Local working state (not saved until user clicks Save)
  const [workingNodes, setWorkingNodes] = useState<EPCNode[]>(initialNodes);
  const [workingConns, setWorkingConns] = useState<EPCConnection[]>(initialConnections);
  const workingNodesRef = useRef(workingNodes);
  const workingConnsRef = useRef(workingConns);
  workingNodesRef.current = workingNodes;
  workingConnsRef.current = workingConns;

  // Track if there are unsaved changes
  const [hasChanges, setHasChanges] = useState(false);

  // History for undo/redo
  const [history, setHistory] = useState<HistoryEntry[]>([
    { id: crypto.randomUUID(), timestamp: new Date(), description: 'Initial state', nodes: initialNodes, connections: initialConnections }
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [showLegend, setShowLegend] = useState(false);

  const pushHistory = useCallback((desc: string, nodes: EPCNode[], conns: EPCConnection[]) => {
    setHistory(prev => {
      const truncated = prev.slice(0, historyIndex + 1);
      return [...truncated, { id: crypto.randomUUID(), timestamp: new Date(), description: desc, nodes, connections: conns }];
    });
    setHistoryIndex(prev => prev + 1);
    setHasChanges(true);
  }, [historyIndex]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    const newIdx = historyIndex - 1;
    const entry = history[newIdx];
    setHistoryIndex(newIdx);
    setWorkingNodes(entry.nodes);
    setWorkingConns(entry.connections);
    setHasChanges(newIdx > 0);
  }, [canUndo, historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (!canRedo) return;
    const newIdx = historyIndex + 1;
    const entry = history[newIdx];
    setHistoryIndex(newIdx);
    setWorkingNodes(entry.nodes);
    setWorkingConns(entry.connections);
    setHasChanges(true);
  }, [canRedo, historyIndex, history]);

  const goToHistory = useCallback((idx: number) => {
    const entry = history[idx];
    setHistoryIndex(idx);
    setWorkingNodes(entry.nodes);
    setWorkingConns(entry.connections);
    setHasChanges(idx > 0);
  }, [history]);

  const handleSave = useCallback(() => {
    onChange(workingNodesRef.current, workingConnsRef.current);
    setHasChanges(false);
  }, [onChange]);

  // Detail panel state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState('overview');

  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setDetailTab('overview');
  }, []);

  const handleIndicatorClick = useCallback((nodeId: string, type: 'risks' | 'controls' | 'regulations' | 'incidents') => {
    setSelectedNodeId(nodeId);
    setDetailTab(type);
  }, []);

  const handleDeleteNode = useCallback((nodeId: string) => {
    const updatedNodes = workingNodesRef.current.filter(n => n.id !== nodeId);
    const updatedConns = workingConnsRef.current.filter(c => c.source !== nodeId && c.target !== nodeId);
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
    setWorkingNodes(updatedNodes);
    setWorkingConns(updatedConns);
    pushHistory(`Deleted node`, updatedNodes, updatedConns);
  }, [selectedNodeId, pushHistory]);

  const handleLabelChange = useCallback((nodeId: string, label: string) => {
    const updatedNodes = workingNodesRef.current.map(n => n.id === nodeId ? { ...n, label } : n);
    setWorkingNodes(updatedNodes);
    pushHistory(`Renamed to "${label}"`, updatedNodes, workingConnsRef.current);
  }, [pushHistory]);

  const handleTypeChange = useCallback((nodeId: string, type: NodeType) => {
    const updatedNodes = workingNodesRef.current.map(n => n.id === nodeId ? { ...n, type } : n);
    setWorkingNodes(updatedNodes);
    pushHistory(`Changed type to ${type}`, updatedNodes, workingConnsRef.current);
  }, [pushHistory]);

  const callbacks = useMemo(() => ({
    onDelete: handleDeleteNode,
    onLabelChange: handleLabelChange,
    onTypeChange: handleTypeChange,
    onNodeClick: handleNodeClick,
    onIndicatorClick: handleIndicatorClick,
  }), [handleDeleteNode, handleLabelChange, handleTypeChange, handleNodeClick, handleIndicatorClick]);

  const initial = useMemo(() => toFlowElements(workingNodes, workingConns, risks, controls, regulations, incidents, callbacks), []);
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(initial.nodes);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(initial.edges);

  // Sync working state to flow elements
  const prevWorkingRef = useRef({ nodes: workingNodes, connections: workingConns });
  if (workingNodes !== prevWorkingRef.current.nodes || workingConns !== prevWorkingRef.current.connections) {
    prevWorkingRef.current = { nodes: workingNodes, connections: workingConns };
    const { nodes: ln, edges: le } = toFlowElements(workingNodes, workingConns, risks, controls, regulations, incidents, callbacks);
    const posMap = new Map(flowNodes.map(n => [n.id, n.position]));
    const merged = ln.map(n => ({ ...n, position: posMap.get(n.id) || n.position }));
    setFlowNodes(merged);
    setFlowEdges(le);
  }

  const onConnect = useCallback((connection: Connection) => {
    const newConn: EPCConnection = {
      id: crypto.randomUUID(),
      source: connection.source,
      target: connection.target,
      label: '',
    };
    const updatedConns = [...workingConnsRef.current, newConn];
    setWorkingConns(updatedConns);
    pushHistory('Added connection', workingNodesRef.current, updatedConns);
  }, [pushHistory]);

  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    onEdgesChange(changes);
    const removals = changes.filter(c => c.type === 'remove').map(c => (c as any).id);
    if (removals.length > 0) {
      const updatedConns = workingConnsRef.current.filter(c => !removals.includes(c.id));
      setWorkingConns(updatedConns);
      pushHistory('Removed connection', workingNodesRef.current, updatedConns);
    }
  }, [onEdgesChange, pushHistory]);

  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes);
  }, [onNodesChange]);

  const addNode = useCallback((type: NodeType) => {
    const id = crypto.randomUUID();
    const labels: Record<NodeType, string> = {
      'in-scope': 'New Step', 'interface': 'New Process Interface', 'event': 'New Event', 'xor': 'XOR',
      'start-end': 'Start', 'decision': 'Decision?', 'storage': 'Storage', 'delay': 'Delay', 'document': 'Document',
    };
    const newNode: EPCNode = { id, label: labels[type], type, description: '' };
    const updatedNodes = [...workingNodesRef.current, newNode];
    setWorkingNodes(updatedNodes);
    pushHistory(`Added ${labels[type]}`, updatedNodes, workingConnsRef.current);
  }, [pushHistory]);

  const autoLayout = useCallback(() => {
    const { nodes: ln, edges: le } = toFlowElements(workingNodesRef.current, workingConnsRef.current, risks, controls, regulations, incidents, callbacks);
    setFlowNodes(ln);
    setFlowEdges(le);
  }, [callbacks, setFlowNodes, setFlowEdges, risks, controls, regulations, incidents]);

  const onEdgeDoubleClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    const newLabel = prompt('Connection label (e.g. Yes, No, or leave empty):', (edge.label as string) || '');
    if (newLabel === null) return;
    const updatedConns = workingConnsRef.current.map(c =>
      c.id === edge.id ? { ...c, label: newLabel || undefined } : c
    );
    setWorkingConns(updatedConns);
    pushHistory('Changed connection label', workingNodesRef.current, updatedConns);
  }, [pushHistory]);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const selectedNode = selectedNodeId ? workingNodes.find(n => n.id === selectedNodeId) : null;

  return (
    <div className="flex h-[75vh] rounded-lg border bg-background overflow-hidden">
      <div className="flex-1 relative">
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onEdgeDoubleClick={onEdgeDoubleClick}
          onPaneClick={onPaneClick}
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

          {/* Top-left: Legend */}
          <Panel position="top-left">
            <div className="relative">
              <Button
                size="sm"
                variant={showLegend ? "default" : "secondary"}
                className="shadow-md"
                onClick={() => setShowLegend(v => !v)}
              >
                <Info className="h-3.5 w-3.5 mr-1" /> Legend
              </Button>
              {showLegend && (
                <div className="absolute top-10 left-0 w-56 bg-background border rounded-lg shadow-xl z-50 p-3 space-y-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Node Types</p>
                  {[
                    { color: 'bg-emerald-500', shape: 'rounded-sm', label: 'Step', desc: 'Process activity' },
                    { color: 'bg-slate-400', shape: 'rounded-sm', label: 'Process Interface', desc: 'External process' },
                    { color: 'bg-pink-500', shape: 'rounded-sm', label: 'Event', desc: 'Trigger or outcome' },
                    { color: 'bg-blue-500', shape: 'rounded-full', label: 'XOR Gateway', desc: 'Exclusive branch' },
                    { color: 'bg-green-500', shape: 'rounded-full', label: 'Start / End', desc: 'Flow boundary' },
                    { color: 'bg-orange-500', shape: 'rotate-45', label: 'Decision', desc: 'Yes/No branch' },
                    { color: 'bg-yellow-500', shape: 'rounded-sm', label: 'Storage', desc: 'Data store' },
                    { color: 'bg-red-500', shape: 'rounded-r-full', label: 'Delay / Wait', desc: 'Wait period' },
                    { color: 'bg-violet-500', shape: 'rounded-sm', label: 'Document', desc: 'Document artifact' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-2.5">
                      <span className={`w-3 h-3 shrink-0 ${item.color} ${item.shape}`} />
                      <div className="min-w-0">
                        <span className="text-xs font-medium text-foreground">{item.label}</span>
                        <span className="text-[10px] text-muted-foreground ml-1.5">{item.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Panel>

          {/* Top-right: Add Node + Layout + Save + Undo/Redo + History */}
          <Panel position="top-right" className="flex gap-2 items-center">
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" disabled={!canUndo} onClick={handleUndo} title="Undo">
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" disabled={!canRedo} onClick={handleRedo} title="Redo">
              <Redo2 className="h-4 w-4" />
            </Button>
            <Button size="sm" variant={showHistory ? "default" : "ghost"} className="h-8 w-8 p-0" onClick={() => setShowHistory(v => !v)} title="Change history">
              <History className="h-4 w-4" />
            </Button>

            <div className="w-px h-5 bg-border mx-1" />

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

            <Button size="sm" variant={hasChanges ? "default" : "secondary"} className="shadow-md" onClick={handleSave} disabled={!hasChanges}>
              <Save className="h-3.5 w-3.5 mr-1" /> Save
            </Button>
          </Panel>

          <Panel position="bottom-right" className="text-[10px] text-muted-foreground bg-background/80 px-2 py-1 rounded">
            Click node to inspect · Double-click label to edit · Click type badge to cycle · Drag handle to connect · Delete key to remove
          </Panel>
        </ReactFlow>

        {/* Collapsible history panel */}
        {showHistory && (
          <div className="absolute top-12 right-2 w-64 bg-background border rounded-lg shadow-xl z-50 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
              <span className="text-xs font-semibold flex items-center gap-1.5">
                <History className="h-3.5 w-3.5" /> Change History
              </span>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setShowHistory(false)}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
            <ScrollArea className="max-h-[300px]">
              <div className="p-1">
                {history.map((entry, idx) => (
                  <button
                    key={entry.id}
                    onClick={() => goToHistory(idx)}
                    className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors ${
                      idx === historyIndex
                        ? 'bg-primary/10 text-primary font-medium'
                        : idx > historyIndex
                        ? 'text-muted-foreground/50 hover:bg-muted/50'
                        : 'text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${idx === historyIndex ? 'bg-primary' : idx > historyIndex ? 'bg-muted-foreground/30' : 'bg-muted-foreground/60'}`} />
                      <span className="truncate">{entry.description}</span>
                    </div>
                    <span className="text-[9px] text-muted-foreground ml-3.5">
                      {entry.timestamp.toLocaleTimeString()}
                    </span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Right detail panel */}
      {selectedNode && (
        <NodeDetailPanel
          node={selectedNode}
          risks={risks}
          controls={controls}
          regulations={regulations}
          incidents={incidents}
          processId={processId}
          defaultTab={detailTab}
          onClose={() => setSelectedNodeId(null)}
          onDataChanged={onDataChanged}
        />
      )}
    </div>
  );
}
