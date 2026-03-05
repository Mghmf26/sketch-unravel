import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useColumnSettings, type ColumnDef } from '@/hooks/useColumnSettings';
import { ColumnSettingsDropdown } from '@/components/ColumnSettingsDropdown';

const INCIDENT_COLUMNS: ColumnDef[] = [
  { key: 'client', label: 'Client', defaultVisible: true, minWidth: 80 },
  { key: 'process', label: 'Process', defaultVisible: true, minWidth: 100 },
  { key: 'step', label: 'Step', defaultVisible: true, minWidth: 80 },
  { key: 'title', label: 'Title', defaultVisible: true, minWidth: 120 },
  { key: 'severity', label: 'Severity', defaultVisible: true, minWidth: 60 },
  { key: 'status', label: 'Status', defaultVisible: true, minWidth: 60 },
  { key: 'date', label: 'Date', defaultVisible: true, minWidth: 70 },
  { key: 'actions', label: 'Actions', defaultVisible: true, minWidth: 60 },
];
import { ArrowLeft, AlertCircle, CheckCircle, Search as SearchIcon, Plus, Trash2, X } from 'lucide-react';
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
  fetchProcesses, fetchSteps, fetchIncidents, fetchClients,
  insertIncident, deleteIncident, updateIncident,
  type BusinessProcess, type ProcessStep, type Incident, type Client,
} from '@/lib/api';

export default function Incidents() {
  const colSettings = useColumnSettings('incidents', INCIDENT_COLUMNS);
  const navigate = useNavigate();
  const [processes, setProcesses] = useState<BusinessProcess[]>([]);
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [addDialog, setAddDialog] = useState(false);

  const [search, setSearch] = useState('');
  const [filterClient, setFilterClient] = useState('all');
  const [filterProcess, setFilterProcess] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const reload = async () => {
    const [p, s, i, cl] = await Promise.all([fetchProcesses(), fetchSteps(), fetchIncidents(), fetchClients()]);
    setProcesses(p); setSteps(s); setIncidents(i); setClients(cl);
  };
  useEffect(() => { reload(); }, []);

  const processMap: Record<string, BusinessProcess> = {};
  processes.forEach(p => processMap[p.id] = p);
  const stepMap: Record<string, string> = {};
  steps.forEach(s => stepMap[s.id] = s.label);
  const clientMap: Record<string, string> = {};
  clients.forEach(c => clientMap[c.id] = c.name);

  const filtered = incidents.filter(i => {
    const proc = processMap[i.process_id];
    if (filterClient !== 'all' && proc?.client_id !== filterClient) return false;
    if (filterProcess !== 'all' && i.process_id !== filterProcess) return false;
    if (filterSeverity !== 'all' && i.severity !== filterSeverity) return false;
    if (filterStatus !== 'all' && i.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!i.title.toLowerCase().includes(q) && !(i.description || '').toLowerCase().includes(q) && !(proc?.process_name || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const stats = {
    total: incidents.length,
    open: incidents.filter(i => i.status === 'open').length,
    investigating: incidents.filter(i => i.status === 'investigating').length,
    resolved: incidents.filter(i => i.status === 'resolved' || i.status === 'closed').length,
  };

  const hasFilters = search || filterClient !== 'all' || filterProcess !== 'all' || filterSeverity !== 'all' || filterStatus !== 'all';
  const clearFilters = () => { setSearch(''); setFilterClient('all'); setFilterProcess('all'); setFilterSeverity('all'); setFilterStatus('all'); };

  const toggleStatus = async (inc: Incident) => {
    const next = inc.status === 'open' ? 'investigating' : inc.status === 'investigating' ? 'resolved' : 'open';
    await updateIncident(inc.id, { status: next });
    reload();
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Incidents</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Operational disruptions, breaches and processing failures</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setAddDialog(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Report Incident
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Incidents', value: stats.total, icon: AlertCircle },
          { label: 'Open', value: stats.open, icon: AlertCircle },
          { label: 'Investigating', value: stats.investigating, icon: SearchIcon },
          { label: 'Resolved', value: stats.resolved, icon: CheckCircle },
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
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search incidents..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
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
        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="investigating">Investigating</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
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
            <CardTitle className="text-xs font-semibold text-foreground uppercase tracking-wide">Incident Registry</CardTitle>
            <span className="text-[10px] text-muted-foreground">{filtered.length} of {incidents.length}</span>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20">
                {colSettings.isVisible('client') && <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-3" style={{width: colSettings.getWidth('client')}}>Client</TableHead>}
                {colSettings.isVisible('process') && <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-3" style={{width: colSettings.getWidth('process')}}>Process</TableHead>}
                {colSettings.isVisible('step') && <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-3" style={{width: colSettings.getWidth('step')}}>Step</TableHead>}
                {colSettings.isVisible('title') && <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-3" style={{width: colSettings.getWidth('title')}}>Title</TableHead>}
                {colSettings.isVisible('severity') && <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-3 text-center" style={{width: colSettings.getWidth('severity')}}>Severity</TableHead>}
                {colSettings.isVisible('status') && <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-3 text-center" style={{width: colSettings.getWidth('status')}}>Status</TableHead>}
                {colSettings.isVisible('date') && <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-3" style={{width: colSettings.getWidth('date')}}>Date</TableHead>}
                {colSettings.isVisible('actions') && <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-3 text-right" style={{width: colSettings.getWidth('actions')}}>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colSettings.visibleColumns.length} className="text-center py-16 text-sm text-muted-foreground">
                    {hasFilters ? 'No incidents match the current filters.' : 'No incidents reported yet.'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(i => {
                  const proc = processMap[i.process_id];
                  return (
                    <TableRow key={i.id} className="group hover:bg-muted/30">
                      {colSettings.isVisible('client') && <TableCell className="text-xs text-muted-foreground py-2.5 px-3 whitespace-nowrap">{proc?.client_id ? clientMap[proc.client_id] || '—' : '—'}</TableCell>}
                      {colSettings.isVisible('process') && <TableCell className="text-xs font-medium text-foreground py-2.5 px-3 whitespace-nowrap">{proc?.process_name || '—'}</TableCell>}
                      {colSettings.isVisible('step') && <TableCell className="py-2.5 px-3"><Badge variant="outline" className="text-[10px] font-normal">{stepMap[i.step_id] || '—'}</Badge></TableCell>}
                      {colSettings.isVisible('title') && <TableCell className="py-2.5 px-3">
                        <div>
                          <p className="text-xs font-medium text-foreground">{i.title}</p>
                          {i.description && <p className="text-[10px] text-muted-foreground truncate max-w-[200px] mt-0.5">{i.description}</p>}
                        </div>
                      </TableCell>}
                      {colSettings.isVisible('severity') && <TableCell className="text-center py-2.5 px-3">
                        <Badge className={`text-[10px] border-0 font-medium capitalize ${i.severity === 'critical' || i.severity === 'high' ? 'bg-destructive/10 text-destructive' : i.severity === 'medium' ? 'bg-yellow-500/10 text-yellow-600' : 'bg-primary/10 text-primary'}`}>{i.severity}</Badge>
                      </TableCell>}
                      {colSettings.isVisible('status') && <TableCell className="text-center py-2.5 px-3">
                        <button onClick={() => toggleStatus(i)} className="cursor-pointer">
                          <Badge variant="outline" className={`text-[10px] font-medium capitalize ${i.status === 'open' ? 'border-destructive/30 text-destructive' : i.status === 'investigating' ? 'border-yellow-500/30 text-yellow-600' : 'border-primary/30 text-primary'}`}>{i.status}</Badge>
                        </button>
                      </TableCell>}
                      {colSettings.isVisible('date') && <TableCell className="text-xs text-muted-foreground py-2.5 px-3 whitespace-nowrap">{new Date(i.date).toLocaleDateString()}</TableCell>}
                      {colSettings.isVisible('actions') && <TableCell className="text-right py-2.5 px-3">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-destructive" onClick={async () => { await deleteIncident(i.id); reload(); }}><Trash2 className="h-3 w-3" /></Button>
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

  const filteredSteps = steps.filter(s => s.process_id === processId && s.type === 'in-scope');

  const add = async () => {
    if (!title.trim() || !stepId || !processId) { toast({ title: 'Fill all required fields', variant: 'destructive' }); return; }
    await insertIncident({ step_id: stepId, process_id: processId, title: title.trim(), description: desc || null, severity, status: 'open' });
    toast({ title: 'Incident reported' });
    onRefresh(); onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Report Incident</DialogTitle>
          <DialogDescription className="text-xs">Link an incident to a specific process step.</DialogDescription>
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
            <Label className="text-xs">Title *</Label>
            <Input placeholder="Incident title" value={title} onChange={e => setTitle(e.target.value)} className="text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea placeholder="Describe the incident..." value={desc} onChange={e => setDesc(e.target.value)} rows={2} className="text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Severity</Label>
            <Select value={severity} onValueChange={setSeverity}><SelectTrigger className="text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select>
          </div>
          <Button size="sm" onClick={add} className="mt-1">Report Incident</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
