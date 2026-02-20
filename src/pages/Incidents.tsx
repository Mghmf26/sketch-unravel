import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, CheckCircle, Search as SearchIcon, Clock, Plus, Trash2 } from 'lucide-react';
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
  fetchProcesses, fetchSteps, fetchIncidents,
  insertIncident, deleteIncident, updateIncident,
  type BusinessProcess, type ProcessStep, type Incident,
} from '@/lib/api';

export default function Incidents() {
  const navigate = useNavigate();
  const [processes, setProcesses] = useState<BusinessProcess[]>([]);
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [addDialog, setAddDialog] = useState(false);

  const reload = async () => {
    const [p, s, i] = await Promise.all([fetchProcesses(), fetchSteps(), fetchIncidents()]);
    setProcesses(p); setSteps(s); setIncidents(i);
  };
  useEffect(() => { reload(); }, []);

  const processMap: Record<string, string> = {};
  processes.forEach(p => processMap[p.id] = p.process_name);
  const stepMap: Record<string, string> = {};
  steps.forEach(s => stepMap[s.id] = s.label);

  const stats = {
    total: incidents.length,
    open: incidents.filter(i => i.status === 'open').length,
    investigating: incidents.filter(i => i.status === 'investigating').length,
    resolved: incidents.filter(i => i.status === 'resolved' || i.status === 'closed').length,
  };

  const toggleStatus = async (inc: Incident) => {
    const next = inc.status === 'open' ? 'investigating' : inc.status === 'investigating' ? 'resolved' : 'open';
    await updateIncident(inc.id, { status: next });
    reload();
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Incidents</h1>
            <p className="text-sm text-muted-foreground mt-1">Incident tracking linked to process steps — operational disruptions, breaches, processing failures</p>
          </div>
        </div>
        <Button onClick={() => setAddDialog(true)}><Plus className="mr-2 h-4 w-4" /> Report Incident</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'TOTAL INCIDENTS', value: stats.total, icon: AlertCircle },
          { label: 'OPEN', value: stats.open, icon: AlertCircle },
          { label: 'INVESTIGATING', value: stats.investigating, icon: SearchIcon },
          { label: 'RESOLVED', value: stats.resolved, icon: CheckCircle },
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
          <CardTitle className="text-base">Incident Registry</CardTitle>
          <CardDescription>All incidents linked to process steps with severity and resolution status</CardDescription>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="font-semibold text-xs uppercase">Process</TableHead>
              <TableHead className="font-semibold text-xs uppercase">Step</TableHead>
              <TableHead className="font-semibold text-xs uppercase">Title</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-center">Severity</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-center">Status</TableHead>
              <TableHead className="font-semibold text-xs uppercase">Date</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incidents.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No incidents reported yet.</TableCell></TableRow>
            ) : (
              incidents.map(i => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium text-sm">{processMap[i.process_id] || '—'}</TableCell>
                  <TableCell className="text-sm"><Badge variant="outline" className="text-[10px]">{stepMap[i.step_id] || '—'}</Badge></TableCell>
                  <TableCell className="font-medium text-sm">{i.title}</TableCell>
                  <TableCell className="text-center">
                    <Badge className={`text-[10px] border-0 ${i.severity === 'critical' || i.severity === 'high' ? 'bg-destructive/15 text-destructive' : i.severity === 'medium' ? 'bg-yellow-500/15 text-yellow-600' : 'bg-primary/15 text-primary'}`}>{i.severity}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <button onClick={() => toggleStatus(i)} className="cursor-pointer"><Badge variant="outline" className="text-[10px]">{i.status}</Badge></button>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(i.date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={async () => { await deleteIncident(i.id); reload(); }}><Trash2 className="h-3 w-3" /></Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {addDialog && <AddIncidentDialog processes={processes} steps={steps} onClose={() => setAddDialog(false)} onRefresh={reload} />}
    </div>
  );
}

function AddIncidentDialog({ processes, steps, onClose, onRefresh }: { processes: BusinessProcess[]; steps: ProcessStep[]; onClose: () => void; onRefresh: () => void }) {
  const [processId, setProcessId] = useState('');
  const [stepId, setStepId] = useState('');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [severity, setSeverity] = useState('medium');

  const filteredSteps = steps.filter(s => s.process_id === processId);

  const add = async () => {
    if (!title.trim() || !stepId || !processId) { toast({ title: 'Fill all required fields', variant: 'destructive' }); return; }
    await insertIncident({ step_id: stepId, process_id: processId, title: title.trim(), description: desc || null, severity, status: 'open' });
    toast({ title: 'Incident reported' });
    onRefresh(); onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Report Incident</DialogTitle><DialogDescription>Link an incident to a specific process step.</DialogDescription></DialogHeader>
        <div className="grid gap-3 py-2">
          <Select value={processId} onValueChange={v => { setProcessId(v); setStepId(''); }}><SelectTrigger><SelectValue placeholder="Select process" /></SelectTrigger><SelectContent>{processes.map(p => <SelectItem key={p.id} value={p.id}>{p.process_name}</SelectItem>)}</SelectContent></Select>
          <Select value={stepId} onValueChange={setStepId}><SelectTrigger><SelectValue placeholder="Select step" /></SelectTrigger><SelectContent>{filteredSteps.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent></Select>
          <Input placeholder="Incident title" value={title} onChange={e => setTitle(e.target.value)} />
          <Textarea placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} rows={2} />
          <Select value={severity} onValueChange={setSeverity}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select>
          <Button onClick={add}>Report Incident</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
