import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldAlert, Shield, AlertTriangle, Plus, Trash2 } from 'lucide-react';
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
  fetchProcesses, fetchSteps, fetchRisks, fetchAllControls,
  insertRisk, deleteRisk, insertControl, deleteControl,
  type BusinessProcess, type ProcessStep, type Risk, type Control,
} from '@/lib/api';

export default function RisksControls() {
  const navigate = useNavigate();
  const [processes, setProcesses] = useState<BusinessProcess[]>([]);
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [controls, setControls] = useState<Control[]>([]);
  const [addDialog, setAddDialog] = useState(false);
  const [controlDialog, setControlDialog] = useState<string | null>(null);

  const reload = async () => {
    const [p, s, r, c] = await Promise.all([fetchProcesses(), fetchSteps(), fetchRisks(), fetchAllControls()]);
    setProcesses(p); setSteps(s); setRisks(r); setControls(c);
  };
  useEffect(() => { reload(); }, []);

  const processMap: Record<string, string> = {};
  processes.forEach(p => processMap[p.id] = p.process_name);
  const stepMap: Record<string, string> = {};
  steps.forEach(s => stepMap[s.id] = s.label);

  const stats = {
    total: risks.length,
    high: risks.filter(r => r.impact === 'high' || r.likelihood === 'high').length,
    medium: risks.filter(r => r.impact === 'medium' && r.likelihood !== 'high').length,
    low: risks.filter(r => r.impact === 'low' && r.likelihood === 'low').length,
    totalControls: controls.length,
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Risks & Controls</h1>
            <p className="text-sm text-muted-foreground mt-1">Consolidated risk landscape across all business processes — each risk linked to a specific step with its controls</p>
          </div>
        </div>
        <Button onClick={() => setAddDialog(true)}><Plus className="mr-2 h-4 w-4" /> Add Risk</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
        {[
          { label: 'TOTAL RISKS', value: stats.total, icon: ShieldAlert },
          { label: 'HIGH SEVERITY', value: stats.high, icon: AlertTriangle },
          { label: 'MEDIUM', value: stats.medium, icon: Shield },
          { label: 'LOW', value: stats.low, icon: Shield },
          { label: 'TOTAL CONTROLS', value: stats.totalControls, icon: Shield },
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
          <CardTitle className="text-base">Risk Scenarios Registry</CardTitle>
          <CardDescription>All risks mapped to process steps with likelihood, impact, and linked controls</CardDescription>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="font-semibold text-xs uppercase">Process</TableHead>
              <TableHead className="font-semibold text-xs uppercase">Step</TableHead>
              <TableHead className="font-semibold text-xs uppercase">Description</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-center">Likelihood</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-center">Impact</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-center">Controls</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {risks.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No risk scenarios defined yet.</TableCell></TableRow>
            ) : (
              risks.map(r => {
                const riskControls = controls.filter(c => c.risk_id === r.id);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-sm">{processMap[r.process_id] || '—'}</TableCell>
                    <TableCell className="text-sm"><Badge variant="outline" className="text-[10px]">{stepMap[r.step_id] || '—'}</Badge></TableCell>
                    <TableCell className="text-sm max-w-xs">{r.description}</TableCell>
                    <TableCell className="text-center"><Badge className={`text-[10px] border-0 ${r.likelihood === 'high' ? 'bg-destructive/15 text-destructive' : r.likelihood === 'medium' ? 'bg-yellow-500/15 text-yellow-600' : 'bg-primary/15 text-primary'}`}>{r.likelihood}</Badge></TableCell>
                    <TableCell className="text-center"><Badge className={`text-[10px] border-0 ${r.impact === 'high' ? 'bg-destructive/15 text-destructive' : r.impact === 'medium' ? 'bg-yellow-500/15 text-yellow-600' : 'bg-primary/15 text-primary'}`}>{r.impact}</Badge></TableCell>
                    <TableCell className="text-center">
                      <button onClick={() => setControlDialog(r.id)} className="text-sm font-medium text-primary hover:underline cursor-pointer">{riskControls.length}</button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={async () => { await deleteRisk(r.id); reload(); }}><Trash2 className="h-3 w-3" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {addDialog && <AddRiskDialog processes={processes} steps={steps} onClose={() => setAddDialog(false)} onRefresh={reload} />}
      {controlDialog && <ControlsDialog riskId={controlDialog} controls={controls.filter(c => c.risk_id === controlDialog)} onClose={() => setControlDialog(null)} onRefresh={reload} />}
    </div>
  );
}

function AddRiskDialog({ processes, steps, onClose, onRefresh }: { processes: BusinessProcess[]; steps: ProcessStep[]; onClose: () => void; onRefresh: () => void }) {
  const [processId, setProcessId] = useState('');
  const [stepId, setStepId] = useState('');
  const [desc, setDesc] = useState('');
  const [likelihood, setLikelihood] = useState('medium');
  const [impact, setImpact] = useState('medium');

  const filteredSteps = steps.filter(s => s.process_id === processId);

  const add = async () => {
    if (!desc.trim() || !stepId || !processId) { toast({ title: 'Fill all required fields', variant: 'destructive' }); return; }
    await insertRisk({ step_id: stepId, process_id: processId, description: desc.trim(), likelihood, impact });
    toast({ title: 'Risk added' });
    onRefresh(); onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add Risk Scenario</DialogTitle><DialogDescription>Link a risk to a specific process step.</DialogDescription></DialogHeader>
        <div className="grid gap-3 py-2">
          <Select value={processId} onValueChange={v => { setProcessId(v); setStepId(''); }}><SelectTrigger><SelectValue placeholder="Select process" /></SelectTrigger><SelectContent>{processes.map(p => <SelectItem key={p.id} value={p.id}>{p.process_name}</SelectItem>)}</SelectContent></Select>
          <Select value={stepId} onValueChange={setStepId}><SelectTrigger><SelectValue placeholder="Select step" /></SelectTrigger><SelectContent>{filteredSteps.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent></Select>
          <Textarea placeholder="Risk description" value={desc} onChange={e => setDesc(e.target.value)} rows={2} />
          <div className="flex gap-2">
            <Select value={likelihood} onValueChange={setLikelihood}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select>
            <Select value={impact} onValueChange={setImpact}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select>
          </div>
          <Button onClick={add}>Add Risk</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ControlsDialog({ riskId, controls, onClose, onRefresh }: { riskId: string; controls: Control[]; onClose: () => void; onRefresh: () => void }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [type, setType] = useState('preventive');
  const [effectiveness, setEffectiveness] = useState('effective');

  const add = async () => {
    if (!name.trim()) return;
    await insertControl({ risk_id: riskId, name: name.trim(), description: desc || null, type, effectiveness });
    toast({ title: 'Control added' });
    setName(''); setDesc('');
    onRefresh();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Controls</DialogTitle><DialogDescription>Manage controls for this risk scenario.</DialogDescription></DialogHeader>
        <div className="space-y-2">
          {controls.map(c => (
            <div key={c.id} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
              <div className="flex-1">
                <p className="text-sm font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.description}</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px]">{c.type}</Badge>
                  <Badge variant="outline" className="text-[10px]">{c.effectiveness}</Badge>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={async () => { await deleteControl(c.id); onRefresh(); }}><Trash2 className="h-3 w-3" /></Button>
            </div>
          ))}
        </div>
        <div className="grid gap-3 pt-3 border-t">
          <Input placeholder="Control name" value={name} onChange={e => setName(e.target.value)} />
          <Textarea placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} rows={2} />
          <div className="flex gap-2">
            <Select value={type} onValueChange={setType}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="preventive">Preventive</SelectItem><SelectItem value="detective">Detective</SelectItem><SelectItem value="corrective">Corrective</SelectItem></SelectContent></Select>
            <Select value={effectiveness} onValueChange={setEffectiveness}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="effective">Effective</SelectItem><SelectItem value="partially-effective">Partial</SelectItem><SelectItem value="ineffective">Ineffective</SelectItem></SelectContent></Select>
            <Button onClick={add}><Plus className="mr-1 h-3 w-3" /> Add</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
