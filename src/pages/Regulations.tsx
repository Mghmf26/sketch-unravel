import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Scale, CheckCircle, AlertTriangle, XCircle, Plus, Trash2 } from 'lucide-react';
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
  fetchProcesses, fetchSteps, fetchRegulations,
  insertRegulation, deleteRegulation,
  type BusinessProcess, type ProcessStep, type Regulation,
} from '@/lib/api';

export default function Regulations() {
  const navigate = useNavigate();
  const [processes, setProcesses] = useState<BusinessProcess[]>([]);
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [addDialog, setAddDialog] = useState(false);

  const reload = async () => {
    const [p, s, r] = await Promise.all([fetchProcesses(), fetchSteps(), fetchRegulations()]);
    setProcesses(p); setSteps(s); setRegulations(r);
  };
  useEffect(() => { reload(); }, []);

  const processMap: Record<string, string> = {};
  processes.forEach(p => processMap[p.id] = p.process_name);
  const stepMap: Record<string, string> = {};
  steps.forEach(s => stepMap[s.id] = s.label);

  const stats = {
    total: regulations.length,
    compliant: regulations.filter(r => r.compliance_status === 'compliant').length,
    partial: regulations.filter(r => r.compliance_status === 'partial').length,
    nonCompliant: regulations.filter(r => r.compliance_status === 'non-compliant').length,
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Regulations</h1>
            <p className="text-sm text-muted-foreground mt-1">Regulatory compliance linked to process steps — SOX, GDPR, DORA, Basel III, PCI-DSS</p>
          </div>
        </div>
        <Button onClick={() => setAddDialog(true)}><Plus className="mr-2 h-4 w-4" /> Add Regulation</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'TOTAL REGULATIONS', value: stats.total, icon: Scale },
          { label: 'COMPLIANT', value: stats.compliant, icon: CheckCircle },
          { label: 'PARTIAL', value: stats.partial, icon: AlertTriangle },
          { label: 'NON-COMPLIANT', value: stats.nonCompliant, icon: XCircle },
        ].map(s => (
          <Card key={s.label} className="border border-dashed border-primary/40 bg-card">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-2xl font-bold text-primary">{s.value}</p>
                <p className="text-[10px] text-muted-foreground font-semibold tracking-widest uppercase">{s.label}</p>
              </div>
              <s.icon className="h-5 w-5 text-primary/60" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-sm overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">Regulatory Framework Registry</CardTitle>
          <CardDescription>Each regulation linked to a specific process step for precise compliance tracking</CardDescription>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="font-semibold text-xs uppercase">Process</TableHead>
              <TableHead className="font-semibold text-xs uppercase">Step</TableHead>
              <TableHead className="font-semibold text-xs uppercase">Regulation</TableHead>
              <TableHead className="font-semibold text-xs uppercase">Authority</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-center">Status</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {regulations.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No regulations linked yet.</TableCell></TableRow>
            ) : (
              regulations.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-sm">{processMap[r.process_id] || '—'}</TableCell>
                  <TableCell className="text-sm"><Badge variant="outline" className="text-[10px]">{stepMap[r.step_id] || '—'}</Badge></TableCell>
                  <TableCell className="font-medium text-sm">{r.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.authority}</TableCell>
                  <TableCell className="text-center">
                    <Badge className={`text-[10px] border-0 ${r.compliance_status === 'compliant' ? 'bg-primary/15 text-primary' : r.compliance_status === 'partial' ? 'bg-yellow-500/15 text-yellow-600' : 'bg-destructive/15 text-destructive'}`}>{r.compliance_status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={async () => { await deleteRegulation(r.id); reload(); }}><Trash2 className="h-3 w-3" /></Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {addDialog && <AddRegulationDialog processes={processes} steps={steps} onClose={() => setAddDialog(false)} onRefresh={reload} />}
    </div>
  );
}

function AddRegulationDialog({ processes, steps, onClose, onRefresh }: { processes: BusinessProcess[]; steps: ProcessStep[]; onClose: () => void; onRefresh: () => void }) {
  const [processId, setProcessId] = useState('');
  const [stepId, setStepId] = useState('');
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [authority, setAuthority] = useState('');
  const [compliance, setCompliance] = useState('compliant');

  const filteredSteps = steps.filter(s => s.process_id === processId);

  const add = async () => {
    if (!name.trim() || !stepId || !processId) { toast({ title: 'Fill all required fields', variant: 'destructive' }); return; }
    await insertRegulation({ step_id: stepId, process_id: processId, name: name.trim(), description: desc || null, authority: authority || null, compliance_status: compliance });
    toast({ title: 'Regulation added' });
    onRefresh(); onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add Regulation</DialogTitle><DialogDescription>Link a regulation to a specific process step.</DialogDescription></DialogHeader>
        <div className="grid gap-3 py-2">
          <Select value={processId} onValueChange={v => { setProcessId(v); setStepId(''); }}><SelectTrigger><SelectValue placeholder="Select process" /></SelectTrigger><SelectContent>{processes.map(p => <SelectItem key={p.id} value={p.id}>{p.process_name}</SelectItem>)}</SelectContent></Select>
          <Select value={stepId} onValueChange={setStepId}><SelectTrigger><SelectValue placeholder="Select step" /></SelectTrigger><SelectContent>{filteredSteps.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent></Select>
          <Input placeholder="Regulation name (e.g. SOX, GDPR, DORA)" value={name} onChange={e => setName(e.target.value)} />
          <Textarea placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} rows={2} />
          <div className="flex gap-2">
            <Input placeholder="Authority" value={authority} onChange={e => setAuthority(e.target.value)} className="flex-1" />
            <Select value={compliance} onValueChange={setCompliance}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="compliant">Compliant</SelectItem><SelectItem value="partial">Partial</SelectItem><SelectItem value="non-compliant">Non-Compliant</SelectItem></SelectContent></Select>
          </div>
          <Button onClick={add}>Add Regulation</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
