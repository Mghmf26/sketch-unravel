import { useState } from 'react';
import { Pencil, Trash2, Plus, ArrowRight, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { EPCNode, EPCConnection, NodeType } from '@/types/epc';

interface ExtractionResultsEditorProps {
  nodes: EPCNode[];
  connections: EPCConnection[];
  processId: string;
  processName: string;
  onUpdate: (data: { nodes: EPCNode[]; connections: EPCConnection[]; processId: string; processName: string }) => void;
}

const NODE_TYPE_COLORS: Record<string, string> = {
  'in-scope': 'bg-emerald-100 text-emerald-800 border-emerald-300',
  'interface': 'bg-slate-100 text-slate-800 border-slate-300',
  'event': 'bg-pink-100 text-pink-800 border-pink-300',
  'xor': 'bg-sky-100 text-sky-800 border-sky-300',
};

const NODE_TYPES: NodeType[] = ['in-scope', 'interface', 'event', 'xor'];

export default function ExtractionResultsEditor({ nodes, connections, processId, processName, onUpdate }: ExtractionResultsEditorProps) {
  const [editingNodeIdx, setEditingNodeIdx] = useState<number | null>(null);
  const [editingConnIdx, setEditingConnIdx] = useState<number | null>(null);
  const [editNode, setEditNode] = useState<EPCNode | null>(null);
  const [editConn, setEditConn] = useState<EPCConnection | null>(null);
  const [editProcessId, setEditProcessId] = useState(processId);
  const [editProcessName, setEditProcessName] = useState(processName);

  const commitProcessInfo = () => {
    onUpdate({ nodes, connections, processId: editProcessId, processName: editProcessName });
  };

  // --- Node editing ---
  const startEditNode = (idx: number) => {
    setEditingNodeIdx(idx);
    setEditNode({ ...nodes[idx] });
  };

  const cancelEditNode = () => { setEditingNodeIdx(null); setEditNode(null); };

  const saveEditNode = () => {
    if (editNode === null || editingNodeIdx === null) return;
    const updated = [...nodes];
    updated[editingNodeIdx] = editNode;
    onUpdate({ nodes: updated, connections, processId: editProcessId, processName: editProcessName });
    cancelEditNode();
  };

  const deleteNode = (idx: number) => {
    const nodeId = nodes[idx].id;
    const updatedNodes = nodes.filter((_, i) => i !== idx);
    const updatedConns = connections.filter(c => c.source !== nodeId && c.target !== nodeId);
    onUpdate({ nodes: updatedNodes, connections: updatedConns, processId: editProcessId, processName: editProcessName });
  };

  const addNode = () => {
    const newNode: EPCNode = { id: `NEW-${Date.now()}`, label: 'New Node', type: 'in-scope', description: '' };
    onUpdate({ nodes: [...nodes, newNode], connections, processId: editProcessId, processName: editProcessName });
  };

  // --- Connection editing ---
  const startEditConn = (idx: number) => {
    setEditingConnIdx(idx);
    setEditConn({ ...connections[idx] });
  };

  const cancelEditConn = () => { setEditingConnIdx(null); setEditConn(null); };

  const saveEditConn = () => {
    if (editConn === null || editingConnIdx === null) return;
    const updated = [...connections];
    updated[editingConnIdx] = editConn;
    onUpdate({ nodes, connections: updated, processId: editProcessId, processName: editProcessName });
    cancelEditConn();
  };

  const deleteConn = (idx: number) => {
    onUpdate({ nodes, connections: connections.filter((_, i) => i !== idx), processId: editProcessId, processName: editProcessName });
  };

  const addConnection = () => {
    const newConn: EPCConnection = {
      id: crypto.randomUUID(),
      source: nodes[0]?.id || '',
      target: nodes.length > 1 ? nodes[1].id : nodes[0]?.id || '',
      label: '',
    };
    onUpdate({ nodes, connections: [...connections, newConn], processId: editProcessId, processName: editProcessName });
  };

  return (
    <div className="space-y-4">
      {/* Process Info */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Process ID</label>
            <Input value={editProcessId} onChange={e => setEditProcessId(e.target.value)} onBlur={commitProcessInfo} className="h-8 text-sm font-mono" />
          </div>
          <div className="flex-[2] space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Process Name</label>
            <Input value={editProcessName} onChange={e => setEditProcessName(e.target.value)} onBlur={commitProcessInfo} className="h-8 text-sm" />
          </div>
        </CardContent>
      </Card>

      {/* Nodes Table */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Nodes ({nodes.length})</CardTitle>
          <Button variant="outline" size="sm" onClick={addNode} className="h-7 text-xs">
            <Plus className="h-3 w-3 mr-1" /> Add Node
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">ID</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Label</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-right p-3 font-medium text-muted-foreground w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {nodes.map((node, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                    {editingNodeIdx === i && editNode ? (
                      <>
                        <td className="p-2">
                          <Input value={editNode.id} onChange={e => setEditNode({ ...editNode, id: e.target.value })} className="h-7 text-xs font-mono" />
                        </td>
                        <td className="p-2">
                          <Input value={editNode.label} onChange={e => setEditNode({ ...editNode, label: e.target.value })} className="h-7 text-xs" />
                        </td>
                        <td className="p-2">
                          <Select value={editNode.type} onValueChange={v => setEditNode({ ...editNode, type: v as NodeType })}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {NODE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={saveEditNode}><Check className="h-3.5 w-3.5 text-emerald-600" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cancelEditNode}><X className="h-3.5 w-3.5 text-destructive" /></Button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-3 font-mono text-xs">{node.id}</td>
                        <td className="p-3">{node.label}</td>
                        <td className="p-3">
                          <Badge variant="outline" className={`text-xs ${NODE_TYPE_COLORS[node.type] || ''}`}>{node.type}</Badge>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditNode(i)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteNode(i)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Connections Table */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Connections ({connections.length})</CardTitle>
          <Button variant="outline" size="sm" onClick={addConnection} className="h-7 text-xs" disabled={nodes.length < 2}>
            <Plus className="h-3 w-3 mr-1" /> Add Connection
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Source</th>
                  <th className="text-left p-3 font-medium text-muted-foreground w-8">→</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Target</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Label</th>
                  <th className="text-right p-3 font-medium text-muted-foreground w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {connections.map((conn, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                    {editingConnIdx === i && editConn ? (
                      <>
                        <td className="p-2">
                          <Select value={editConn.source} onValueChange={v => setEditConn({ ...editConn, source: v })}>
                            <SelectTrigger className="h-7 text-xs font-mono"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {nodes.map(n => <SelectItem key={n.id} value={n.id}>{n.id} — {n.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2 text-muted-foreground"><ArrowRight className="h-3.5 w-3.5" /></td>
                        <td className="p-2">
                          <Select value={editConn.target} onValueChange={v => setEditConn({ ...editConn, target: v })}>
                            <SelectTrigger className="h-7 text-xs font-mono"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {nodes.map(n => <SelectItem key={n.id} value={n.id}>{n.id} — {n.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2">
                          <Input value={editConn.label || ''} onChange={e => setEditConn({ ...editConn, label: e.target.value })} placeholder="Yes / No" className="h-7 text-xs" />
                        </td>
                        <td className="p-2 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={saveEditConn}><Check className="h-3.5 w-3.5 text-emerald-600" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cancelEditConn}><X className="h-3.5 w-3.5 text-destructive" /></Button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-3 font-mono text-xs">{conn.source}</td>
                        <td className="p-3 text-muted-foreground">→</td>
                        <td className="p-3 font-mono text-xs">{conn.target}</td>
                        <td className="p-3">{conn.label || <span className="text-muted-foreground">—</span>}</td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditConn(i)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteConn(i)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
