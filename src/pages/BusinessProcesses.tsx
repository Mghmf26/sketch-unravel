import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Trash2, Plus, Search, FileSpreadsheet, AlertTriangle, Scale, AlertCircle, Cpu, ShieldAlert, Link2, Network, Layers, ArrowUpRight, Filter, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import {
  fetchProcesses, fetchClients, fetchSteps, fetchRisks, fetchAllControls, fetchIncidents, fetchRegulations, fetchMFQuestions,
  insertProcess, updateProcess, deleteProcess, insertStep,
  insertRisk, deleteRisk, insertControl, deleteControl,
  insertIncident, deleteIncident, insertRegulation, deleteRegulation,
  insertMFQuestion, deleteMFQuestion,
  type BusinessProcess, type ProcessStep, type Risk, type Control,
  type Incident, type Regulation, type MFQuestion, type Client,
} from '@/lib/api';

type DialogType = 'add' | 'link' | 'risks' | 'incidents' | 'regulations' | 'mfq' | null;

export default function BusinessProcesses() {
  const navigate = useNavigate();
  const [processes, setProcesses] = useState<BusinessProcess[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [controls, setControls] = useState<Control[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [mfQuestions, setMfQuestions] = useState<MFQuestion[]>([]);
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('all');
  const [dialog, setDialog] = useState<DialogType>(null);
  const [selectedProcess, setSelectedProcess] = useState<BusinessProcess | null>(null);

  const reload = useCallback(async () => {
    const [p, c, s, r, ctrl, i, reg, mfq] = await Promise.all([
      fetchProcesses(), fetchClients(), fetchSteps(), fetchRisks(), fetchAllControls(),
      fetchIncidents(), fetchRegulations(), fetchMFQuestions(),
    ]);
    setProcesses(p); setClients(c); setSteps(s); setRisks(r); setControls(ctrl);
    setIncidents(i); setRegulations(reg); setMfQuestions(mfq);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const clientMap = useMemo(() => {
    const m: Record<string, string> = {};
    clients.forEach(c => m[c.id] = c.name);
    return m;
  }, [clients]);

  const filtered = useMemo(() => {
    return processes.filter(p => {
      const matchesSearch = !search || p.process_name.toLowerCase().includes(search.toLowerCase());
      const matchesClient = clientFilter === 'all' || p.client_id === clientFilter;
      return matchesSearch && matchesClient;
    });
  }, [processes, search, clientFilter]);

  const handleDelete = async (id: string, name: string) => {
    await deleteProcess(id);
    toast({ title: 'Deleted', description: `"${name}" has been removed.` });
    reload();
  };

  const openDialog = (type: DialogType, process?: BusinessProcess) => {
    setSelectedProcess(process || null);
    setDialog(type);
  };

  const closeDialog = () => { setDialog(null); setSelectedProcess(null); };

  // Counts per process
  const countFor = (processId: string) => ({
    steps: steps.filter(s => s.process_id === processId).length,
    risks: risks.filter(r => r.process_id === processId).length,
    controls: controls.filter(c => risks.some(r => r.id === c.risk_id && r.process_id === processId)).length,
    incidents: incidents.filter(i => i.process_id === processId).length,
    regulations: regulations.filter(r => r.process_id === processId).length,
    mfq: mfQuestions.filter(q => q.process_id === processId),
  });

  // Summary stats
  const totalSteps = steps.length;
  const totalRisks = risks.length;
  const totalIncidents = incidents.length;
  const totalRegulations = regulations.length;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[95rem]">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Network className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Business Processes</h1>
              <p className="text-sm text-muted-foreground">Manage and analyze business processes across clients</p>
            </div>
          </div>
        </div>
        <Button onClick={() => navigate('/upload')} className="shadow-lg shadow-primary/20 gap-2">
          <Plus className="h-4 w-4" /> Add Process
        </Button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total Processes', value: processes.length, icon: Network, color: 'text-primary' },
          { label: 'Steps', value: totalSteps, icon: Layers, color: 'text-primary' },
          { label: 'Active Risks', value: totalRisks, icon: AlertTriangle, color: 'text-destructive' },
          { label: 'Open Incidents', value: totalIncidents, icon: AlertCircle, color: 'text-orange-600' },
          { label: 'Regulations', value: totalRegulations, icon: Scale, color: 'text-primary' },
        ].map((kpi) => (
          <Card key={kpi.label} className="border bg-card hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <kpi.icon className={`h-4.5 w-4.5 ${kpi.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold text-foreground leading-none">{kpi.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="border bg-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2 text-muted-foreground shrink-0">
              <Filter className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Filters</span>
            </div>
            <div className="flex-1 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input placeholder="Search processes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-background" />
              </div>
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="w-full sm:w-[200px] bg-background"><SelectValue placeholder="All Clients" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="text-xs text-muted-foreground self-center shrink-0">
              {filtered.length} of {processes.length} processes
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50 border-b-2 border-border">
                <TableHead className="font-bold text-[11px] text-foreground/70 tracking-wider uppercase py-3">Process Name</TableHead>
                <TableHead className="font-bold text-[11px] text-foreground/70 tracking-wider uppercase py-3">Client</TableHead>
                <TableHead className="font-bold text-[11px] text-foreground/70 tracking-wider uppercase py-3">Owner</TableHead>
                <TableHead className="font-bold text-[11px] text-foreground/70 tracking-wider uppercase py-3">Dept.</TableHead>
                <TableHead className="font-bold text-[11px] text-foreground/70 tracking-wider uppercase py-3 text-center">Steps</TableHead>
                <TableHead className="font-bold text-[11px] text-foreground/70 tracking-wider uppercase py-3 text-center">Risks</TableHead>
                <TableHead className="font-bold text-[11px] text-foreground/70 tracking-wider uppercase py-3 text-center">Controls</TableHead>
                <TableHead className="font-bold text-[11px] text-foreground/70 tracking-wider uppercase py-3 text-center">Incidents</TableHead>
                <TableHead className="font-bold text-[11px] text-foreground/70 tracking-wider uppercase py-3 text-center">Regs.</TableHead>
                <TableHead className="font-bold text-[11px] text-foreground/70 tracking-wider uppercase py-3 text-center">MF AI Potential</TableHead>
                <TableHead className="font-bold text-[11px] text-foreground/70 tracking-wider uppercase py-3 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-20">
                    <div className="flex flex-col items-center gap-4">
                      <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center">
                        <FileSpreadsheet className="h-7 w-7 text-muted-foreground/40" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">No processes found</p>
                        <p className="text-xs text-muted-foreground mt-1">Click "Add Process" to create your first business process</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => navigate('/upload')}>
                        <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Process
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(p => {
                  const c = countFor(p.id);
                  const mfqAvg = c.mfq.length > 0 ? Math.round(c.mfq.reduce((s, q) => s + Number(q.confidence), 0) / c.mfq.length) : 0;
                  return (
                    <TableRow key={p.id} className="group hover:bg-primary/[0.02] transition-colors border-b border-border/50">
                      <TableCell>
                        <button
                          onClick={() => navigate(`/process-view/${p.id}`)}
                          className="text-left group/name"
                        >
                          <span className="font-semibold text-foreground group-hover/name:text-primary transition-colors">{p.process_name}</span>
                          {p.description && (
                            <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5 max-w-[250px]">{p.description}</p>
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="text-sm">
                        {p.client_id && clientMap[p.client_id] ? (
                          <Badge variant="secondary" className="text-[10px] font-semibold">{clientMap[p.client_id]}</Badge>
                        ) : (
                          <button onClick={() => openDialog('link', p)} className="text-[11px] text-primary hover:underline cursor-pointer font-medium">+ Link</button>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{p.owner || '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{p.department || '—'}</TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center h-7 w-7 rounded-md bg-muted text-xs font-bold text-foreground">{c.steps}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <button onClick={() => openDialog('risks', p)} className="inline-flex items-center justify-center h-7 min-w-[28px] rounded-md bg-destructive/10 text-xs font-bold text-destructive hover:bg-destructive/20 transition-colors px-1.5 cursor-pointer">{c.risks}</button>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center h-7 w-7 rounded-md bg-primary/10 text-xs font-bold text-primary">{c.controls}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <button onClick={() => openDialog('incidents', p)} className="inline-flex items-center justify-center h-7 min-w-[28px] rounded-md bg-orange-500/10 text-xs font-bold text-orange-600 hover:bg-orange-500/20 transition-colors px-1.5 cursor-pointer">{c.incidents}</button>
                      </TableCell>
                      <TableCell className="text-center">
                        <button onClick={() => openDialog('regulations', p)} className="inline-flex items-center justify-center h-7 min-w-[28px] rounded-md bg-muted text-xs font-bold text-foreground hover:bg-muted/80 transition-colors px-1.5 cursor-pointer">{c.regulations}</button>
                      </TableCell>
                      <TableCell className="text-center">
                        <button onClick={() => openDialog('mfq', p)} className="cursor-pointer group/score">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs font-bold text-foreground">{mfqAvg}%</span>
                            <Progress value={mfqAvg} className="h-1 w-10" />
                          </div>
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                          <Tooltip><TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/process-view/${p.id}`)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger><TooltipContent>View</TooltipContent></Tooltip>
                          <Tooltip><TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog('link', p)}>
                              <Link2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger><TooltipContent>Link/Edit</TooltipContent></Tooltip>
                          <Tooltip><TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => handleDelete(p.id, p.process_name)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger><TooltipContent>Delete</TooltipContent></Tooltip>
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

      {/* Dialogs */}
      {dialog === 'add' && <AddProcessDialog clients={clients} onClose={closeDialog} onSave={reload} />}
      {dialog === 'link' && selectedProcess && <LinkClientDialog process={selectedProcess} clients={clients} onClose={closeDialog} onSave={reload} />}
      {dialog === 'risks' && selectedProcess && <RisksDialog process={selectedProcess} steps={steps.filter(s => s.process_id === selectedProcess.id)} risks={risks.filter(r => r.process_id === selectedProcess.id)} controls={controls} onClose={closeDialog} onRefresh={reload} />}
      {dialog === 'incidents' && selectedProcess && <IncidentsDialog process={selectedProcess} steps={steps.filter(s => s.process_id === selectedProcess.id)} items={incidents.filter(i => i.process_id === selectedProcess.id)} onClose={closeDialog} onRefresh={reload} />}
      {dialog === 'regulations' && selectedProcess && <RegulationsDialog process={selectedProcess} steps={steps.filter(s => s.process_id === selectedProcess.id)} items={regulations.filter(r => r.process_id === selectedProcess.id)} onClose={closeDialog} onRefresh={reload} />}
      {dialog === 'mfq' && selectedProcess && <MFQDialog process={selectedProcess} items={mfQuestions.filter(q => q.process_id === selectedProcess.id)} onClose={closeDialog} onRefresh={reload} />}
    </div>
  );
}

/* ---- Add Process Dialog ---- */
function AddProcessDialog({ clients, onClose, onSave }: { clients: Client[]; onClose: () => void; onSave: () => void }) {
  const [name, setName] = useState('');
  const [clientId, setClientId] = useState('');
  const [owner, setOwner] = useState('');
  const [department, setDepartment] = useState('');
  const [desc, setDesc] = useState('');

  const handleSave = async () => {
    if (!name.trim()) return;
    await insertProcess({ process_name: name.trim(), client_id: clientId || null, owner: owner || null, department: department || null, description: desc || null });
    toast({ title: 'Process created' });
    onSave();
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add Business Process</DialogTitle><DialogDescription>Create a new business process and link it to a client.</DialogDescription></DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5"><Label>Process Name *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Payroll Processing" /></div>
          <div className="grid gap-1.5">
            <Label>Client</Label>
            <Select value={clientId} onValueChange={setClientId}><SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger><SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>Owner</Label><Input value={owner} onChange={e => setOwner(e.target.value)} placeholder="Jane Smith" /></div>
            <div className="grid gap-1.5"><Label>Department</Label><Input value={department} onChange={e => setDepartment(e.target.value)} placeholder="Finance" /></div>
          </div>
          <div className="grid gap-1.5"><Label>Description</Label><Textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} placeholder="Brief description of the process" /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={handleSave}>Create</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---- Link Client Dialog ---- */
function LinkClientDialog({ process, clients, onClose, onSave }: { process: BusinessProcess; clients: Client[]; onClose: () => void; onSave: () => void }) {
  const [clientId, setClientId] = useState(process.client_id || '');
  const [owner, setOwner] = useState(process.owner || '');
  const [department, setDepartment] = useState(process.department || '');

  const handleSave = async () => {
    await updateProcess(process.id, { client_id: clientId || null, owner: owner || null, department: department || null });
    toast({ title: 'Process updated' });
    onSave();
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Link to Client</DialogTitle><DialogDescription>Associate "{process.process_name}" with a client, owner and department.</DialogDescription></DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>Client</Label>
            <Select value={clientId} onValueChange={setClientId}><SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger><SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="grid gap-1.5"><Label>Process Owner</Label><Input value={owner} onChange={e => setOwner(e.target.value)} placeholder="e.g. Jane Smith" /></div>
          <div className="grid gap-1.5"><Label>Department</Label><Input value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. Finance" /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={handleSave}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---- Risks Dialog (with controls per risk, linked to step) ---- */
function RisksDialog({ process, steps, risks, controls, onClose, onRefresh }: { process: BusinessProcess; steps: ProcessStep[]; risks: Risk[]; controls: Control[]; onClose: () => void; onRefresh: () => void }) {
  const [desc, setDesc] = useState('');
  const [stepId, setStepId] = useState('');
  const [likelihood, setLikelihood] = useState('medium');
  const [impact, setImpact] = useState('medium');
  // control adding
  const [addControlFor, setAddControlFor] = useState<string | null>(null);
  const [ctrlName, setCtrlName] = useState('');
  const [ctrlDesc, setCtrlDesc] = useState('');
  const [ctrlType, setCtrlType] = useState('preventive');

  const add = async () => {
    if (!desc.trim() || !stepId) { toast({ title: 'Please select a step and provide a description', variant: 'destructive' }); return; }
    await insertRisk({ step_id: stepId, process_id: process.id, description: desc.trim(), likelihood, impact });
    toast({ title: 'Risk added' });
    setDesc('');
    onRefresh();
  };

  const addCtrl = async () => {
    if (!ctrlName.trim() || !addControlFor) return;
    await insertControl({ risk_id: addControlFor, name: ctrlName.trim(), description: ctrlDesc || null, type: ctrlType });
    toast({ title: 'Control added' });
    setCtrlName(''); setCtrlDesc(''); setAddControlFor(null);
    onRefresh();
  };

  const stepMap: Record<string, string> = {};
  steps.forEach(s => stepMap[s.id] = s.label);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Risks & Controls — {process.process_name}</DialogTitle><DialogDescription>Each risk is linked to a step. Each risk can have multiple controls.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          {risks.map(r => (
            <div key={r.id} className="p-3 border rounded-lg bg-muted/30">
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-4 w-4 mt-0.5 text-destructive flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{r.description}</p>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">Step: {stepMap[r.step_id] || '—'}</Badge>
                    <Badge className={`text-[10px] border-0 ${r.likelihood === 'high' ? 'bg-destructive/15 text-destructive' : r.likelihood === 'medium' ? 'bg-yellow-500/15 text-yellow-600' : 'bg-primary/15 text-primary'}`}>L: {r.likelihood}</Badge>
                    <Badge className={`text-[10px] border-0 ${r.impact === 'high' ? 'bg-destructive/15 text-destructive' : r.impact === 'medium' ? 'bg-yellow-500/15 text-yellow-600' : 'bg-primary/15 text-primary'}`}>I: {r.impact}</Badge>
                  </div>
                  {/* Controls for this risk */}
                  <div className="mt-2 ml-2 space-y-1">
                    {controls.filter(c => c.risk_id === r.id).map(c => (
                      <div key={c.id} className="flex items-center gap-2 text-xs p-1.5 bg-background rounded border">
                        <span className="font-medium text-primary">⛨</span>
                        <span className="font-medium">{c.name}</span>
                        <Badge variant="outline" className="text-[9px]">{c.type}</Badge>
                        <Badge variant="outline" className="text-[9px]">{c.effectiveness}</Badge>
                        <Button variant="ghost" size="icon" className="h-5 w-5 ml-auto" onClick={async () => { await deleteControl(c.id); onRefresh(); }}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    ))}
                    {addControlFor === r.id ? (
                      <div className="flex gap-1.5 mt-1">
                        <Input placeholder="Control name" value={ctrlName} onChange={e => setCtrlName(e.target.value)} className="h-7 text-xs" />
                        <Select value={ctrlType} onValueChange={setCtrlType}><SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="preventive">Preventive</SelectItem><SelectItem value="detective">Detective</SelectItem><SelectItem value="corrective">Corrective</SelectItem></SelectContent></Select>
                        <Button size="sm" className="h-7 text-xs" onClick={addCtrl}>Add</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAddControlFor(null)}>✕</Button>
                      </div>
                    ) : (
                      <button onClick={() => setAddControlFor(r.id)} className="text-[11px] text-primary hover:underline cursor-pointer mt-1">+ Add Control</button>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={async () => { await deleteRisk(r.id); onRefresh(); }}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </div>
          ))}
        </div>
        <div className="grid gap-3 pt-3 border-t">
          <Select value={stepId} onValueChange={setStepId}>
            <SelectTrigger><SelectValue placeholder="Select step to link risk to" /></SelectTrigger>
            <SelectContent>{steps.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
          <Textarea placeholder="Risk description" value={desc} onChange={e => setDesc(e.target.value)} rows={2} />
          <div className="flex gap-2">
            <Select value={likelihood} onValueChange={setLikelihood}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select>
            <Select value={impact} onValueChange={setImpact}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select>
            <Button onClick={add}><Plus className="mr-1 h-3 w-3" /> Add Risk</Button>
          </div>
          {steps.length === 0 && <p className="text-xs text-muted-foreground">No steps added to this process yet. Add steps via Process Details or Diagram extraction.</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---- Incidents Dialog (linked to step) ---- */
function IncidentsDialog({ process, steps, items, onClose, onRefresh }: { process: BusinessProcess; steps: ProcessStep[]; items: Incident[]; onClose: () => void; onRefresh: () => void }) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [stepId, setStepId] = useState('');

  const stepMap: Record<string, string> = {};
  steps.forEach(s => stepMap[s.id] = s.label);

  const add = async () => {
    if (!title.trim() || !stepId) { toast({ title: 'Select a step and provide a title', variant: 'destructive' }); return; }
    await insertIncident({ step_id: stepId, process_id: process.id, title: title.trim(), description: desc || null, severity, status: 'open' });
    toast({ title: 'Incident added' });
    setTitle(''); setDesc('');
    onRefresh();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Incidents — {process.process_name}</DialogTitle><DialogDescription>Link incidents to specific steps.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          {items.map(i => (
            <div key={i.id} className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
              <AlertCircle className="h-4 w-4 mt-0.5 text-destructive flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{i.title}</p>
                <p className="text-xs text-muted-foreground">{i.description}</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px]">Step: {stepMap[i.step_id] || '—'}</Badge>
                  <Badge variant="outline" className="text-[10px]">{i.severity}</Badge>
                  <Badge variant="outline" className="text-[10px]">{i.status}</Badge>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={async () => { await deleteIncident(i.id); onRefresh(); }}><Trash2 className="h-3 w-3" /></Button>
            </div>
          ))}
        </div>
        <div className="grid gap-3 pt-3 border-t">
          <Select value={stepId} onValueChange={setStepId}><SelectTrigger><SelectValue placeholder="Link to step" /></SelectTrigger><SelectContent>{steps.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent></Select>
          <Input placeholder="Incident title" value={title} onChange={e => setTitle(e.target.value)} />
          <Textarea placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} rows={2} />
          <div className="flex gap-2">
            <Select value={severity} onValueChange={setSeverity}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select>
            <Button onClick={add}><Plus className="mr-1 h-3 w-3" /> Add</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---- Regulations Dialog (linked to step) ---- */
function RegulationsDialog({ process, steps, items, onClose, onRefresh }: { process: BusinessProcess; steps: ProcessStep[]; items: Regulation[]; onClose: () => void; onRefresh: () => void }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [authority, setAuthority] = useState('');
  const [compliance, setCompliance] = useState('compliant');
  const [stepId, setStepId] = useState('');

  const stepMap: Record<string, string> = {};
  steps.forEach(s => stepMap[s.id] = s.label);

  const add = async () => {
    if (!name.trim() || !stepId) { toast({ title: 'Select a step and provide a name', variant: 'destructive' }); return; }
    await insertRegulation({ step_id: stepId, process_id: process.id, name: name.trim(), description: desc || null, authority: authority || null, compliance_status: compliance });
    toast({ title: 'Regulation added' });
    setName(''); setDesc(''); setAuthority('');
    onRefresh();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Regulations — {process.process_name}</DialogTitle><DialogDescription>Link regulatory requirements to steps.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          {items.map(r => (
            <div key={r.id} className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
              <Scale className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">{r.description}</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px]">Step: {stepMap[r.step_id] || '—'}</Badge>
                  <Badge variant="outline" className="text-[10px]">{r.authority}</Badge>
                  <Badge className={`text-[10px] border-0 ${r.compliance_status === 'compliant' ? 'bg-primary/15 text-primary' : r.compliance_status === 'partial' ? 'bg-yellow-500/15 text-yellow-600' : 'bg-destructive/15 text-destructive'}`}>{r.compliance_status}</Badge>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={async () => { await deleteRegulation(r.id); onRefresh(); }}><Trash2 className="h-3 w-3" /></Button>
            </div>
          ))}
        </div>
        <div className="grid gap-3 pt-3 border-t">
          <Select value={stepId} onValueChange={setStepId}><SelectTrigger><SelectValue placeholder="Link to step" /></SelectTrigger><SelectContent>{steps.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent></Select>
          <Input placeholder="Regulation name (e.g. SOX, GDPR, DORA)" value={name} onChange={e => setName(e.target.value)} />
          <Textarea placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} rows={2} />
          <div className="flex gap-2">
            <Input placeholder="Authority" value={authority} onChange={e => setAuthority(e.target.value)} className="flex-1" />
            <Select value={compliance} onValueChange={setCompliance}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="compliant">Compliant</SelectItem><SelectItem value="partial">Partial</SelectItem><SelectItem value="non-compliant">Non-Compliant</SelectItem></SelectContent></Select>
          </div>
          <Button onClick={add}><Plus className="mr-1 h-3 w-3" /> Add</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---- MF AI Questions Dialog ---- */
function MFQDialog({ process, items, onClose, onRefresh }: { process: BusinessProcess; items: MFQuestion[]; onClose: () => void; onRefresh: () => void }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [confidence, setConfidence] = useState(80);
  const [category, setCategory] = useState('');

  const add = async () => {
    if (!question.trim()) return;
    await insertMFQuestion({ process_id: process.id, question: question.trim(), answer: answer || null, confidence, category: category || null });
    toast({ title: 'MF AI Question added' });
    setQuestion(''); setAnswer(''); setConfidence(80); setCategory('');
    onRefresh();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Mainframe AI Questions — {process.process_name}</DialogTitle><DialogDescription>AI-driven analysis questions related to mainframe data.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          {items.map(q => (
            <div key={q.id} className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
              <Cpu className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{q.question}</p>
                <p className="text-xs text-muted-foreground">{q.answer}</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px]">{q.category}</Badge>
                  <Badge className="bg-primary/15 text-primary border-0 text-[10px]">{q.confidence}%</Badge>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={async () => { await deleteMFQuestion(q.id); onRefresh(); }}><Trash2 className="h-3 w-3" /></Button>
            </div>
          ))}
        </div>
        <div className="grid gap-3 pt-3 border-t">
          <Input placeholder="Question about mainframe data" value={question} onChange={e => setQuestion(e.target.value)} />
          <Textarea placeholder="Answer / Analysis" value={answer} onChange={e => setAnswer(e.target.value)} rows={2} />
          <div className="flex gap-2">
            <Input placeholder="Category" value={category} onChange={e => setCategory(e.target.value)} className="flex-1" />
            <Input type="number" min={0} max={100} value={confidence} onChange={e => setConfidence(Number(e.target.value))} className="w-24" placeholder="%" />
          </div>
          <Button onClick={add}><Plus className="mr-1 h-3 w-3" /> Add</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
