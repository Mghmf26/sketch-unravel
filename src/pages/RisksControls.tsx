import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useColumnSettings, type ColumnDef } from '@/hooks/useColumnSettings';
import { ColumnSettingsDropdown } from '@/components/ColumnSettingsDropdown';
import { PageHeader } from '@/components/PageHeader';

const RISK_COLUMNS: ColumnDef[] = [
  { key: 'client', label: 'Client', defaultVisible: true, minWidth: 80 },
  { key: 'description', label: 'Risk', defaultVisible: true, minWidth: 120 },
  { key: 'likelihood', label: 'Likelihood', defaultVisible: true, minWidth: 60 },
  { key: 'impact', label: 'Impact', defaultVisible: true, minWidth: 60 },
  { key: 'category', label: 'Category', defaultVisible: true, minWidth: 80 },
  { key: 'controls', label: '# Controls', defaultVisible: true, minWidth: 60 },
  { key: 'process', label: '# Process', defaultVisible: true, minWidth: 80 },
  { key: 'step', label: '# Step Links', defaultVisible: true, minWidth: 80 },
  { key: 'actions', label: 'Actions', defaultVisible: true, minWidth: 60 },
];
import { ArrowLeft, ShieldAlert, Shield, AlertTriangle, Plus, Trash2, Pencil, Search, X } from 'lucide-react';
import { StepTypeBadge } from '@/components/StepTypeBadge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  insertRisk, deleteRisk, updateRisk,
  type BusinessProcess, type ProcessStep, type Risk, type Control, type Client,
} from '@/lib/api';

export default function RisksControls() {
  const colSettings = useColumnSettings('risks', RISK_COLUMNS);
  const navigate = useNavigate();
  const [processes, setProcesses] = useState<BusinessProcess[]>([]);
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [controls, setControls] = useState<Control[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [addDialog, setAddDialog] = useState(false);
  const [editRisk, setEditRisk] = useState<Risk | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Risk | null>(null);

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
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
      <PageHeader
        title="Risks"
        description="Risk scenarios across all business processes"
        breadcrumbs={[
          { label: 'Portfolio', to: '/' },
          { label: 'Business Processes', to: '/processes' },
          { label: 'Risks' },
        ]}
        actions={
          <Button size="sm" onClick={() => setAddDialog(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add Risk
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total Risks', value: stats.total, icon: ShieldAlert },
          { label: 'High Severity', value: stats.high, icon: AlertTriangle },
          { label: 'Medium', value: stats.medium, icon: Shield },
          { label: 'Low', value: stats.low, icon: Shield },
          { label: 'Controls', value: stats.totalControls, icon: Shield },
        ].map(s => (
          <Card variant="elevated" key={s.label} className="border border-border/60">
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search risks..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
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
        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs text-muted-foreground">
            <X className="h-3 w-3 mr-1" /> Clear
          </Button>
        )}
        <ColumnSettingsDropdown {...colSettings} />
      </div>

      {/* Table */}
      <Card className="border shadow-sm overflow-hidden">
        <CardHeader className="py-3 px-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-semibold text-foreground uppercase tracking-wide">Risk Scenarios Registry</CardTitle>
            <span className="text-[10px] text-muted-foreground">{filtered.length} of {risks.length}</span>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20">
                {colSettings.isVisible('client') && <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-3" style={{width: colSettings.getWidth('client')}}>Client</TableHead>}
                {colSettings.isVisible('process') && <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-3" style={{width: colSettings.getWidth('process')}}>Process</TableHead>}
                {colSettings.isVisible('step') && <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-3" style={{width: colSettings.getWidth('step')}}>Step</TableHead>}
                {colSettings.isVisible('description') && <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-3" style={{width: colSettings.getWidth('description')}}>Risk</TableHead>}
                {colSettings.isVisible('likelihood') && <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-3 text-center" style={{width: colSettings.getWidth('likelihood')}}>Likelihood</TableHead>}
                {colSettings.isVisible('impact') && <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-3 text-center" style={{width: colSettings.getWidth('impact')}}>Impact</TableHead>}
                {colSettings.isVisible('controls') && <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-3 text-center" style={{width: colSettings.getWidth('controls')}}>Controls</TableHead>}
                {colSettings.isVisible('actions') && <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-3 text-right" style={{width: colSettings.getWidth('actions')}}>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colSettings.visibleColumns.length} className="text-center py-16 text-sm text-muted-foreground">
                    {hasFilters ? 'No risks match the current filters.' : 'No risk scenarios defined yet.'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(r => {
                  const proc = processMap[r.process_id];
                  const riskControls = controls.filter(c => c.risk_id === r.id);
                  return (
                    <TableRow key={r.id} className="group hover:bg-muted/30">
                      {colSettings.isVisible('client') && <TableCell className="text-xs text-muted-foreground py-2.5 px-3 whitespace-nowrap">{proc?.client_id ? clientMap[proc.client_id] || '—' : '—'}</TableCell>}
                      {colSettings.isVisible('process') && <TableCell className="text-xs font-medium text-foreground py-2.5 px-3 whitespace-nowrap">{proc?.process_name || '—'}</TableCell>}
                      {colSettings.isVisible('step') && <TableCell className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px] font-normal">{stepMap[r.step_id] || '—'}</Badge>
                          {(() => { const s = steps.find(s => s.id === r.step_id); return s?.step_type ? <StepTypeBadge stepType={s.step_type as any} size="xs" /> : null; })()}
                        </div>
                      </TableCell>}
                      {colSettings.isVisible('description') && <TableCell className="text-xs text-foreground/80 py-2.5 px-3 max-w-[280px] truncate">{r.description}</TableCell>}
                      {colSettings.isVisible('likelihood') && <TableCell className="text-center py-2.5 px-3"><SeverityBadge value={r.likelihood} /></TableCell>}
                      {colSettings.isVisible('impact') && <TableCell className="text-center py-2.5 px-3"><SeverityBadge value={r.impact} /></TableCell>}
                      {colSettings.isVisible('controls') && <TableCell className="text-center py-2.5 px-3">
                        <Badge variant="secondary" className="text-[10px] font-medium">{riskControls.length}</Badge>
                      </TableCell>}
                      {colSettings.isVisible('actions') && <TableCell className="text-right py-2.5 px-3">
                        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditRisk(r)}><Pencil className="h-3 w-3" /></Button>
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

      {addDialog && <RiskDialog mode="add" processes={processes} steps={steps} onClose={() => setAddDialog(false)} onRefresh={reload} />}
      {editRisk && <RiskDialog mode="edit" risk={editRisk} processes={processes} steps={steps} onClose={() => setEditRisk(null)} onRefresh={reload} />}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Risk"
        description={`Are you sure you want to delete this risk? "${confirmDelete?.description?.slice(0, 80) || ''}" This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={async () => { if (confirmDelete) { await deleteRisk(confirmDelete.id); reload(); } setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

function SeverityBadge({ value }: { value: string }) {
  const cls = value === 'high' ? 'bg-destructive/10 text-destructive' : value === 'medium' ? 'bg-yellow-500/10 text-yellow-600' : 'bg-primary/10 text-primary';
  return <Badge className={`text-[10px] border-0 font-medium capitalize ${cls}`}>{value}</Badge>;
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
        <DialogHeader>
          <DialogTitle className="text-base">{mode === 'edit' ? 'Edit' : 'Add'} Risk Scenario</DialogTitle>
          <DialogDescription className="text-xs">Link a risk to a specific process step.</DialogDescription>
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
            <Label className="text-xs">Risk Description *</Label>
            <Textarea placeholder="Describe the risk scenario..." value={desc} onChange={e => setDesc(e.target.value)} rows={2} className="text-xs" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Likelihood</Label>
              <Select value={likelihood} onValueChange={setLikelihood}><SelectTrigger className="text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Impact</Label>
              <Select value={impact} onValueChange={setImpact}><SelectTrigger className="text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select>
            </div>
          </div>
          <Button size="sm" onClick={save} className="mt-1">{mode === 'edit' ? 'Save Changes' : 'Add Risk'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
