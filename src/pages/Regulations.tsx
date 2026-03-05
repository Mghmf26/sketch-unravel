import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useColumnSettings, type ColumnDef } from '@/hooks/useColumnSettings';
import { ColumnSettingsDropdown } from '@/components/ColumnSettingsDropdown';

const REG_COLUMNS: ColumnDef[] = [
  { key: 'client', label: 'Client', defaultVisible: true, minWidth: 80 },
  { key: 'process', label: 'Process', defaultVisible: true, minWidth: 100 },
  { key: 'step', label: 'Step', defaultVisible: true, minWidth: 80 },
  { key: 'regulation', label: 'Regulation', defaultVisible: true, minWidth: 120 },
  { key: 'authority', label: 'Authority', defaultVisible: true, minWidth: 80 },
  { key: 'status', label: 'Status', defaultVisible: true, minWidth: 60 },
  { key: 'actions', label: 'Actions', defaultVisible: true, minWidth: 60 },
];
import { ArrowLeft, Scale, CheckCircle, AlertTriangle, XCircle, Plus, Trash2, Pencil, Search, X } from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
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
  fetchProcesses, fetchSteps, fetchRegulations, fetchClients,
  insertRegulation, deleteRegulation, updateRegulation,
  type BusinessProcess, type ProcessStep, type Regulation, type Client,
} from '@/lib/api';

export default function Regulations() {
  const colSettings = useColumnSettings('regulations', REG_COLUMNS);
  const navigate = useNavigate();
  const [processes, setProcesses] = useState<BusinessProcess[]>([]);
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [addDialog, setAddDialog] = useState(false);
  const [editReg, setEditReg] = useState<Regulation | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Regulation | null>(null);

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
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Regulations</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Regulatory compliance linked to process steps</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setAddDialog(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Regulation
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Regulations', value: stats.total, icon: Scale },
          { label: 'Compliant', value: stats.compliant, icon: CheckCircle },
          { label: 'Partial', value: stats.partial, icon: AlertTriangle },
          { label: 'Non-Compliant', value: stats.nonCompliant, icon: XCircle },
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
          <Input placeholder="Search regulations..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
        </div>
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder="All Clients" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterProcess} onValueChange={v => { setFilterProcess(v); setFilterStep('all'); }}>
          <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="All Processes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Processes</SelectItem>
            {processes.filter(p => filterClient === 'all' || p.client_id === filterClient).map(p => <SelectItem key={p.id} value={p.id}>{p.process_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStep} onValueChange={setFilterStep}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="All Steps" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Steps</SelectItem>
            {steps.filter(s => (filterProcess === 'all' || s.process_id === filterProcess) && s.type === 'in-scope').map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="compliant">Compliant</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="non-compliant">Non-Compliant</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs text-muted-foreground">
            <X className="h-3 w-3 mr-1" /> Clear
          </Button>
        )}
        <ColumnSettingsDropdown {...colSettings} />
      </div>

      <Card className="border shadow-sm overflow-hidden">
        <CardHeader className="py-3 px-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-semibold text-foreground uppercase tracking-wide">Regulatory Framework Registry</CardTitle>
            <span className="text-[10px] text-muted-foreground">{filtered.length} of {regulations.length}</span>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20">
                {colSettings.isVisible('client') && <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-3" style={{width: colSettings.getWidth('client')}}>Client</TableHead>}
                {colSettings.isVisible('process') && <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-3" style={{width: colSettings.getWidth('process')}}>Process</TableHead>}
                {colSettings.isVisible('step') && <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-3" style={{width: colSettings.getWidth('step')}}>Step</TableHead>}
                {colSettings.isVisible('regulation') && <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-3" style={{width: colSettings.getWidth('regulation')}}>Regulation</TableHead>}
                {colSettings.isVisible('authority') && <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-3" style={{width: colSettings.getWidth('authority')}}>Authority</TableHead>}
                {colSettings.isVisible('status') && <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-3 text-center" style={{width: colSettings.getWidth('status')}}>Status</TableHead>}
                {colSettings.isVisible('actions') && <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-3 text-right" style={{width: colSettings.getWidth('actions')}}>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colSettings.visibleColumns.length} className="text-center py-16 text-sm text-muted-foreground">
                    {hasFilters ? 'No regulations match the current filters.' : 'No regulations linked yet.'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(r => {
                  const proc = processMap[r.process_id];
                  return (
                    <TableRow key={r.id} className="group hover:bg-muted/30">
                      {colSettings.isVisible('client') && <TableCell className="text-xs text-muted-foreground py-2.5 px-3 whitespace-nowrap">{proc?.client_id ? clientMap[proc.client_id] || '—' : '—'}</TableCell>}
                      {colSettings.isVisible('process') && <TableCell className="text-xs font-medium text-foreground py-2.5 px-3 whitespace-nowrap">{proc?.process_name || '—'}</TableCell>}
                      {colSettings.isVisible('step') && <TableCell className="py-2.5 px-3"><Badge variant="outline" className="text-[10px] font-normal">{stepMap[r.step_id] || '—'}</Badge></TableCell>}
                      {colSettings.isVisible('regulation') && <TableCell className="py-2.5 px-3">
                        <div>
                          <p className="text-xs font-medium text-foreground">{r.name}</p>
                          {r.description && <p className="text-[10px] text-muted-foreground truncate max-w-[220px] mt-0.5">{r.description}</p>}
                        </div>
                      </TableCell>}
                      {colSettings.isVisible('authority') && <TableCell className="text-xs text-muted-foreground py-2.5 px-3 whitespace-nowrap">{r.authority || '—'}</TableCell>}
                      {colSettings.isVisible('status') && <TableCell className="text-center py-2.5 px-3"><ComplianceBadge value={r.compliance_status} /></TableCell>}
                      {colSettings.isVisible('actions') && <TableCell className="text-right py-2.5 px-3">
                        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditReg(r)}><Pencil className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-destructive" onClick={() => setConfirmDelete(r)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </TableCell>}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {addDialog && <RegulationDialog mode="add" processes={processes} steps={steps} onClose={() => setAddDialog(false)} onRefresh={reload} />}
      {editReg && <RegulationDialog mode="edit" regulation={editReg} processes={processes} steps={steps} onClose={() => setEditReg(null)} onRefresh={reload} />}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Regulation"
        description={`Are you sure you want to delete "${confirmDelete?.name || ''}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={async () => { if (confirmDelete) { await deleteRegulation(confirmDelete.id); reload(); } setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

function ComplianceBadge({ value }: { value: string }) {
  const cls = value === 'compliant' ? 'bg-primary/10 text-primary' : value === 'partial' ? 'bg-yellow-500/10 text-yellow-600' : 'bg-destructive/10 text-destructive';
  const label = value === 'non-compliant' ? 'Non-Compliant' : value;
  return <Badge className={`text-[10px] border-0 font-medium capitalize ${cls}`}>{label}</Badge>;
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
        <DialogHeader>
          <DialogTitle className="text-base">{mode === 'edit' ? 'Edit' : 'Add'} Regulation</DialogTitle>
          <DialogDescription className="text-xs">Link a regulation to a specific process step.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Process *</Label>
            <Select value={processId} onValueChange={v => { setProcessId(v); setStepId(''); }}><SelectTrigger className="text-xs"><SelectValue placeholder="Select process" /></SelectTrigger><SelectContent>{processes.map(p => <SelectItem key={p.id} value={p.id}>{p.process_name}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Step *</Label>
            <Select value={stepId} onValueChange={setStepId}><SelectTrigger className="text-xs"><SelectValue placeholder="Select step" /></SelectTrigger><SelectContent>{filteredSteps.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Regulation Name *</Label>
            <Input placeholder="e.g. SOX, GDPR, DORA" value={name} onChange={e => setName(e.target.value)} className="text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} rows={2} className="text-xs" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Authority</Label>
              <Input placeholder="Authority" value={authority} onChange={e => setAuthority(e.target.value)} className="text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={compliance} onValueChange={setCompliance}><SelectTrigger className="text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="compliant">Compliant</SelectItem><SelectItem value="partial">Partial</SelectItem><SelectItem value="non-compliant">Non-Compliant</SelectItem></SelectContent></Select>
            </div>
          </div>
          <Button size="sm" onClick={save} className="mt-1">{mode === 'edit' ? 'Save Changes' : 'Add Regulation'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
