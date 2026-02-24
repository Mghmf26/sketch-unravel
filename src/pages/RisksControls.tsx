import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldAlert, Shield, AlertTriangle, Plus, Trash2, Pencil, Search, X } from 'lucide-react';
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
  fetchProcesses, fetchSteps, fetchRisks, fetchAllControls, fetchClients,
  insertRisk, deleteRisk, updateRisk,
  type BusinessProcess, type ProcessStep, type Risk, type Control, type Client,
} from '@/lib/api';

export default function RisksControls() {
  const navigate = useNavigate();
  const [processes, setProcesses] = useState<BusinessProcess[]>([]);
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [controls, setControls] = useState<Control[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [addDialog, setAddDialog] = useState(false);
  const [editRisk, setEditRisk] = useState<Risk | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterClient, setFilterClient] = useState('all');
  const [filterProcess, setFilterProcess] = useState('all');
  const [filterStep, setFilterStep] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');

  const reload = async () => {
    const [p, s, r, c, cl] = await Promise.all([fetchProcesses(), fetchSteps(), fetchRisks(), fetchAllControls(), fetchClients()]);
    setProcesses(p); setSteps(s); setRisks(r); setControls(c); setClients(cl);
  };
  useEffect(() => { reload(); }, []);

  const processMap: Record<string, BusinessProcess> = {};
  processes.forEach(p => processMap[p.id] = p);
  const stepMap: Record<string, string> = {};
  steps.forEach(s => stepMap[s.id] = s.label);
  const clientMap: Record<string, string> = {};
  clients.forEach(c => clientMap[c.id] = c.name);

  // Filter risks
  const filtered = risks.filter(r => {
    const proc = processMap[r.process_id];
    if (filterClient !== 'all' && proc?.client_id !== filterClient) return false;
    if (filterProcess !== 'all' && r.process_id !== filterProcess) return false;
    if (filterStep !== 'all' && r.step_id !== filterStep) return false;
    if (filterSeverity !== 'all') {
      const isMatch = filterSeverity === 'high' ? (r.impact === 'high' || r.likelihood === 'high') :
        filterSeverity === 'medium' ? (r.impact === 'medium' && r.likelihood !== 'high') :
        (r.impact === 'low' && r.likelihood === 'low');
      if (!isMatch) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      const pName = proc?.process_name?.toLowerCase() || '';
      const sName = (stepMap[r.step_id] || '').toLowerCase();
      if (!r.description.toLowerCase().includes(q) && !pName.includes(q) && !sName.includes(q)) return false;
    }
    return true;
  });

  const stats = {
    total: risks.length,
    high: risks.filter(r => r.impact === 'high' || r.likelihood === 'high').length,
    medium: risks.filter(r => r.impact === 'medium' && r.likelihood !== 'high').length,
    low: risks.filter(r => r.impact === 'low' && r.likelihood === 'low').length,
    totalControls: controls.length,
  };

  const hasFilters = search || filterClient !== 'all' || filterProcess !== 'all' || filterStep !== 'all' || filterSeverity !== 'all';
  const clearFilters = () => { setSearch(''); setFilterClient('all'); setFilterProcess('all'); setFilterStep('all'); setFilterSeverity('all'); };

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Risks</h1>
            <p className="text-sm text-muted-foreground mt-1">Risk scenarios across all business processes linked to steps</p>
          </div>
        </div>
        <Button onClick={() => setAddDialog(true)}><Plus className="mr-2 h-4 w-4" /> Add Risk</Button>
      </div>

      {/* Stats */}
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

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search risks..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterClient} onValueChange={setFilterClient}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Clients" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterProcess} onValueChange={v => { setFilterProcess(v); setFilterStep('all'); }}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Processes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Processes</SelectItem>
                {processes.filter(p => filterClient === 'all' || p.client_id === filterClient).map(p => <SelectItem key={p.id} value={p.id}>{p.process_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStep} onValueChange={setFilterStep}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Steps" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Steps</SelectItem>
                {steps.filter(s => (filterProcess === 'all' || s.process_id === filterProcess) && s.type === 'in-scope').map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Severity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            {hasFilters && <Button variant="ghost" size="sm" onClick={clearFilters}><X className="h-3 w-3 mr-1" /> Clear</Button>}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">Risk Scenarios Registry</CardTitle>
          <CardDescription>Showing {filtered.length} of {risks.length} risks</CardDescription>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="font-semibold text-xs uppercase">Client</TableHead>
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
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">{hasFilters ? 'No risks match filters.' : 'No risk scenarios defined yet.'}</TableCell></TableRow>
            ) : (
              filtered.map(r => {
                const proc = processMap[r.process_id];
                const riskControls = controls.filter(c => c.risk_id === r.id);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm text-muted-foreground">{proc?.client_id ? clientMap[proc.client_id] || '—' : '—'}</TableCell>
                    <TableCell className="font-medium text-sm">{proc?.process_name || '—'}</TableCell>
                    <TableCell className="text-sm"><Badge variant="outline" className="text-[10px]">{stepMap[r.step_id] || '—'}</Badge></TableCell>
                    <TableCell className="text-sm max-w-xs truncate">{r.description}</TableCell>
                    <TableCell className="text-center"><SeverityBadge value={r.likelihood} /></TableCell>
                    <TableCell className="text-center"><SeverityBadge value={r.impact} /></TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="text-[10px]">{riskControls.length}</Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditRisk(r)}><Pencil className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={async () => { await deleteRisk(r.id); reload(); }}><Trash2 className="h-3 w-3" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {addDialog && <RiskDialog mode="add" processes={processes} steps={steps} onClose={() => setAddDialog(false)} onRefresh={reload} />}
      {editRisk && <RiskDialog mode="edit" risk={editRisk} processes={processes} steps={steps} onClose={() => setEditRisk(null)} onRefresh={reload} />}
    </div>
  );
}

function SeverityBadge({ value }: { value: string }) {
  const cls = value === 'high' ? 'bg-destructive/15 text-destructive' : value === 'medium' ? 'bg-yellow-500/15 text-yellow-600' : 'bg-primary/15 text-primary';
  return <Badge className={`text-[10px] border-0 ${cls}`}>{value}</Badge>;
}

function RiskDialog({ mode, risk, processes, steps, onClose, onRefresh }: {
  mode: 'add' | 'edit'; risk?: Risk; processes: BusinessProcess[]; steps: ProcessStep[]; onClose: () => void; onRefresh: () => void;
}) {
  const [processId, setProcessId] = useState(risk?.process_id || '');
  const [stepId, setStepId] = useState(risk?.step_id || '');
  const [desc, setDesc] = useState(risk?.description || '');
  const [likelihood, setLikelihood] = useState(risk?.likelihood || 'medium');
  const [impact, setImpact] = useState(risk?.impact || 'medium');

  const filteredSteps = steps.filter(s => s.process_id === processId && s.type === 'in-scope');

  const save = async () => {
    if (!desc.trim() || !stepId || !processId) { toast({ title: 'Fill all required fields', variant: 'destructive' }); return; }
    if (mode === 'edit' && risk) {
      await updateRisk(risk.id, { step_id: stepId, process_id: processId, description: desc.trim(), likelihood, impact });
      toast({ title: 'Risk updated' });
    } else {
      await insertRisk({ step_id: stepId, process_id: processId, description: desc.trim(), likelihood, impact });
      toast({ title: 'Risk added' });
    }
    onRefresh(); onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{mode === 'edit' ? 'Edit' : 'Add'} Risk Scenario</DialogTitle><DialogDescription>Link a risk to a specific process step.</DialogDescription></DialogHeader>
        <div className="grid gap-3 py-2">
          <Select value={processId} onValueChange={v => { setProcessId(v); setStepId(''); }}><SelectTrigger><SelectValue placeholder="Select process" /></SelectTrigger><SelectContent>{processes.map(p => <SelectItem key={p.id} value={p.id}>{p.process_name}</SelectItem>)}</SelectContent></Select>
          <Select value={stepId} onValueChange={setStepId}><SelectTrigger><SelectValue placeholder="Select step" /></SelectTrigger><SelectContent>{filteredSteps.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent></Select>
          <Textarea placeholder="Risk description" value={desc} onChange={e => setDesc(e.target.value)} rows={2} />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Likelihood</label>
              <Select value={likelihood} onValueChange={setLikelihood}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select>
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Impact</label>
              <Select value={impact} onValueChange={setImpact}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select>
            </div>
          </div>
          <Button onClick={save}>{mode === 'edit' ? 'Save Changes' : 'Add Risk'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
