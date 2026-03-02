import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Plus, Trash2, Pencil, Search, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
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

  const [search, setSearch] = useState('');
  const [filterClient, setFilterClient] = useState('all');
  const [filterProcess, setFilterProcess] = useState('all');
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

  const filtered = controls.filter(c => {
    const risk = riskMap[c.risk_id];
    const proc = risk ? processMap[risk.process_id] : null;
    if (filterClient !== 'all' && proc?.client_id !== filterClient) return false;
    if (filterProcess !== 'all' && risk?.process_id !== filterProcess) return false;
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

  const hasFilters = search || filterClient !== 'all' || filterProcess !== 'all' || filterType !== 'all' || filterEffectiveness !== 'all';
  const clearFilters = () => { setSearch(''); setFilterClient('all'); setFilterProcess('all'); setFilterType('all'); setFilterEffectiveness('all'); };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Controls</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Mitigating controls linked to risk scenarios</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setAddDialog(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Control
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Controls', value: stats.total, icon: Shield },
          { label: 'Preventive', value: stats.preventive, icon: Shield },
          { label: 'Detective', value: stats.detective, icon: Shield },
          { label: 'Corrective', value: stats.corrective, icon: Shield },
        ].map(s => (
          <Card key={s.label} className="border border-border/60 bg-card shadow-none">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-lg font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase mt-0.5">{s.label}</p>
              </div>
              <div className="h-8 w-8 rounded-lg bg-primary/8 flex items-center justify-center">
                <s.icon className="h-4 w-4 text-primary/70" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search controls..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
        </div>
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder="All Clients" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterProcess} onValueChange={setFilterProcess}>
          <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="All Processes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Processes</SelectItem>
            {processes.filter(p => filterClient === 'all' || p.client_id === filterClient).map(p => <SelectItem key={p.id} value={p.id}>{p.process_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="preventive">Preventive</SelectItem>
            <SelectItem value="detective">Detective</SelectItem>
            <SelectItem value="corrective">Corrective</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterEffectiveness} onValueChange={setFilterEffectiveness}>
          <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Effectiveness" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Effectiveness</SelectItem>
            <SelectItem value="effective">Effective</SelectItem>
            <SelectItem value="partially-effective">Partial</SelectItem>
            <SelectItem value="ineffective">Ineffective</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs text-muted-foreground">
            <X className="h-3 w-3 mr-1" /> Clear
          </Button>
        )}
      </div>

      <Card className="border shadow-sm overflow-hidden">
        <CardHeader className="py-3 px-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-semibold text-foreground uppercase tracking-wide">Controls Registry</CardTitle>
            <span className="text-[10px] text-muted-foreground">{filtered.length} of {controls.length}</span>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20">
                <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-3">Client</TableHead>
                <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-3">Process</TableHead>
                <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-3">Linked Risk</TableHead>
                <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-3">Control</TableHead>
                <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-3 text-center">Type</TableHead>
                <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-3 text-center">Effectiveness</TableHead>
                <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-3 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16 text-sm text-muted-foreground">
                    {hasFilters ? 'No controls match the current filters.' : 'No controls defined yet.'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(c => {
                  const risk = riskMap[c.risk_id];
                  const proc = risk ? processMap[risk.process_id] : null;
                  return (
                    <TableRow key={c.id} className="group hover:bg-muted/30">
                      <TableCell className="text-xs text-muted-foreground py-2.5 px-3 whitespace-nowrap">{proc?.client_id ? clientMap[proc.client_id] || '—' : '—'}</TableCell>
                      <TableCell className="text-xs font-medium text-foreground py-2.5 px-3 whitespace-nowrap">{proc?.process_name || '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground py-2.5 px-3 max-w-[200px] truncate">{risk?.description || '—'}</TableCell>
                      <TableCell className="py-2.5 px-3">
                        <div>
                          <p className="text-xs font-medium text-foreground">{c.name}</p>
                          {c.description && <p className="text-[10px] text-muted-foreground truncate max-w-[200px] mt-0.5">{c.description}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-center py-2.5 px-3"><TypeBadge value={c.type} /></TableCell>
                      <TableCell className="text-center py-2.5 px-3"><EffectivenessBadge value={c.effectiveness} /></TableCell>
                      <TableCell className="text-right py-2.5 px-3">
                        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditControl(c)}><Pencil className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-destructive" onClick={async () => { await deleteControl(c.id); reload(); }}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {addDialog && <ControlDialog mode="add" risks={risks} processes={processes} onClose={() => setAddDialog(false)} onRefresh={reload} />}
      {editControl && <ControlDialog mode="edit" control={editControl} risks={risks} processes={processes} onClose={() => setEditControl(null)} onRefresh={reload} />}
    </div>
  );
}

function TypeBadge({ value }: { value: string }) {
  const cls = value === 'preventive' ? 'bg-primary/10 text-primary' : value === 'detective' ? 'bg-yellow-500/10 text-yellow-600' : 'bg-blue-500/10 text-blue-600';
  return <Badge className={`text-[10px] border-0 font-medium capitalize ${cls}`}>{value}</Badge>;
}

function EffectivenessBadge({ value }: { value: string }) {
  const cls = value === 'effective' ? 'bg-primary/10 text-primary' : value === 'partially-effective' ? 'bg-yellow-500/10 text-yellow-600' : 'bg-destructive/10 text-destructive';
  const label = value === 'partially-effective' ? 'Partial' : value;
  return <Badge className={`text-[10px] border-0 font-medium capitalize ${cls}`}>{label}</Badge>;
}

function ControlDialog({ mode, control, risks, processes, onClose, onRefresh }: {
  mode: 'add' | 'edit'; control?: Control; risks: Risk[]; processes: BusinessProcess[]; onClose: () => void; onRefresh: () => void;
}) {
  const [filterProcessId, setFilterProcessId] = useState(() => {
    if (control) { const risk = risks.find(r => r.id === control.risk_id); return risk?.process_id || '__all__'; }
    return '__all__';
  });
  const [riskId, setRiskId] = useState(control?.risk_id || '');
  const [name, setName] = useState(control?.name || '');
  const [desc, setDesc] = useState(control?.description || '');
  const [type, setType] = useState(control?.type || 'preventive');
  const [effectiveness, setEffectiveness] = useState(control?.effectiveness || 'effective');

  const filteredRisks = risks.filter(r => filterProcessId === '__all__' || r.process_id === filterProcessId);
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
        <DialogHeader>
          <DialogTitle className="text-base">{mode === 'edit' ? 'Edit' : 'Add'} Control</DialogTitle>
          <DialogDescription className="text-xs">Link a control to a risk scenario.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Filter by Process</Label>
            <Select value={filterProcessId} onValueChange={v => { setFilterProcessId(v); setRiskId(''); }}>
              <SelectTrigger className="text-xs"><SelectValue placeholder="All processes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Processes</SelectItem>
                {processes.map(p => <SelectItem key={p.id} value={p.id}>{p.process_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Risk *</Label>
            <Select value={riskId} onValueChange={setRiskId}>
              <SelectTrigger className="text-xs"><SelectValue placeholder="Select risk" /></SelectTrigger>
              <SelectContent>
                {filteredRisks.map(r => (
                  <SelectItem key={r.id} value={r.id}>
                    <span className="text-muted-foreground text-[10px]">[{processMap[r.process_id] || '?'}]</span> {r.description.slice(0, 60)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Control Name *</Label>
            <Input placeholder="Control name" value={name} onChange={e => setName(e.target.value)} className="text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} rows={2} className="text-xs" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={type} onValueChange={setType}><SelectTrigger className="text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="preventive">Preventive</SelectItem><SelectItem value="detective">Detective</SelectItem><SelectItem value="corrective">Corrective</SelectItem></SelectContent></Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Effectiveness</Label>
              <Select value={effectiveness} onValueChange={setEffectiveness}><SelectTrigger className="text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="effective">Effective</SelectItem><SelectItem value="partially-effective">Partial</SelectItem><SelectItem value="ineffective">Ineffective</SelectItem></SelectContent></Select>
            </div>
          </div>
          <Button size="sm" onClick={save} className="mt-1">{mode === 'edit' ? 'Save Changes' : 'Add Control'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
