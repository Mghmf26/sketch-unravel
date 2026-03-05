import { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap, Panel,
  type Node, type Edge, type Connection,
  useNodesState, useEdgesState, MarkerType,
  type EdgeChange, type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus, LayoutGrid, Save, Undo2, Redo2, History, ChevronRight, Info, Database, X, Upload, File, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getLayoutedElements } from '@/lib/layout';
import {
  fetchMainframeFlows, fetchMFFlowNodes, fetchMFFlowConnections,
  upsertMainframeFlow, saveMFFlowDiagram,
  MF_NODE_TYPE_META, MF_CONNECTION_TYPES,
  type MainframeFlow, type MFFlowNode, type MFFlowConnection, type MFNodeType,
} from '@/lib/api-mainframe-flows';
import { fetchSteps, fetchMainframeImports, type ProcessStep, type MainframeImport } from '@/lib/api';
import MFCustomNode from '@/components/MFCustomNode';

const nodeTypes = { mf: MFCustomNode };

const EDGE_STYLE = {
  type: 'smoothstep' as const,
  animated: false,
  style: { stroke: '#6366f1', strokeWidth: 2.5 },
  markerEnd: { type: MarkerType.ArrowClosed, color: '#4f46e5', width: 18, height: 18 },
  labelStyle: { fontSize: 11, fontWeight: 700, fill: '#334155', letterSpacing: '0.02em' },
  labelBgStyle: { fill: '#f8fafc', stroke: '#e2e8f0', strokeWidth: 1, rx: 6, ry: 6 },
  labelBgPadding: [8, 5] as [number, number],
};

interface WorkingNode {
  id: string; label: string; nodeType: MFNodeType; description: string;
}
interface WorkingConn {
  id: string; source: string; target: string; label?: string; connectionType?: string;
}

interface HistoryEntry {
  id: string; timestamp: Date; description: string;
  nodes: WorkingNode[]; connections: WorkingConn[];
}

function toFlowElements(
  nodes: WorkingNode[], conns: WorkingConn[],
  callbacks: { onDelete: (id: string) => void; onLabelChange: (id: string, l: string) => void; onAttachDataSource: (id: string) => void; },
  dataSourceCounts: Record<string, number>,
) {
  const flowNodes: Node[] = nodes.map(n => ({
    id: n.id, type: 'mf', position: { x: 0, y: 0 },
    data: {
      label: n.label, nodeType: n.nodeType, nodeId: n.id, description: n.description,
      dataSourceCount: dataSourceCounts[n.id] || 0,
      onDelete: callbacks.onDelete, onLabelChange: callbacks.onLabelChange,
      onAttachDataSource: callbacks.onAttachDataSource,
    },
  }));
  const flowEdges: Edge[] = conns.map(c => ({
    id: c.id, source: c.source, target: c.target,
    label: c.label ? `${c.label}${c.connectionType ? ` [${c.connectionType}]` : ''}` : (c.connectionType || undefined),
    ...EDGE_STYLE,
  }));
  return getLayoutedElements(flowNodes, flowEdges, 'TB');
}

interface Props {
  processId: string;
  initialStepId?: string;
  initialFlowId?: string;
}

export default function MainframeFlowEditor({ processId, initialStepId, initialFlowId }: Props) {
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [flows, setFlows] = useState<MainframeFlow[]>([]);
  const [selectedStepId, setSelectedStepId] = useState<string>(initialStepId || '');
  const [selectedFlowId, setSelectedFlowId] = useState<string>(initialFlowId || '');
  const [loading, setLoading] = useState(true);

  // Data sources for the current flow
  const [dataSources, setDataSources] = useState<MainframeImport[]>([]);
  const [attachNodeId, setAttachNodeId] = useState<string | null>(null);
  const [dataSourceCounts, setDataSourceCounts] = useState<Record<string, number>>({});

  const [workingNodes, setWorkingNodes] = useState<WorkingNode[]>([]);
  const [workingConns, setWorkingConns] = useState<WorkingConn[]>([]);
  const workingNodesRef = useRef(workingNodes);
  const workingConnsRef = useRef(workingConns);
  workingNodesRef.current = workingNodes;
  workingConnsRef.current = workingConns;

  const [hasChanges, setHasChanges] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showHistory, setShowHistory] = useState(false);
  const [showLegend, setShowLegend] = useState(false);

  // Load data sources for current flow
  const loadDataSources = useCallback(async () => {
    if (!selectedFlowId) { setDataSources([]); setDataSourceCounts({}); return; }
    const allImports = await fetchMainframeImports();
    const flowDs = allImports.filter(ds => ds.flow_id === selectedFlowId);
    setDataSources(flowDs);
    const counts: Record<string, number> = {};
    flowDs.forEach(ds => {
      if (ds.flow_node_id) counts[ds.flow_node_id] = (counts[ds.flow_node_id] || 0) + 1;
    });
    setDataSourceCounts(counts);
  }, [selectedFlowId]);

  // Load steps and flows
  useEffect(() => {
    (async () => {
      setLoading(true);
      const [s, f] = await Promise.all([fetchSteps(processId), fetchMainframeFlows(processId)]);
      const inScope = s.filter(st => st.type === 'in-scope');
      setSteps(inScope);
      setFlows(f);

      if (initialStepId) {
        setSelectedStepId(initialStepId);
        const stepFlows = f.filter(fl => fl.step_id === initialStepId);
        if (initialFlowId && stepFlows.some(fl => fl.id === initialFlowId)) {
          setSelectedFlowId(initialFlowId);
        } else if (stepFlows.length > 0) {
          setSelectedFlowId(stepFlows[0].id);
        }
      } else if (inScope.length > 0) {
        setSelectedStepId(inScope[0].id);
        const stepFlows = f.filter(fl => fl.step_id === inScope[0].id);
        if (stepFlows.length > 0) setSelectedFlowId(stepFlows[0].id);
      }
      setLoading(false);
    })();
  }, [processId]);

  // Load flow diagram when selectedFlowId changes
  useEffect(() => {
    if (!selectedFlowId) {
      setWorkingNodes([]); setWorkingConns([]);
      setHistory([{ id: crypto.randomUUID(), timestamp: new Date(), description: 'Empty', nodes: [], connections: [] }]);
      setHistoryIndex(0);
      return;
    }
    (async () => {
      const [nodes, conns] = await Promise.all([fetchMFFlowNodes(selectedFlowId), fetchMFFlowConnections(selectedFlowId)]);
      const wn: WorkingNode[] = nodes.map(n => ({ id: n.id, label: n.label, nodeType: n.node_type as MFNodeType, description: n.description || '' }));
      const wc: WorkingConn[] = conns.map(c => ({ id: c.id, source: c.source_node_id, target: c.target_node_id, label: c.label || undefined, connectionType: c.connection_type }));
      setWorkingNodes(wn); setWorkingConns(wc);
      setHistory([{ id: crypto.randomUUID(), timestamp: new Date(), description: 'Loaded', nodes: wn, connections: wc }]);
      setHistoryIndex(0);
      setHasChanges(false);
      loadDataSources();
    })();
  }, [selectedFlowId, loadDataSources]);

  const pushHistory = useCallback((desc: string, nodes: WorkingNode[], conns: WorkingConn[]) => {
    setHistory(prev => {
      const truncated = prev.slice(0, historyIndex + 1);
      return [...truncated, { id: crypto.randomUUID(), timestamp: new Date(), description: desc, nodes, connections: conns }];
    });
    setHistoryIndex(prev => prev + 1);
    setHasChanges(true);
  }, [historyIndex]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  const handleUndo = useCallback(() => { if (!canUndo) return; const i = historyIndex - 1; const e = history[i]; setHistoryIndex(i); setWorkingNodes(e.nodes); setWorkingConns(e.connections); setHasChanges(i > 0); }, [canUndo, historyIndex, history]);
  const handleRedo = useCallback(() => { if (!canRedo) return; const i = historyIndex + 1; const e = history[i]; setHistoryIndex(i); setWorkingNodes(e.nodes); setWorkingConns(e.connections); setHasChanges(true); }, [canRedo, historyIndex, history]);
  const goToHistory = useCallback((idx: number) => { const e = history[idx]; setHistoryIndex(idx); setWorkingNodes(e.nodes); setWorkingConns(e.connections); setHasChanges(idx > 0); }, [history]);

  const handleSave = useCallback(async () => {
    if (!selectedFlowId) return;
    try {
      toast({ title: 'Saving...' });
      await saveMFFlowDiagram(
        selectedFlowId,
        workingNodesRef.current.map(n => ({ id: n.id, label: n.label, node_type: n.nodeType, description: n.description })),
        workingConnsRef.current.map(c => ({ id: c.id, source: c.source, target: c.target, label: c.label, connectionType: c.connectionType })),
      );
      setHasChanges(false);
      toast({ title: 'Mainframe Flow saved' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Save failed', variant: 'destructive' });
    }
  }, [selectedFlowId]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    const un = workingNodesRef.current.filter(n => n.id !== nodeId);
    const uc = workingConnsRef.current.filter(c => c.source !== nodeId && c.target !== nodeId);
    setWorkingNodes(un); setWorkingConns(uc);
    pushHistory('Deleted node', un, uc);
  }, [pushHistory]);

  const handleLabelChange = useCallback((nodeId: string, label: string) => {
    const un = workingNodesRef.current.map(n => n.id === nodeId ? { ...n, label } : n);
    setWorkingNodes(un);
    pushHistory(`Renamed to "${label}"`, un, workingConnsRef.current);
  }, [pushHistory]);

  const handleAttachDataSource = useCallback((nodeId: string) => {
    setAttachNodeId(nodeId);
  }, []);

  const callbacks = useMemo(() => ({
    onDelete: handleDeleteNode,
    onLabelChange: handleLabelChange,
    onAttachDataSource: handleAttachDataSource,
  }), [handleDeleteNode, handleLabelChange, handleAttachDataSource]);

  const initial = useMemo(() => toFlowElements(workingNodes, workingConns, callbacks, dataSourceCounts), []);
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(initial.nodes);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(initial.edges);

  const prevRef = useRef({ nodes: workingNodes, connections: workingConns, counts: dataSourceCounts });
  if (workingNodes !== prevRef.current.nodes || workingConns !== prevRef.current.connections || dataSourceCounts !== prevRef.current.counts) {
    prevRef.current = { nodes: workingNodes, connections: workingConns, counts: dataSourceCounts };
    const { nodes: ln, edges: le } = toFlowElements(workingNodes, workingConns, callbacks, dataSourceCounts);
    const posMap = new Map(flowNodes.map(n => [n.id, n.position]));
    const merged = ln.map(n => ({ ...n, position: posMap.get(n.id) || n.position }));
    setFlowNodes(merged); setFlowEdges(le);
  }

  const onConnect = useCallback((connection: Connection) => {
    const nc: WorkingConn = { id: crypto.randomUUID(), source: connection.source, target: connection.target, label: '', connectionType: 'call' };
    const uc = [...workingConnsRef.current, nc];
    setWorkingConns(uc);
    pushHistory('Added connection', workingNodesRef.current, uc);
  }, [pushHistory]);

  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    onEdgesChange(changes);
    const removals = changes.filter(c => c.type === 'remove').map(c => (c as any).id);
    if (removals.length > 0) {
      const uc = workingConnsRef.current.filter(c => !removals.includes(c.id));
      setWorkingConns(uc); pushHistory('Removed connection', workingNodesRef.current, uc);
    }
  }, [onEdgesChange, pushHistory]);

  const addNode = useCallback((type: MFNodeType) => {
    const meta = MF_NODE_TYPE_META[type];
    const nn: WorkingNode = { id: crypto.randomUUID(), label: meta.label, nodeType: type, description: '' };
    const un = [...workingNodesRef.current, nn];
    setWorkingNodes(un); pushHistory(`Added ${meta.label}`, un, workingConnsRef.current);
  }, [pushHistory]);

  const autoLayout = useCallback(() => {
    const { nodes: ln, edges: le } = toFlowElements(workingNodesRef.current, workingConnsRef.current, callbacks, dataSourceCounts);
    setFlowNodes(ln); setFlowEdges(le);
  }, [callbacks, setFlowNodes, setFlowEdges, dataSourceCounts]);

  const onEdgeDoubleClick = useCallback((_e: React.MouseEvent, edge: Edge) => {
    const newLabel = prompt('Connection label:', (edge.label as string) || '');
    if (newLabel === null) return;
    const uc = workingConnsRef.current.map(c => c.id === edge.id ? { ...c, label: newLabel || undefined } : c);
    setWorkingConns(uc); pushHistory('Changed label', workingNodesRef.current, uc);
  }, [pushHistory]);

  const handleCreateFlow = async () => {
    if (!selectedStepId) return;
    try {
      const flow = await upsertMainframeFlow({ process_id: processId, step_id: selectedStepId });
      const updated = await fetchMainframeFlows(processId);
      setFlows(updated);
      setSelectedFlowId(flow.id);
      toast({ title: 'Mainframe Flow created' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Failed to create flow', variant: 'destructive' });
    }
  };

  const stepFlows = flows.filter(f => f.step_id === selectedStepId);

  if (loading) return <div className="p-8 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      {/* Step and Flow selectors */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Step</label>
          <Select value={selectedStepId} onValueChange={v => { setSelectedStepId(v); const sf = flows.filter(f => f.step_id === v); setSelectedFlowId(sf.length > 0 ? sf[0].id : ''); }}>
            <SelectTrigger className="w-[280px]"><SelectValue placeholder="Select a step" /></SelectTrigger>
            <SelectContent>{steps.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Mainframe Flow</label>
          <div className="flex gap-2">
            <Select value={selectedFlowId} onValueChange={setSelectedFlowId}>
              <SelectTrigger className="w-[250px]"><SelectValue placeholder={stepFlows.length === 0 ? 'No flows yet' : 'Select flow'} /></SelectTrigger>
              <SelectContent>{stepFlows.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={handleCreateFlow} disabled={!selectedStepId}>
              <Plus className="h-3.5 w-3.5 mr-1" /> New Flow
            </Button>
          </div>
        </div>
        {selectedFlowId && (
          <div className="ml-auto flex items-center gap-2">
            <Database className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-medium text-muted-foreground">{dataSources.length} data source(s)</span>
          </div>
        )}
      </div>

      {!selectedFlowId ? (
        <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground gap-3">
          <p className="text-sm">Select a step and create or choose a Mainframe Flow to start diagramming.</p>
        </div>
      ) : (
        <div className="flex h-[70vh] rounded-lg border bg-background overflow-hidden">
          <div className="flex-1 relative">
            <ReactFlow
              nodes={flowNodes} edges={flowEdges}
              onNodesChange={onNodesChange} onEdgesChange={handleEdgesChange}
              onConnect={onConnect} onEdgeDoubleClick={onEdgeDoubleClick}
              nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.15 }}
              deleteKeyCode="Delete" attributionPosition="bottom-left"
              connectionLineStyle={{ stroke: '#6366f1', strokeWidth: 2.5 }}
              defaultEdgeOptions={EDGE_STYLE}
              snapToGrid snapGrid={[15, 15]}
              style={{ background: '#f8fafc' }}
            >
              <Background gap={20} size={1} color="#e2e8f0" />
              <Controls className="!bg-white !border-border !shadow-lg !rounded-lg" />
              <MiniMap nodeStrokeWidth={2} pannable zoomable
                style={{ border: '1px solid #e2e8f0', borderRadius: 8 }}
                nodeColor={(n: any) => MF_NODE_TYPE_META[n.data?.nodeType as MFNodeType]?.color || '#94a3b8'}
              />

              {/* Legend */}
              <Panel position="top-left">
                <div className="relative">
                  <Button size="sm" variant={showLegend ? "default" : "secondary"} className="shadow-md" onClick={() => setShowLegend(v => !v)}>
                    <Info className="h-3.5 w-3.5 mr-1" /> Legend
                  </Button>
                  {showLegend && (
                    <div className="absolute top-10 left-0 w-64 bg-background border rounded-lg shadow-xl z-50 p-3 space-y-1.5 max-h-[400px] overflow-y-auto">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">MF Node Types</p>
                      {Object.entries(MF_NODE_TYPE_META).map(([key, meta]) => (
                        <div key={key} className="flex items-center gap-2.5">
                          <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: meta.color }} />
                          <span className="text-xs font-medium text-foreground">{meta.label}</span>
                        </div>
                      ))}
                      <div className="border-t pt-2 mt-2">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Connection Types</p>
                        {MF_CONNECTION_TYPES.map(ct => (
                          <div key={ct.value} className="text-xs text-muted-foreground">{ct.label}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Panel>

              {/* Toolbar */}
              <Panel position="top-right" className="flex gap-2 items-center">
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" disabled={!canUndo} onClick={handleUndo} title="Undo"><Undo2 className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" disabled={!canRedo} onClick={handleRedo} title="Redo"><Redo2 className="h-4 w-4" /></Button>
                <Button size="sm" variant={showHistory ? "default" : "ghost"} className="h-8 w-8 p-0" onClick={() => setShowHistory(v => !v)} title="History"><History className="h-4 w-4" /></Button>

                <div className="w-px h-5 bg-border mx-1" />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="secondary" className="shadow-md"><Plus className="h-3.5 w-3.5 mr-1" /> Add Node</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 max-h-[400px] overflow-y-auto">
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-wider">Infrastructure</DropdownMenuLabel>
                    {(['mainframe', 'operating-system', 'subsystem'] as MFNodeType[]).map(t => (
                      <DropdownMenuItem key={t} onClick={() => addNode(t)}>
                        <span className="w-2.5 h-2.5 rounded-sm mr-2" style={{ backgroundColor: MF_NODE_TYPE_META[t].color }} />{MF_NODE_TYPE_META[t].label}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-wider">Processing</DropdownMenuLabel>
                    {(['program', 'batch-job', 'transaction'] as MFNodeType[]).map(t => (
                      <DropdownMenuItem key={t} onClick={() => addNode(t)}>
                        <span className="w-2.5 h-2.5 rounded-sm mr-2" style={{ backgroundColor: MF_NODE_TYPE_META[t].color }} />{MF_NODE_TYPE_META[t].label}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-wider">Data & Messaging</DropdownMenuLabel>
                    {(['database', 'dataset', 'message-queue'] as MFNodeType[]).map(t => (
                      <DropdownMenuItem key={t} onClick={() => addNode(t)}>
                        <span className="w-2.5 h-2.5 rounded-sm mr-2" style={{ backgroundColor: MF_NODE_TYPE_META[t].color }} />{MF_NODE_TYPE_META[t].label}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-wider">Integration & Security</DropdownMenuLabel>
                    {(['middleware', 'api', 'external-system', 'security', 'monitoring'] as MFNodeType[]).map(t => (
                      <DropdownMenuItem key={t} onClick={() => addNode(t)}>
                        <span className="w-2.5 h-2.5 rounded-sm mr-2" style={{ backgroundColor: MF_NODE_TYPE_META[t].color }} />{MF_NODE_TYPE_META[t].label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button size="sm" variant="secondary" className="shadow-md" onClick={autoLayout} title="Auto-layout"><LayoutGrid className="h-3.5 w-3.5 mr-1" /> Layout</Button>
                <Button size="sm" variant={hasChanges ? "default" : "secondary"} className="shadow-md" onClick={handleSave} disabled={!hasChanges}><Save className="h-3.5 w-3.5 mr-1" /> Save</Button>
              </Panel>

              <Panel position="bottom-right" className="text-[10px] text-muted-foreground bg-background/80 px-2 py-1 rounded">
                Double-click label to edit · Drag handle to connect · Delete key to remove · Hover node for data source
              </Panel>
            </ReactFlow>

            {showHistory && (
              <div className="absolute top-12 right-2 w-64 bg-background border rounded-lg shadow-xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
                  <span className="text-xs font-semibold flex items-center gap-1.5"><History className="h-3.5 w-3.5" /> Change History</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setShowHistory(false)}><ChevronRight className="h-3.5 w-3.5" /></Button>
                </div>
                <ScrollArea className="max-h-[300px]">
                  <div className="p-1">
                    {history.map((entry, idx) => (
                      <button key={entry.id} onClick={() => goToHistory(idx)}
                        className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors ${idx === historyIndex ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-muted/50'}`}>
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${idx === historyIndex ? 'bg-primary' : 'bg-muted-foreground/60'}`} />
                          <span className="truncate">{entry.description}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Attach Data Source Dialog */}
      {attachNodeId && selectedFlowId && (
        <AttachDataSourceDialog
          processId={processId}
          stepId={selectedStepId}
          flowId={selectedFlowId}
          nodeId={attachNodeId}
          nodeName={workingNodes.find(n => n.id === attachNodeId)?.label || 'Node'}
          nodeType={workingNodes.find(n => n.id === attachNodeId)?.nodeType || 'program'}
          existingSources={dataSources.filter(ds => ds.flow_node_id === attachNodeId)}
          onClose={() => setAttachNodeId(null)}
          onRefresh={loadDataSources}
        />
      )}
    </div>
  );
}

interface AttachDialogProps {
  processId: string;
  stepId: string;
  flowId: string;
  nodeId: string;
  nodeName: string;
  nodeType: MFNodeType;
  existingSources: MainframeImport[];
  onClose: () => void;
  onRefresh: () => void;
}

function AttachDataSourceDialog({ processId, stepId, flowId, nodeId, nodeName, nodeType, existingSources, onClose, onRefresh }: AttachDialogProps) {
  const [sourceName, setSourceName] = useState('');
  const [sourceType, setSourceType] = useState('DB2');
  const [datasetName, setDatasetName] = useState('');
  const [desc, setDesc] = useState('');
  const [recordCount, setRecordCount] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const meta = MF_NODE_TYPE_META[nodeType];

  const add = async () => {
    if (!sourceName.trim()) { toast({ title: 'Provide a source name', variant: 'destructive' }); return; }

    let fileUrl: string | null = null;
    if (file) {
      setUploading(true);
      const ext = file.name.split('.').pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('import-files').upload(path, file);
      if (uploadErr) { toast({ title: 'File upload failed', description: uploadErr.message, variant: 'destructive' }); setUploading(false); return; }
      const { data: urlData } = supabase.storage.from('import-files').getPublicUrl(path);
      fileUrl = urlData.publicUrl;
      setUploading(false);
    }

    const { error } = await supabase.from('mainframe_imports').insert({
      process_id: processId,
      step_id: stepId || null,
      flow_id: flowId,
      flow_node_id: nodeId,
      source_name: sourceName.trim(),
      source_type: sourceType,
      dataset_name: datasetName || null,
      description: desc || null,
      record_count: recordCount,
      status: 'active',
      file_url: fileUrl,
    } as any).select().single();

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Data source attached' });
    setSourceName(''); setDatasetName(''); setDesc(''); setRecordCount(0); setFile(null);
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('mainframe_imports').delete().eq('id', id);
    toast({ title: 'Data source removed' });
    onRefresh();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-4 w-4 text-blue-600" />
            Data Sources for "{nodeName}"
          </DialogTitle>
          <DialogDescription>
            <span className="inline-flex items-center gap-1.5">
              Attach MF data sources to this
              <span className="font-semibold px-1.5 py-0.5 rounded text-[10px]" style={{ color: meta?.color, backgroundColor: meta?.badgeBg }}>{meta?.label}</span>
              node
            </span>
          </DialogDescription>
        </DialogHeader>

        {/* Existing data sources */}
        {existingSources.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Attached ({existingSources.length})</p>
            {existingSources.map(ds => (
              <div key={ds.id} className="flex items-center justify-between p-2 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <Database className="h-3.5 w-3.5 text-blue-600" />
                  <div>
                    <p className="text-xs font-medium">{ds.source_name}</p>
                    <p className="text-[10px] text-muted-foreground">{ds.source_type}{ds.dataset_name ? ` · ${ds.dataset_name}` : ''}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-destructive" onClick={() => handleDelete(ds.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add new */}
        <div className="space-y-3 border-t pt-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Add New Data Source</p>
          <Input placeholder="Source name (e.g. DB2 Customer Master)" value={sourceName} onChange={e => setSourceName(e.target.value)} />
          <div className="flex gap-2">
            <Select value={sourceType} onValueChange={setSourceType}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DB2">DB2</SelectItem>
                <SelectItem value="VSAM">VSAM</SelectItem>
                <SelectItem value="IMS">IMS</SelectItem>
                <SelectItem value="MQ">MQ</SelectItem>
                <SelectItem value="CICS">CICS</SelectItem>
                <SelectItem value="Log">Log</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Dataset name" value={datasetName} onChange={e => setDatasetName(e.target.value)} className="flex-1" />
          </div>
          <Textarea placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} rows={2} />
          <Input type="number" placeholder="Record count" value={recordCount} onChange={e => setRecordCount(Number(e.target.value))} />

          <div className="border border-dashed border-primary/40 rounded-lg p-3">
            <input ref={fileRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.json,.xml,.jcl,.cbl,.cpy" onChange={e => setFile(e.target.files?.[0] || null)} />
            {file ? (
              <div className="flex items-center gap-2">
                <File className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium flex-1 truncate">{file.name}</span>
                <Button variant="ghost" size="sm" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ''; }}><X className="h-3 w-3" /></Button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()} className="w-full flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                <Upload className="h-4 w-4" />
                <span className="text-[10px] font-medium">Upload file</span>
              </button>
            )}
          </div>

          <Button onClick={add} disabled={uploading || !sourceName.trim()} className="w-full">
            {uploading ? 'Uploading...' : 'Attach Data Source'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
