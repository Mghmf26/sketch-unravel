import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Database, Upload, FileText, HardDrive, Server, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import {
  fetchProcesses, fetchSteps, fetchMainframeImports,
  insertMainframeImport, deleteMainframeImport,
  type BusinessProcess, type ProcessStep, type MainframeImport,
} from '@/lib/api';

export default function MainframeImports() {
  const navigate = useNavigate();
  const [processes, setProcesses] = useState<BusinessProcess[]>([]);
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [imports, setImports] = useState<MainframeImport[]>([]);
  const [addDialog, setAddDialog] = useState(false);

  const reload = async () => {
    const [p, s, i] = await Promise.all([fetchProcesses(), fetchSteps(), fetchMainframeImports()]);
    setProcesses(p); setSteps(s); setImports(i);
  };
  useEffect(() => { reload(); }, []);

  const processMap: Record<string, string> = {};
  processes.forEach(p => processMap[p.id] = p.process_name);
  const stepMap: Record<string, string> = {};
  steps.forEach(s => stepMap[s.id] = s.label);

  const connectedCount = imports.filter(i => i.status === 'active').length;
  const totalRecords = imports.reduce((s, i) => s + (i.record_count || 0), 0);

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Mainframe Imports</h1>
            <p className="text-sm text-muted-foreground mt-1">Connect and import data from mainframe systems — linked to process steps</p>
          </div>
        </div>
        <Button onClick={() => setAddDialog(true)}><Plus className="mr-2 h-4 w-4" /> Add Data Source</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { title: 'DATA SOURCES', value: imports.length, icon: Database },
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
          <CardTitle className="text-base">Mainframe Data Sources</CardTitle>
          <CardDescription>Data sources linked to business process steps — the system of record for each process</CardDescription>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="font-semibold text-xs uppercase">Data Source</TableHead>
              <TableHead className="font-semibold text-xs uppercase">Type</TableHead>
              <TableHead className="font-semibold text-xs uppercase">Process</TableHead>
              <TableHead className="font-semibold text-xs uppercase">Step</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-center">Records</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-center">Status</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {imports.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No mainframe data sources added yet.</TableCell></TableRow>
            ) : (
              imports.map(ds => (
                <TableRow key={ds.id}>
                  <TableCell className="font-medium text-sm">{ds.source_name}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{ds.source_type}</Badge></TableCell>
                  <TableCell className="text-sm">{processMap[ds.process_id] || '—'}</TableCell>
                  <TableCell className="text-sm"><Badge variant="outline" className="text-[10px]">{ds.step_id ? stepMap[ds.step_id] || '—' : '—'}</Badge></TableCell>
                  <TableCell className="text-center text-sm font-medium">{(ds.record_count || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-center">
                    <Badge className={`text-[10px] border-0 ${ds.status === 'active' ? 'bg-primary/15 text-primary' : ds.status === 'pending' ? 'bg-yellow-500/15 text-yellow-600' : 'bg-destructive/15 text-destructive'}`}>{ds.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={async () => { await deleteMainframeImport(ds.id); reload(); }}><Trash2 className="h-3 w-3" /></Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Card className="border bg-muted/20">
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-2">How Mainframe Data Connects to Business Processes</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Business processes sit on top of mainframe data. Each process step reads data (inputs), transforms it (processing), and writes data (outputs).
            Risk scenarios materialize when mainframe data is compromised — incorrect data → incorrect results, unavailable data → process stops, exposed data → breaches, tampered data → fraud.
          </p>
          <div className="mt-3 flex gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px]">Process → Application → Data Objects</Badge>
            <Badge variant="outline" className="text-[10px]">Access Paths → Controls → Risk Scenarios</Badge>
          </div>
        </CardContent>
      </Card>

      {addDialog && <AddImportDialog processes={processes} steps={steps} onClose={() => setAddDialog(false)} onRefresh={reload} />}
    </div>
  );
}

function AddImportDialog({ processes, steps, onClose, onRefresh }: { processes: BusinessProcess[]; steps: ProcessStep[]; onClose: () => void; onRefresh: () => void }) {
  const [processId, setProcessId] = useState('');
  const [stepId, setStepId] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [sourceType, setSourceType] = useState('DB2');
  const [datasetName, setDatasetName] = useState('');
  const [desc, setDesc] = useState('');
  const [recordCount, setRecordCount] = useState(0);

  const filteredSteps = steps.filter(s => s.process_id === processId);

  const add = async () => {
    if (!sourceName.trim() || !processId) { toast({ title: 'Provide a source name and select a process', variant: 'destructive' }); return; }
    await insertMainframeImport({
      process_id: processId, step_id: stepId || null, source_name: sourceName.trim(),
      source_type: sourceType, dataset_name: datasetName || null, description: desc || null,
      record_count: recordCount, status: 'active',
    });
    toast({ title: 'Data source added' });
    onRefresh(); onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add Mainframe Data Source</DialogTitle><DialogDescription>Link a mainframe data source to a business process step.</DialogDescription></DialogHeader>
        <div className="grid gap-3 py-2">
          <Select value={processId} onValueChange={v => { setProcessId(v); setStepId(''); }}><SelectTrigger><SelectValue placeholder="Select process" /></SelectTrigger><SelectContent>{processes.map(p => <SelectItem key={p.id} value={p.id}>{p.process_name}</SelectItem>)}</SelectContent></Select>
          <Select value={stepId} onValueChange={setStepId}><SelectTrigger><SelectValue placeholder="Select step (optional)" /></SelectTrigger><SelectContent>{filteredSteps.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent></Select>
          <Input placeholder="Source name (e.g. DB2 Customer Master)" value={sourceName} onChange={e => setSourceName(e.target.value)} />
          <div className="flex gap-2">
            <Select value={sourceType} onValueChange={setSourceType}><SelectTrigger className="w-28"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="DB2">DB2</SelectItem><SelectItem value="VSAM">VSAM</SelectItem><SelectItem value="IMS">IMS</SelectItem><SelectItem value="MQ">MQ</SelectItem><SelectItem value="CICS">CICS</SelectItem><SelectItem value="Log">Log</SelectItem></SelectContent></Select>
            <Input placeholder="Dataset name" value={datasetName} onChange={e => setDatasetName(e.target.value)} className="flex-1" />
          </div>
          <Textarea placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} rows={2} />
          <Input type="number" placeholder="Record count" value={recordCount} onChange={e => setRecordCount(Number(e.target.value))} />
          <Button onClick={add}>Add Data Source</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
