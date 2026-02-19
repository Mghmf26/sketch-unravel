import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, ArrowRight, ArrowLeft, Upload, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import type { EPCNode, EPCConnection, EPCDiagram, NodeType } from '@/types/epc';
import { getDiagram, saveDiagram, createNewDiagram } from '@/lib/store';

const NODE_TYPE_CONFIG: Record<NodeType, { label: string; color: string; badge: string }> = {
  'in-scope': { label: 'In-Scope Step', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', badge: '🟩' },
  'interface': { label: 'Interface/External', color: 'bg-slate-100 text-slate-800 border-slate-300', badge: '⬜' },
  'event': { label: 'Event', color: 'bg-pink-100 text-pink-800 border-pink-300', badge: '🩷' },
  'xor': { label: 'XOR Gateway', color: 'bg-blue-100 text-blue-800 border-blue-300', badge: '🔵' },
  'start-end': { label: 'Start/End', color: 'bg-green-100 text-green-800 border-green-300', badge: '🟢' },
  'decision': { label: 'Decision', color: 'bg-orange-100 text-orange-800 border-orange-300', badge: '🔶' },
  'storage': { label: 'Storage', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', badge: '🔺' },
  'delay': { label: 'Delay/Wait', color: 'bg-red-100 text-red-800 border-red-300', badge: '🔴' },
  'document': { label: 'Document', color: 'bg-violet-100 text-violet-800 border-violet-300', badge: '📄' },
};

export default function DataEntry() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [diagram, setDiagram] = useState<EPCDiagram | null>(null);
  const [processId, setProcessId] = useState('');
  const [processName, setProcessName] = useState('');
  const [nodes, setNodes] = useState<EPCNode[]>([]);
  const [connections, setConnections] = useState<EPCConnection[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');

  // New node form
  const [newNodeId, setNewNodeId] = useState('');
  const [newNodeLabel, setNewNodeLabel] = useState('');
  const [newNodeType, setNewNodeType] = useState<NodeType>('in-scope');
  const [newNodeDesc, setNewNodeDesc] = useState('');

  // New connection form
  const [newConnSource, setNewConnSource] = useState('');
  const [newConnTarget, setNewConnTarget] = useState('');
  const [newConnLabel, setNewConnLabel] = useState('');

  useEffect(() => {
    if (id) {
      const d = getDiagram(id);
      if (d) {
        setDiagram(d);
        setProcessId(d.processId);
        setProcessName(d.processName);
        setNodes(d.nodes);
        setConnections(d.connections);
      }
    }
  }, [id]);

  const handleSave = () => {
    if (!processId.trim() || !processName.trim()) {
      toast({ title: 'Missing info', description: 'Process ID and Name are required.', variant: 'destructive' });
      return;
    }
    const d: EPCDiagram = diagram
      ? { ...diagram, processId, processName, nodes, connections, updatedAt: new Date().toISOString() }
      : createNewDiagram(processId, processName);
    if (!diagram) {
      d.nodes = nodes;
      d.connections = connections;
    }
    saveDiagram(d);
    setDiagram(d);
    toast({ title: 'Saved!', description: `Diagram "${processName}" saved successfully.` });
    if (!id) navigate(`/edit/${d.id}`, { replace: true });
  };

  const addNode = () => {
    if (!newNodeId.trim() || !newNodeLabel.trim()) {
      toast({ title: 'Missing fields', description: 'Node ID and Label are required.', variant: 'destructive' });
      return;
    }
    if (nodes.find(n => n.id === newNodeId.trim())) {
      toast({ title: 'Duplicate ID', description: 'A node with this ID already exists.', variant: 'destructive' });
      return;
    }
    setNodes([...nodes, { id: newNodeId.trim(), label: newNodeLabel.trim(), type: newNodeType, description: newNodeDesc.trim() }]);
    setNewNodeId('');
    setNewNodeLabel('');
    setNewNodeDesc('');
  };

  const removeNode = (nodeId: string) => {
    setNodes(nodes.filter(n => n.id !== nodeId));
    setConnections(connections.filter(c => c.source !== nodeId && c.target !== nodeId));
  };

  const addConnection = () => {
    if (!newConnSource || !newConnTarget) {
      toast({ title: 'Missing fields', description: 'Source and Target are required.', variant: 'destructive' });
      return;
    }
    setConnections([...connections, { id: crypto.randomUUID(), source: newConnSource, target: newConnTarget, label: newConnLabel.trim() || undefined }]);
    setNewConnSource('');
    setNewConnTarget('');
    setNewConnLabel('');
  };

  const removeConnection = (connId: string) => {
    setConnections(connections.filter(c => c.id !== connId));
  };

  const handleBulkImport = () => {
    try {
      const data = JSON.parse(bulkText);
      if (data.nodes && Array.isArray(data.nodes)) {
        const validNodes = data.nodes.filter((n: any) => n.id && n.label && n.type);
        setNodes(prev => [...prev, ...validNodes]);
      }
      if (data.connections && Array.isArray(data.connections)) {
        const validConns = data.connections.map((c: any) => ({ ...c, id: c.id || crypto.randomUUID() })).filter((c: any) => c.source && c.target);
        setConnections(prev => [...prev, ...validConns]);
      }
      setBulkOpen(false);
      setBulkText('');
      toast({ title: 'Imported!', description: 'Bulk data imported successfully.' });
    } catch {
      toast({ title: 'Invalid JSON', description: 'Please check the format and try again.', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header bar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-foreground">
                {id ? 'Edit Diagram' : 'New Diagram'}
              </h1>
              <p className="text-xs text-muted-foreground">Define your EPC business process diagram</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm"><Upload className="mr-2 h-4 w-4" />Bulk Import</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Bulk Import (JSON)</DialogTitle>
                </DialogHeader>
                <Textarea
                  value={bulkText}
                  onChange={e => setBulkText(e.target.value)}
                  placeholder={`{\n  "nodes": [\n    { "id": "AL-020-010", "label": "Step 1", "type": "in-scope" }\n  ],\n  "connections": [\n    { "source": "AL-020-010", "target": "AL-020-020" }\n  ]\n}`}
                  className="min-h-[200px] font-mono text-xs"
                />
                <DialogFooter>
                  <Button onClick={handleBulkImport}>Import</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button onClick={handleSave}><Save className="mr-2 h-4 w-4" />Save</Button>
            {diagram && (
              <Button variant="outline" onClick={() => navigate(`/view/${diagram.id}`)}>
                View Diagram <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6 p-6 max-w-5xl mx-auto">
        {/* Process Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Process Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Process ID</Label>
              <Input value={processId} onChange={e => setProcessId(e.target.value)} placeholder="e.g., AL-020" />
            </div>
            <div className="space-y-2">
              <Label>Process Name</Label>
              <Input value={processName} onChange={e => setProcessName(e.target.value)} placeholder="e.g., Fund Allocation" />
            </div>
          </CardContent>
        </Card>

        {/* Nodes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Nodes</CardTitle>
            <CardDescription>{nodes.length} node{nodes.length !== 1 ? 's' : ''} defined</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-[1fr_2fr_1fr_2fr_auto] gap-2 items-end">
              <div className="space-y-1">
                <Label className="text-xs">ID</Label>
                <Input value={newNodeId} onChange={e => setNewNodeId(e.target.value)} placeholder="AL-020-010" className="text-sm" onKeyDown={e => e.key === 'Enter' && addNode()} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Label</Label>
                <Input value={newNodeLabel} onChange={e => setNewNodeLabel(e.target.value)} placeholder="Step description..." className="text-sm" onKeyDown={e => e.key === 'Enter' && addNode()} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Type</Label>
                <Select value={newNodeType} onValueChange={(v) => setNewNodeType(v as NodeType)}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(NODE_TYPE_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.badge} {cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Description (optional)</Label>
                <Input value={newNodeDesc} onChange={e => setNewNodeDesc(e.target.value)} placeholder="Additional details..." className="text-sm" onKeyDown={e => e.key === 'Enter' && addNode()} />
              </div>
              <Button size="sm" onClick={addNode}><Plus className="h-4 w-4" /></Button>
            </div>

            <Separator />

            {nodes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No nodes added yet. Use the form above to add nodes.</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {nodes.map((node) => (
                  <div key={node.id} className="flex items-center gap-3 p-2 rounded-lg border bg-card">
                    <Badge className={NODE_TYPE_CONFIG[node.type].color + ' text-xs'}>
                      {NODE_TYPE_CONFIG[node.type].badge} {NODE_TYPE_CONFIG[node.type].label}
                    </Badge>
                    <code className="text-xs font-mono text-muted-foreground">{node.id}</code>
                    <span className="text-sm flex-1 truncate">{node.label}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeNode(node.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Connections */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Connections</CardTitle>
            <CardDescription>{connections.length} connection{connections.length !== 1 ? 's' : ''} defined</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
              <div className="space-y-1">
                <Label className="text-xs">Source Node</Label>
                <Select value={newConnSource} onValueChange={setNewConnSource}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Select source..." /></SelectTrigger>
                  <SelectContent>
                    {nodes.map(n => <SelectItem key={n.id} value={n.id}>{n.id} - {n.label.slice(0, 30)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Target Node</Label>
                <Select value={newConnTarget} onValueChange={setNewConnTarget}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Select target..." /></SelectTrigger>
                  <SelectContent>
                    {nodes.map(n => <SelectItem key={n.id} value={n.id}>{n.id} - {n.label.slice(0, 30)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Label (optional)</Label>
                <Input value={newConnLabel} onChange={e => setNewConnLabel(e.target.value)} placeholder='e.g., "Yes", "No"' className="text-sm" onKeyDown={e => e.key === 'Enter' && addConnection()} />
              </div>
              <Button size="sm" onClick={addConnection}><Plus className="h-4 w-4" /></Button>
            </div>

            <Separator />

            {connections.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No connections added yet.</p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {connections.map((conn) => (
                  <div key={conn.id} className="flex items-center gap-3 p-2 rounded-lg border bg-card">
                    <code className="text-xs font-mono">{conn.source}</code>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <code className="text-xs font-mono">{conn.target}</code>
                    {conn.label && <Badge variant="outline" className="text-xs">{conn.label}</Badge>}
                    <span className="flex-1" />
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeConnection(conn.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
