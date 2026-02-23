import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Plus, Trash2, Pencil, Search, X } from 'lucide-react';
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
  insertControl, deleteControl, updateControl,
  type BusinessProcess, type ProcessStep, type Risk, type Control, type Client,
} from '@/lib/api';

export default function Controls() {
  const navigate = useNavigate();
  const [processes, setProcesses] = useState<BusinessProcess[]>([]);
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [controls, setControls] = useState<Control[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [addDialog, setAddDialog] = useState(false);
  const [editControl, setEditControl] = useState<Control | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterClient, setFilterClient] = useState('all');
  const [filterProcess, setFilterProcess] = useState('all');
  const [filterStep, setFilterStep] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterEffectiveness, setFilterEffectiveness] = useState('all');

  const reload = async () => {
    const [p, st, r, c, cl] = await Promise.all([fetchProcesses(), fetchSteps(), fetchRisks(), fetchAllControls(), fetchClients()]);
    setProcesses(p); setSteps(st); setRisks(r); setControls(c); setClients(cl);
  };
  useEffect(() => { reload(); }, []);

  const processMap: Record<string, BusinessProcess> = {};
  processes.forEach(p => processMap[p.id] = p);
  const riskMap: Record<string, Risk> = {};
  risks.forEach(r => riskMap[r.id] = r);
  const clientMap: Record<string, string> = {};
  clients.forEach(c => clientMap[c.id] = c.name);

  // Filter
  const filtered = controls.filter(c => {
    const risk = riskMap[c.risk_id];
    const proc = risk ? processMap[risk.process_id] : null;
    if (filterClient !== 'all' && proc?.client_id !== filterClient) return false;
    if (filterProcess !== 'all' && risk?.process_id !== filterProcess) return false;
    if (filterStep !== 'all' && risk?.step_id !== filterStep) return false;
    if (filterType !== 'all' && c.type !== filterType) return false;
    if (filterEffectiveness !== 'all' && c.effectiveness !== filterEffectiveness) return false;
    if (search) {
      const q = search.toLowerCase();
      const pName = proc?.process_name?.toLowerCase() || '';
      const rDesc = risk?.description?.toLowerCase() || '';
      if (!c.name.toLowerCase().includes(q) && !(c.description || '').toLowerCase().includes(q) && !pName.includes(q) && !rDesc.includes(q)) return false;
    }
    return true;
  });

  const stats = {
    total: controls.length,
    preventive: controls.filter(c => c.type === 'preventive').length,
    detective: controls.filter(c => c.type === 'detective').length,
    corrective: controls.filter(c => c.type === 'corrective').length,
  };

  const hasFilters = search || filterClient !== 'all' || filterProcess !== 'all' || filterStep !== 'all' || filterType !== 'all' || filterEffectiveness !== 'all';
  const clearFilters = () => { setSearch(''); setFilterClient('all'); setFilterProcess('all'); setFilterStep('all'); setFilterType('all'); setFilterEffectiveness('all'); };

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Controls</h1>
            <p className="text-sm text-muted-foreground mt-1">All mitigating controls linked to risk scenarios</p>
          </div>
        </div>
        <Button onClick={() => setAddDialog(true)}><Plus className="mr-2 h-4 w-4" /> Add Control</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'TOTAL CONTROLS', value: stats.total, icon: Shield },
          { label: 'PREVENTIVE', value: stats.preventive, icon: Shield },
          { label: 'DETECTIVE', value: stats.detective, icon: Shield },
          { label: 'CORRECTIVE', value: stats.corrective, icon: Shield },
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
              <Input placeholder="Search controls..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
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
                {steps.filter(s => filterProcess === 'all' || s.process_id === filterProcess).map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="preventive">Preventive</SelectItem>
                <SelectItem value="detective">Detective</SelectItem>
                <SelectItem value="corrective">Corrective</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterEffectiveness} onValueChange={setFilterEffectiveness}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Effectiveness" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Effectiveness</SelectItem>
                <SelectItem value="effective">Effective</SelectItem>
                <SelectItem value="partially-effective">Partial</SelectItem>
                <SelectItem value="ineffective">Ineffective</SelectItem>
              </SelectContent>
            </Select>
            {hasFilters && <Button variant="ghost" size="sm" onClick={clearFilters}><X className="h-3 w-3 mr-1" /> Clear</Button>}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">Controls Registry</CardTitle>
          <CardDescription>Showing {filtered.length} of {controls.length} controls</CardDescription>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="font-semibold text-xs uppercase">Client</TableHead>
              <TableHead className="font-semibold text-xs uppercase">Process</TableHead>
              <TableHead className="font-semibold text-xs uppercase">Linked Risk</TableHead>
              <TableHead className="font-semibold text-xs uppercase">Control Name</TableHead>
              <TableHead className="font-semibold text-xs uppercase">Description</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-center">Type</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-center">Effectiveness</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">{hasFilters ? 'No controls match filters.' : 'No controls defined yet.'}</TableCell></TableRow>
            ) : (
              filtered.map(c => {
                const risk = riskMap[c.risk_id];
                const proc = risk ? processMap[risk.process_id] : null;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm text-muted-foreground">{proc?.client_id ? clientMap[proc.client_id] || '—' : '—'}</TableCell>
                    <TableCell className="font-medium text-sm">{proc?.process_name || '—'}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate text-muted-foreground">{risk?.description || '—'}</TableCell>
                    <TableCell className="font-medium text-sm">{c.name}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{c.description || '—'}</TableCell>
                    <TableCell className="text-center"><TypeBadge value={c.type} /></TableCell>
                    <TableCell className="text-center"><EffectivenessBadge value={c.effectiveness} /></TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditControl(c)}><Pencil className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={async () => { await deleteControl(c.id); reload(); }}><Trash2 className="h-3 w-3" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {addDialog && <ControlDialog mode="add" risks={risks} processes={processes} onClose={() => setAddDialog(false)} onRefresh={reload} />}
      {editControl && <ControlDialog mode="edit" control={editControl} risks={risks} processes={processes} onClose={() => setEditControl(null)} onRefresh={reload} />}
    </div>
  );
}

function TypeBadge({ value }: { value: string }) {
  const cls = value === 'preventive' ? 'bg-primary/15 text-primary' : value === 'detective' ? 'bg-yellow-500/15 text-yellow-600' : 'bg-blue-500/15 text-blue-600';
  return <Badge className={`text-[10px] border-0 ${cls}`}>{value}</Badge>;
}

function EffectivenessBadge({ value }: { value: string }) {
  const cls = value === 'effective' ? 'bg-primary/15 text-primary' : value === 'partially-effective' ? 'bg-yellow-500/15 text-yellow-600' : 'bg-destructive/15 text-destructive';
  return <Badge className={`text-[10px] border-0 ${cls}`}>{value}</Badge>;
}

function ControlDialog({ mode, control, risks, processes, onClose, onRefresh }: {
  mode: 'add' | 'edit'; control?: Control; risks: Risk[]; processes: BusinessProcess[]; onClose: () => void; onRefresh: () => void;
}) {
  const [filterProcessId, setFilterProcessId] = useState(() => {
    if (control) {
      const risk = risks.find(r => r.id === control.risk_id);
      return risk?.process_id || '';
    }
    return '';
  });
  const [riskId, setRiskId] = useState(control?.risk_id || '');
  const [name, setName] = useState(control?.name || '');
  const [desc, setDesc] = useState(control?.description || '');
  const [type, setType] = useState(control?.type || 'preventive');
  const [effectiveness, setEffectiveness] = useState(control?.effectiveness || 'effective');

  const filteredRisks = risks.filter(r => !filterProcessId || r.process_id === filterProcessId);
  const processMap: Record<string, string> = {};
  processes.forEach(p => processMap[p.id] = p.process_name);

  const save = async () => {
    if (!name.trim() || !riskId) { toast({ title: 'Fill all required fields', variant: 'destructive' }); return; }
    if (mode === 'edit' && control) {
      await updateControl(control.id, { risk_id: riskId, name: name.trim(), description: desc || null, type, effectiveness });
      toast({ title: 'Control updated' });
    } else {
      await insertControl({ risk_id: riskId, name: name.trim(), description: desc || null, type, effectiveness });
      toast({ title: 'Control added' });
    }
    onRefresh(); onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{mode === 'edit' ? 'Edit' : 'Add'} Control</DialogTitle><DialogDescription>Link a control to a risk scenario.</DialogDescription></DialogHeader>
        <div className="grid gap-3 py-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Filter by Process (optional)</label>
            <Select value={filterProcessId} onValueChange={v => { setFilterProcessId(v); setRiskId(''); }}>
              <SelectTrigger><SelectValue placeholder="All processes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Processes</SelectItem>
                {processes.map(p => <SelectItem key={p.id} value={p.id}>{p.process_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Risk *</label>
            <Select value={riskId} onValueChange={setRiskId}>
              <SelectTrigger><SelectValue placeholder="Select risk" /></SelectTrigger>
              <SelectContent>
                {filteredRisks.map(r => (
                  <SelectItem key={r.id} value={r.id}>
                    <span className="text-muted-foreground text-xs">[{processMap[r.process_id] || '?'}]</span> {r.description.slice(0, 60)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input placeholder="Control name" value={name} onChange={e => setName(e.target.value)} />
          <Textarea placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} rows={2} />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Type</label>
              <Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="preventive">Preventive</SelectItem><SelectItem value="detective">Detective</SelectItem><SelectItem value="corrective">Corrective</SelectItem></SelectContent></Select>
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Effectiveness</label>
              <Select value={effectiveness} onValueChange={setEffectiveness}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="effective">Effective</SelectItem><SelectItem value="partially-effective">Partial</SelectItem><SelectItem value="ineffective">Ineffective</SelectItem></SelectContent></Select>
            </div>
          </div>
          <Button onClick={save}>{mode === 'edit' ? 'Save Changes' : 'Add Control'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
