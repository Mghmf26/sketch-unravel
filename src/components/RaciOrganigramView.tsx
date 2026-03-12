import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap, Panel,
  useNodesState, useEdgesState, addEdge,
  type Node, type Edge, type Connection, type NodeTypes,
  Handle, Position, MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import {
  LayoutGrid, Save, Undo2, Link2, Unlink, ZoomIn,
  Users, Building2, Briefcase, Crown, ChevronRight, Pencil,
} from 'lucide-react';
import type { ProcessRaci } from '@/lib/api-raci';
import type { ProcessStep } from '@/lib/api';
import EditRaciDialog from '@/components/EditRaciDialog';

interface OrganigramProps {
  raciEntries: ProcessRaci[];
  steps: ProcessStep[];
  processId: string;
  onUpdateRaci?: (id: string, field: string, value: any) => Promise<void>;
  onRefresh?: () => void;
}

// ── Custom Org Node ──
function OrgNode({ data }: { data: any }) {
  const isManager = data.managerStatus === 'yes';
  const seniorityColors: Record<string, string> = {
    'Senior': 'border-l-amber-500',
    'Lead': 'border-l-blue-500',
    'Mid-Senior': 'border-l-emerald-500',
    'Junior': 'border-l-slate-400',
  };
  const borderColor = seniorityColors[data.seniority] || 'border-l-primary';

  return (
    <div className={`bg-background border-2 border-border rounded-xl shadow-lg min-w-[220px] max-w-[280px] overflow-hidden border-l-4 ${borderColor} transition-shadow hover:shadow-xl cursor-pointer`}
      onDoubleClick={() => data.onEdit?.(data.raciId)}>
      <Handle type="target" position={Position.Top} className="!bg-primary !w-3 !h-3 !border-2 !border-background" />

      {/* Header */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-start gap-2">
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
            isManager ? 'bg-amber-100 text-amber-700' : 'bg-primary/10 text-primary'
          }`}>
            {isManager ? <Crown className="h-4 w-4" /> : <Users className="h-4 w-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold leading-tight truncate" title={data.roleName}>
              {data.roleName}
            </p>
            {data.jobTitle && (
              <p className="text-[10px] text-muted-foreground truncate" title={data.jobTitle}>
                {data.jobTitle}
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 opacity-50 hover:opacity-100"
            onClick={(e) => { e.stopPropagation(); data.onEdit?.(data.raciId); }}
            title="Edit role">
            <Pencil className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Details */}
      <div className="px-3 pb-2 space-y-1">
        {data.department && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Building2 className="h-3 w-3 shrink-0" />
            <span className="truncate">{data.department}{data.subFunction ? ` / ${data.subFunction}` : ''}</span>
          </div>
        )}
        {data.seniority && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Briefcase className="h-3 w-3 shrink-0" />
            <span>{data.seniority}{data.grade ? ` • ${data.grade}` : ''}{data.fte ? ` • ${data.fte} FTE` : ''}</span>
          </div>
        )}
      </div>

      {/* RACI Tags */}
      <div className="px-3 pb-2.5 flex gap-1 flex-wrap">
        {data.responsible && <Badge className="border-0 bg-emerald-100 text-emerald-700 text-[8px] px-1.5 py-0">R</Badge>}
        {data.accountable && <Badge className="border-0 bg-blue-100 text-blue-700 text-[8px] px-1.5 py-0">A</Badge>}
        {data.consulted && <Badge className="border-0 bg-amber-100 text-amber-700 text-[8px] px-1.5 py-0">C</Badge>}
        {data.informed && <Badge className="border-0 bg-purple-100 text-purple-700 text-[8px] px-1.5 py-0">I</Badge>}
        {data.spanOfControl > 0 && (
          <Badge variant="outline" className="text-[8px] px-1.5 py-0 ml-auto">
            {data.spanOfControl} reports
          </Badge>
        )}
      </div>

      {/* Linked Steps Count */}
      {data.linkedStepCount > 0 && (
        <div className="bg-muted/40 border-t px-3 py-1.5 flex items-center gap-1 text-[9px] text-muted-foreground">
          <Link2 className="h-2.5 w-2.5" />
          <span>{data.linkedStepCount} linked step{data.linkedStepCount > 1 ? 's' : ''}</span>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-primary !w-3 !h-3 !border-2 !border-background" />
    </div>
  );
}

const nodeTypes: NodeTypes = { orgNode: OrgNode };

// ── Auto-layout ──
function getLayoutedElements(nodes: Node[], edges: Edge[], direction = 'TB') {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 60, ranksep: 100, marginx: 40, marginy: 40 });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: 260, height: 160 });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = g.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 130,
        y: nodeWithPosition.y - 80,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

// ── Build hierarchy ──
function buildOrgHierarchy(
  raciEntries: ProcessRaci[],
  linkedStepCounts: Map<string, number>,
): { nodes: Node[]; edges: Edge[] } {
  // Determine hierarchy: managers at top, sorted by seniority
  const seniorityRank: Record<string, number> = {
    'Senior': 1,
    'Lead': 2,
    'Mid-Senior': 3,
    'Junior': 4,
  };

  const sorted = [...raciEntries].sort((a, b) => {
    const aManager = a.manager_status === 'yes' ? 0 : 1;
    const bManager = b.manager_status === 'yes' ? 0 : 1;
    if (aManager !== bManager) return aManager - bManager;
    const aRank = seniorityRank[a.seniority || ''] || 5;
    const bRank = seniorityRank[b.seniority || ''] || 5;
    return aRank - bRank;
  });

  const nodes: Node[] = sorted.map((raci) => ({
    id: raci.id,
    type: 'orgNode',
    position: { x: 0, y: 0 },
    data: {
      roleName: raci.role_name,
      jobTitle: raci.job_title,
      department: raci.function_dept,
      subFunction: raci.sub_function,
      seniority: raci.seniority,
      grade: raci.grade,
      fte: raci.fte,
      managerStatus: raci.manager_status,
      spanOfControl: raci.span_of_control,
      responsible: raci.responsible,
      accountable: raci.accountable,
      consulted: raci.consulted,
      informed: raci.informed,
      linkedStepCount: linkedStepCounts.get(raci.id) || 0,
      raciId: raci.id,
    },
  }));

  // Auto-derive hierarchy: managers → non-managers in same dept, or top-seniority → rest
  const edges: Edge[] = [];
  const managers = sorted.filter(r => r.manager_status === 'yes');
  const nonManagers = sorted.filter(r => r.manager_status !== 'yes');

  for (const nm of nonManagers) {
    // Find a manager in the same department
    const deptManager = managers.find(m => m.function_dept && nm.function_dept && m.function_dept === nm.function_dept);
    // Or find any manager with higher seniority
    const fallbackManager = managers.length > 0 ? managers[0] : null;
    const parent = deptManager || fallbackManager;

    if (parent && parent.id !== nm.id) {
      edges.push({
        id: `e-${parent.id}-${nm.id}`,
        source: parent.id,
        target: nm.id,
        type: 'smoothstep',
        animated: false,
        style: { stroke: 'hsl(var(--border))', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--border))' },
      });
    }
  }

  return { nodes, edges };
}

// ── Link Dialog ──
function LinkNodesDialog({
  open,
  onClose,
  sourceNode,
  targetOptions,
  onLink,
}: {
  open: boolean;
  onClose: () => void;
  sourceNode: string;
  targetOptions: { id: string; label: string }[];
  onLink: (targetId: string) => void;
}) {
  const [selected, setSelected] = useState('');
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Reporting Line</DialogTitle>
          <DialogDescription>Select who "{sourceNode}" reports to.</DialogDescription>
        </DialogHeader>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger><SelectValue placeholder="Select a role..." /></SelectTrigger>
          <SelectContent>
            {targetOptions.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!selected} onClick={() => { onLink(selected); onClose(); }}>Link</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ──
export default function RaciOrganigramView({ raciEntries, steps, onUpdateRaci }: OrganigramProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [history, setHistory] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkSourceLabel, setLinkSourceLabel] = useState('');

  // Build linked step counts
  const linkedStepCounts = useMemo(() => {
    // This is a lightweight map; step links are managed at RACI tab level
    return new Map<string, number>();
  }, []);

  // Initialize
  useEffect(() => {
    if (raciEntries.length === 0) return;
    const { nodes: rawNodes, edges: rawEdges } = buildOrgHierarchy(raciEntries, linkedStepCounts);
    const { nodes: layouted, edges: layoutedEdges } = getLayoutedElements(rawNodes, rawEdges);
    setNodes(layouted);
    setEdges(layoutedEdges);
  }, [raciEntries, linkedStepCounts]);

  const onConnect = useCallback((params: Connection) => {
    saveHistory();
    setEdges((eds) =>
      addEdge({
        ...params,
        type: 'smoothstep',
        animated: false,
        style: { stroke: 'hsl(var(--border))', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--border))' },
      }, eds)
    );
  }, []);

  const saveHistory = () => {
    setHistory(prev => [...prev, { nodes: nodes.map(n => ({ ...n })), edges: edges.map(e => ({ ...e })) }]);
  };

  const undo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setNodes(prev.nodes);
    setEdges(prev.edges);
    setHistory(h => h.slice(0, -1));
  };

  const autoLayout = () => {
    saveHistory();
    const { nodes: layouted, edges: layoutedEdges } = getLayoutedElements(nodes, edges);
    setNodes(layouted);
    setEdges(layoutedEdges);
    toast({ title: 'Layout applied' });
  };

  const removeEdge = (edgeId: string) => {
    saveHistory();
    setEdges(eds => eds.filter(e => e.id !== edgeId));
  };

  const handleNodeClick = (_: any, node: Node) => {
    setSelectedNodeId(node.id);
  };

  const openLinkDialog = () => {
    if (!selectedNodeId) return;
    const node = nodes.find(n => n.id === selectedNodeId);
    if (!node) return;
    setLinkSourceLabel(node.data.roleName as string);
    setLinkDialogOpen(true);
  };

  const handleLink = (targetId: string) => {
    if (!selectedNodeId || targetId === selectedNodeId) return;
    saveHistory();
    const newEdge: Edge = {
      id: `e-${targetId}-${selectedNodeId}`,
      source: targetId,
      target: selectedNodeId,
      type: 'smoothstep',
      style: { stroke: 'hsl(var(--border))', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--border))' },
    };
    setEdges(eds => [...eds.filter(e => e.target !== selectedNodeId), newEdge]);
  };

  const unlinkSelected = () => {
    if (!selectedNodeId) return;
    saveHistory();
    setEdges(eds => eds.filter(e => e.source !== selectedNodeId && e.target !== selectedNodeId));
  };

  if (raciEntries.length === 0) {
    return (
      <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">
        Add RACI roles to see the organizational hierarchy chart.
      </CardContent></Card>
    );
  }

  const targetOptions = nodes
    .filter(n => n.id !== selectedNodeId)
    .map(n => ({ id: n.id, label: n.data.roleName as string }));

  return (
    <div className="rounded-lg border border-border overflow-hidden" style={{ height: 600 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        deleteKeyCode={['Delete', 'Backspace']}
        onEdgeClick={(_, edge) => {
          if (confirm('Remove this reporting line?')) removeEdge(edge.id);
        }}
      >
        <Background gap={20} size={1} />
        <Controls position="bottom-right" />
        <MiniMap
          pannable
          zoomable
          className="!bg-background !border-border"
          nodeColor={() => 'hsl(var(--primary))'}
        />

        <Panel position="top-left" className="flex gap-1.5">
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 bg-background/90 backdrop-blur-sm" onClick={autoLayout}>
            <LayoutGrid className="h-3.5 w-3.5" /> Auto Layout
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 bg-background/90 backdrop-blur-sm" onClick={undo} disabled={history.length === 0}>
            <Undo2 className="h-3.5 w-3.5" /> Undo
          </Button>
        </Panel>

        <Panel position="top-right" className="flex gap-1.5">
          {selectedNodeId && (
            <>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 bg-background/90 backdrop-blur-sm" onClick={openLinkDialog}>
                <Link2 className="h-3.5 w-3.5" /> Set Reports To
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 bg-background/90 backdrop-blur-sm" onClick={unlinkSelected}>
                <Unlink className="h-3.5 w-3.5" /> Unlink
              </Button>
            </>
          )}
        </Panel>

        {/* Legend */}
        <Panel position="bottom-left" className="bg-background/90 backdrop-blur-sm rounded-lg border border-border px-3 py-2">
          <div className="flex gap-3 items-center text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-amber-500 rounded" /> Senior</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-500 rounded" /> Lead</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-500 rounded" /> Mid-Senior</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-slate-400 rounded" /> Junior</span>
            <span className="text-muted-foreground/50">|</span>
            <span>Drag nodes to reposition • Connect handles to set reporting lines</span>
          </div>
        </Panel>
      </ReactFlow>

      {linkDialogOpen && (
        <LinkNodesDialog
          open={linkDialogOpen}
          onClose={() => setLinkDialogOpen(false)}
          sourceNode={linkSourceLabel}
          targetOptions={targetOptions}
          onLink={handleLink}
        />
      )}
    </div>
  );
}
