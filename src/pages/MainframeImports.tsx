import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Database, Upload, FileText, HardDrive, Server, Plus, Trash2, Search, X, File, Cpu, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  fetchProcesses, fetchSteps, fetchMainframeImports,
  insertMainframeImport, deleteMainframeImport,
  type BusinessProcess, type ProcessStep, type MainframeImport,
} from '@/lib/api';
import {
  fetchMainframeFlows, fetchMFFlowNodes,
  type MainframeFlow, type MFFlowNode, MF_NODE_TYPE_META, type MFNodeType,
} from '@/lib/api-mainframe-flows';

export default function MainframeImports() {
  const navigate = useNavigate();
  const [processes, setProcesses] = useState<BusinessProcess[]>([]);
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [imports, setImports] = useState<MainframeImport[]>([]);
  const [flows, setFlows] = useState<MainframeFlow[]>([]);
  const [flowNodes, setFlowNodes] = useState<MFFlowNode[]>([]);
  const [addDialog, setAddDialog] = useState(false);

  const reload = async () => {
    const [p, s, i, f] = await Promise.all([fetchProcesses(), fetchSteps(), fetchMainframeImports(), fetchMainframeFlows()]);
    setProcesses(p); setSteps(s); setImports(i); setFlows(f);
    // Load all flow nodes
    const nodePromises = f.map(fl => fetchMFFlowNodes(fl.id));
    const allNodes = (await Promise.all(nodePromises)).flat();
    setFlowNodes(allNodes);
  };
  useEffect(() => { reload(); }, []);

  const processMap: Record<string, string> = {};
  processes.forEach(p => processMap[p.id] = p.process_name);
  const stepMap: Record<string, string> = {};
  steps.forEach(s => stepMap[s.id] = s.label);
  const flowMap: Record<string, string> = {};
  flows.forEach(f => flowMap[f.id] = f.name);
  const nodeMap: Record<string, MFFlowNode> = {};
  flowNodes.forEach(n => nodeMap[n.id] = n);

  const connectedCount = imports.filter(i => i.status === 'active').length;
  const totalRecords = imports.reduce((s, i) => s + (i.record_count || 0), 0);

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">MF Data Sources</h1>
            <p className="text-sm text-muted-foreground mt-1">Mainframe data sources linked to flow nodes — the system of record for infrastructure analysis</p>
          </div>
        </div>
        <Button onClick={() => setAddDialog(true)}><Plus className="mr-2 h-4 w-4" /> Add Data Source</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { title: 'MF DATA SOURCES', value: imports.length, icon: Database },
          { title: 'TOTAL RECORDS', value: totalRecords.toLocaleString(), icon: HardDrive },
          { title: 'ACTIVE CONNECTIONS', value: connectedCount, icon: Server },
        ].map(s => (
          <Card key={s.title} className="border border-dashed border-primary/40 bg-card">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-2xl font-bold text-primary">{s.value}</p>
                <p className="text-[10px] text-muted-foreground font-semibold tracking-widest uppercase">{s.title}</p>
              </div>
              <s.icon className="h-6 w-6 text-primary/60" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-sm overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">MF Data Sources</CardTitle>
          <CardDescription>Data sources linked to mainframe flow nodes — Process → Step → Flow → Node</CardDescription>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="font-semibold text-xs uppercase">Data Source</TableHead>
              <TableHead className="font-semibold text-xs uppercase">Type</TableHead>
              <TableHead className="font-semibold text-xs uppercase">Process</TableHead>
              <TableHead className="font-semibold text-xs uppercase">Step</TableHead>
              <TableHead className="font-semibold text-xs uppercase">Flow / Node</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-center">Records</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-center">File</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-center">Status</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {imports.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">No MF data sources added yet.</TableCell></TableRow>
            ) : (
              imports.map(ds => {
                const node = ds.flow_node_id ? nodeMap[ds.flow_node_id] : null;
                const nodeMeta = node ? MF_NODE_TYPE_META[node.node_type as MFNodeType] : null;
                return (
                  <TableRow key={ds.id}>
                    <TableCell className="font-medium text-sm">{ds.source_name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{ds.source_type}</Badge></TableCell>
                    <TableCell className="text-sm">{processMap[ds.process_id] || '—'}</TableCell>
                    <TableCell className="text-sm"><Badge variant="outline" className="text-[10px]">{ds.step_id ? stepMap[ds.step_id] || '—' : '—'}</Badge></TableCell>
                    <TableCell className="text-sm">
                      <div className="flex flex-col gap-0.5">
                        {ds.flow_id && <span className="text-[10px] text-muted-foreground">{flowMap[ds.flow_id] || 'Flow'}</span>}
                        {node && nodeMeta && (
                          <Badge variant="outline" className="text-[10px] w-fit" style={{ borderColor: nodeMeta.color, color: nodeMeta.color }}>
                            {node.label}
                          </Badge>
                        )}
                        {!ds.flow_id && !node && <span className="text-muted-foreground text-xs">—</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm font-medium">{(ds.record_count || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-center">
                      {ds.file_url ? (
                        <a href={ds.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                          <File className="h-3 w-3" /> View
                        </a>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={`text-[10px] border-0 ${ds.status === 'active' ? 'bg-primary/15 text-primary' : ds.status === 'pending' ? 'bg-yellow-500/15 text-yellow-600' : 'bg-destructive/15 text-destructive'}`}>{ds.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={async () => { await deleteMainframeImport(ds.id); reload(); }}><Trash2 className="h-3 w-3" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <Card className="border bg-muted/20">
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-2">How MF Data Sources Connect to Mainframe Flows</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            MF Data Sources are linked to specific nodes within Mainframe Flows. Each node (LPAR, Subsystem, Database, MQ, etc.) can have data sources attached,
            documenting the technical infrastructure that supports business process steps. The hierarchy is: Business Process → Step → Mainframe Flow → Node → Data Source.
          </p>
          <div className="mt-3 flex gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px]">Process → Step → Flow → Node</Badge>
            <Badge variant="outline" className="text-[10px]">LPAR · Subsystem · Database · MQ · API</Badge>
          </div>
        </CardContent>
      </Card>

      {addDialog && <AddImportDialog processes={processes} steps={steps} flows={flows} flowNodes={flowNodes} onClose={() => setAddDialog(false)} onRefresh={reload} />}
    </div>
  );
}

interface AddDialogProps {
  processes: BusinessProcess[];
  steps: ProcessStep[];
  flows: MainframeFlow[];
  flowNodes: MFFlowNode[];
  onClose: () => void;
  onRefresh: () => void;
}

function AddImportDialog({ processes, steps, flows, flowNodes, onClose, onRefresh }: AddDialogProps) {
  const [processId, setProcessId] = useState('');
  const [stepId, setStepId] = useState('');
  const [flowId, setFlowId] = useState('');
  const [flowNodeId, setFlowNodeId] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [sourceType, setSourceType] = useState('DB2');
  const [datasetName, setDatasetName] = useState('');
  const [desc, setDesc] = useState('');
  const [recordCount, setRecordCount] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const filteredSteps = steps.filter(s => s.process_id === processId && s.type === 'in-scope');
  const filteredFlows = flows.filter(f => f.step_id === stepId);
  const filteredNodes = flowNodes.filter(n => n.flow_id === flowId);

  const add = async () => {
    if (!sourceName.trim() || !processId) { toast({ title: 'Provide a source name and select a process', variant: 'destructive' }); return; }

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

    const { data, error } = await supabase.from('mainframe_imports').insert({
      process_id: processId,
      step_id: stepId || null,
      flow_id: flowId || null,
      flow_node_id: flowNodeId || null,
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

    toast({ title: 'Data source added' });
    onRefresh(); onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add MF Data Source</DialogTitle>
          <DialogDescription>Link a data source to a mainframe flow node. Select Process → Step → Flow → Node.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          {/* Process */}
          <Select value={processId} onValueChange={v => { setProcessId(v); setStepId(''); setFlowId(''); setFlowNodeId(''); }}>
            <SelectTrigger><SelectValue placeholder="Select business process" /></SelectTrigger>
            <SelectContent>{processes.map(p => <SelectItem key={p.id} value={p.id}>{p.process_name}</SelectItem>)}</SelectContent>
          </Select>

          {/* Step */}
          <Select value={stepId} onValueChange={v => { setStepId(v); setFlowId(''); setFlowNodeId(''); }} disabled={!processId}>
            <SelectTrigger><SelectValue placeholder="Select step" /></SelectTrigger>
            <SelectContent>{filteredSteps.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
          </Select>

          {/* Flow */}
          <Select value={flowId} onValueChange={v => { setFlowId(v); setFlowNodeId(''); }} disabled={!stepId || filteredFlows.length === 0}>
            <SelectTrigger><SelectValue placeholder={filteredFlows.length === 0 ? 'No flows for this step' : 'Select mainframe flow'} /></SelectTrigger>
            <SelectContent>{filteredFlows.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
          </Select>

          {/* Node */}
          <Select value={flowNodeId} onValueChange={setFlowNodeId} disabled={!flowId || filteredNodes.length === 0}>
            <SelectTrigger><SelectValue placeholder={filteredNodes.length === 0 ? 'No nodes in this flow' : 'Select node (LPAR, DB, MQ...)'} /></SelectTrigger>
            <SelectContent>
              {filteredNodes.map(n => {
                const meta = MF_NODE_TYPE_META[n.node_type as MFNodeType];
                return (
                  <SelectItem key={n.id} value={n.id}>
                    <div className="flex items-center gap-2">
                      {meta && <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: meta.color }} />}
                      {n.label} <span className="text-muted-foreground text-[10px]">({meta?.label || n.node_type})</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

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

          {/* File upload */}
          <div className="border border-dashed border-primary/40 rounded-lg p-4">
            <input ref={fileRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.json,.xml,.jcl,.cbl,.cpy" onChange={e => setFile(e.target.files?.[0] || null)} />
            {file ? (
              <div className="flex items-center gap-2">
                <File className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium flex-1 truncate">{file.name}</span>
                <Button variant="ghost" size="sm" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ''; }}><X className="h-3 w-3" /></Button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()} className="w-full flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                <Upload className="h-5 w-5" />
                <span className="text-xs font-medium">Upload file or document</span>
                <span className="text-[10px]">PDF, Excel, CSV, COBOL, JCL, etc.</span>
              </button>
            )}
          </div>

          <Button onClick={add} disabled={uploading}>{uploading ? 'Uploading...' : 'Add Data Source'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
