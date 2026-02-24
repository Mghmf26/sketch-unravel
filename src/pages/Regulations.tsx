import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Scale, CheckCircle, AlertTriangle, XCircle, Plus, Trash2, Pencil, Search, X } from 'lucide-react';
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
  fetchProcesses, fetchSteps, fetchRegulations, fetchClients,
  insertRegulation, deleteRegulation, updateRegulation,
  type BusinessProcess, type ProcessStep, type Regulation, type Client,
} from '@/lib/api';

export default function Regulations() {
  const navigate = useNavigate();
  const [processes, setProcesses] = useState<BusinessProcess[]>([]);
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [addDialog, setAddDialog] = useState(false);
  const [editReg, setEditReg] = useState<Regulation | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterClient, setFilterClient] = useState('all');
  const [filterProcess, setFilterProcess] = useState('all');
  const [filterStep, setFilterStep] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const reload = async () => {
    const [p, s, r, cl] = await Promise.all([fetchProcesses(), fetchSteps(), fetchRegulations(), fetchClients()]);
    setProcesses(p); setSteps(s); setRegulations(r); setClients(cl);
  };
  useEffect(() => { reload(); }, []);

  const processMap: Record<string, BusinessProcess> = {};
  processes.forEach(p => processMap[p.id] = p);
  const stepMap: Record<string, string> = {};
  steps.forEach(s => stepMap[s.id] = s.label);
  const clientMap: Record<string, string> = {};
  clients.forEach(c => clientMap[c.id] = c.name);

  const filtered = regulations.filter(r => {
    const proc = processMap[r.process_id];
    if (filterClient !== 'all' && proc?.client_id !== filterClient) return false;
    if (filterProcess !== 'all' && r.process_id !== filterProcess) return false;
    if (filterStep !== 'all' && r.step_id !== filterStep) return false;
    if (filterStatus !== 'all' && r.compliance_status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      const pName = proc?.process_name?.toLowerCase() || '';
      if (!r.name.toLowerCase().includes(q) && !(r.description || '').toLowerCase().includes(q) && !(r.authority || '').toLowerCase().includes(q) && !pName.includes(q)) return false;
    }
    return true;
  });

  const stats = {
    total: regulations.length,
    compliant: regulations.filter(r => r.compliance_status === 'compliant').length,
    partial: regulations.filter(r => r.compliance_status === 'partial').length,
    nonCompliant: regulations.filter(r => r.compliance_status === 'non-compliant').length,
  };

  const hasFilters = search || filterClient !== 'all' || filterProcess !== 'all' || filterStep !== 'all' || filterStatus !== 'all';
  const clearFilters = () => { setSearch(''); setFilterClient('all'); setFilterProcess('all'); setFilterStep('all'); setFilterStatus('all'); };

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Regulations</h1>
            <p className="text-sm text-muted-foreground mt-1">Regulatory compliance linked to process steps</p>
          </div>
        </div>
        <Button onClick={() => setAddDialog(true)}><Plus className="mr-2 h-4 w-4" /> Add Regulation</Button>
      </div>

      {/* Stats */}
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

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search regulations..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
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
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="compliant">Compliant</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="non-compliant">Non-Compliant</SelectItem>
              </SelectContent>
            </Select>
            {hasFilters && <Button variant="ghost" size="sm" onClick={clearFilters}><X className="h-3 w-3 mr-1" /> Clear</Button>}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">Regulatory Framework Registry</CardTitle>
          <CardDescription>Showing {filtered.length} of {regulations.length} regulations</CardDescription>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="font-semibold text-xs uppercase">Client</TableHead>
              <TableHead className="font-semibold text-xs uppercase">Process</TableHead>
              <TableHead className="font-semibold text-xs uppercase">Step</TableHead>
              <TableHead className="font-semibold text-xs uppercase">Regulation</TableHead>
              <TableHead className="font-semibold text-xs uppercase">Authority</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-center">Status</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">{hasFilters ? 'No regulations match filters.' : 'No regulations linked yet.'}</TableCell></TableRow>
            ) : (
              filtered.map(r => {
                const proc = processMap[r.process_id];
                return (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm text-muted-foreground">{proc?.client_id ? clientMap[proc.client_id] || '—' : '—'}</TableCell>
                    <TableCell className="font-medium text-sm">{proc?.process_name || '—'}</TableCell>
                    <TableCell className="text-sm"><Badge variant="outline" className="text-[10px]">{stepMap[r.step_id] || '—'}</Badge></TableCell>
                    <TableCell className="font-medium text-sm">{r.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.authority || '—'}</TableCell>
                    <TableCell className="text-center"><ComplianceBadge value={r.compliance_status} /></TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditReg(r)}><Pencil className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={async () => { await deleteRegulation(r.id); reload(); }}><Trash2 className="h-3 w-3" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {addDialog && <RegulationDialog mode="add" processes={processes} steps={steps} onClose={() => setAddDialog(false)} onRefresh={reload} />}
      {editReg && <RegulationDialog mode="edit" regulation={editReg} processes={processes} steps={steps} onClose={() => setEditReg(null)} onRefresh={reload} />}
    </div>
  );
}

function ComplianceBadge({ value }: { value: string }) {
  const cls = value === 'compliant' ? 'bg-primary/15 text-primary' : value === 'partial' ? 'bg-yellow-500/15 text-yellow-600' : 'bg-destructive/15 text-destructive';
  return <Badge className={`text-[10px] border-0 ${cls}`}>{value}</Badge>;
}

function RegulationDialog({ mode, regulation, processes, steps, onClose, onRefresh }: {
  mode: 'add' | 'edit'; regulation?: Regulation; processes: BusinessProcess[]; steps: ProcessStep[]; onClose: () => void; onRefresh: () => void;
}) {
  const [processId, setProcessId] = useState(regulation?.process_id || '');
  const [stepId, setStepId] = useState(regulation?.step_id || '');
  const [name, setName] = useState(regulation?.name || '');
  const [desc, setDesc] = useState(regulation?.description || '');
  const [authority, setAuthority] = useState(regulation?.authority || '');
  const [compliance, setCompliance] = useState(regulation?.compliance_status || 'compliant');

  const filteredSteps = steps.filter(s => s.process_id === processId && s.type === 'in-scope');

  const save = async () => {
    if (!name.trim() || !stepId || !processId) { toast({ title: 'Fill all required fields', variant: 'destructive' }); return; }
    if (mode === 'edit' && regulation) {
      await updateRegulation(regulation.id, { step_id: stepId, process_id: processId, name: name.trim(), description: desc || null, authority: authority || null, compliance_status: compliance });
      toast({ title: 'Regulation updated' });
    } else {
      await insertRegulation({ step_id: stepId, process_id: processId, name: name.trim(), description: desc || null, authority: authority || null, compliance_status: compliance });
      toast({ title: 'Regulation added' });
    }
    onRefresh(); onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{mode === 'edit' ? 'Edit' : 'Add'} Regulation</DialogTitle><DialogDescription>Link a regulation to a specific process step.</DialogDescription></DialogHeader>
        <div className="grid gap-3 py-2">
          <Select value={processId} onValueChange={v => { setProcessId(v); setStepId(''); }}><SelectTrigger><SelectValue placeholder="Select process" /></SelectTrigger><SelectContent>{processes.map(p => <SelectItem key={p.id} value={p.id}>{p.process_name}</SelectItem>)}</SelectContent></Select>
          <Select value={stepId} onValueChange={setStepId}><SelectTrigger><SelectValue placeholder="Select step" /></SelectTrigger><SelectContent>{filteredSteps.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent></Select>
          <Input placeholder="Regulation name (e.g. SOX, GDPR, DORA)" value={name} onChange={e => setName(e.target.value)} />
          <Textarea placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} rows={2} />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Authority</label>
              <Input placeholder="Authority" value={authority} onChange={e => setAuthority(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Status</label>
              <Select value={compliance} onValueChange={setCompliance}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="compliant">Compliant</SelectItem><SelectItem value="partial">Partial</SelectItem><SelectItem value="non-compliant">Non-Compliant</SelectItem></SelectContent></Select>
            </div>
          </div>
          <Button onClick={save}>{mode === 'edit' ? 'Save Changes' : 'Add Regulation'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
