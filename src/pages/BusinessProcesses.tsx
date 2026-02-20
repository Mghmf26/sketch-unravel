import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Pencil, Trash2, Plus, Search, FileSpreadsheet, AlertTriangle, Scale, AlertCircle, Cpu, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { loadDiagrams, deleteDiagram, saveDiagram } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';
import type { EPCDiagram, RiskScenario, Incident, Regulation, MFQuestion } from '@/types/epc';
import { exportToExcel } from '@/lib/excel-export';
import { toast } from '@/hooks/use-toast';

interface Client {
  id: string;
  name: string;
}

export default function BusinessProcesses() {
  const navigate = useNavigate();
  const [diagrams, setDiagrams] = useState<EPCDiagram[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');

  // Detail dialogs
  const [detailDialog, setDetailDialog] = useState<{ type: 'incidents' | 'regulations' | 'mfq' | 'risks' | 'link'; diagram: EPCDiagram } | null>(null);

  useEffect(() => {
    setDiagrams(loadDiagrams());
    supabase.from('clients').select('id, name').then(({ data }) => setClients(data || []));
  }, []);

  const clientMap = useMemo(() => {
    const m: Record<string, string> = {};
    clients.forEach((c) => (m[c.id] = c.name));
    return m;
  }, [clients]);

  const filtered = useMemo(() => {
    return diagrams.filter((d) => {
      const matchesSearch = !search || d.processName.toLowerCase().includes(search.toLowerCase()) || d.processId.toLowerCase().includes(search.toLowerCase());
      const matchesClient = clientFilter === 'all' || d.clientId === clientFilter;
      return matchesSearch && matchesClient;
    });
  }, [diagrams, search, clientFilter]);

  const handleDelete = (id: string, name: string) => {
    deleteDiagram(id);
    setDiagrams(loadDiagrams());
    toast({ title: 'Deleted', description: `"${name}" has been removed.` });
  };

  const handleLinkSave = (diagram: EPCDiagram, clientId: string, owner: string, department: string) => {
    const updated = { ...diagram, clientId, owner, department };
    saveDiagram(updated);
    setDiagrams(loadDiagrams());
    setDetailDialog(null);
    toast({ title: 'Process linked', description: 'Client, owner and department updated.' });
  };

  return (
    <div className="p-8 space-y-6 max-w-[95rem]">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Business Processes</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and analyze business processes across clients</p>
        </div>
        <Button onClick={() => navigate('/upload')} className="bg-primary hover:bg-primary/90 shadow-md">
          <Plus className="mr-2 h-4 w-4" /> Add New Business Process
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground tracking-wide uppercase mb-1.5 block">Client</label>
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="bg-background"><SelectValue placeholder="All Clients" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground tracking-wide uppercase mb-1.5 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-background"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground tracking-wide uppercase mb-1.5 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input placeholder="Search processes..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-background" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="font-semibold text-xs text-muted-foreground tracking-wide uppercase">Process Name</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground tracking-wide uppercase">Client</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground tracking-wide uppercase">Owner</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground tracking-wide uppercase">Department</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground tracking-wide uppercase text-center">Steps</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground tracking-wide uppercase text-center">Risks</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground tracking-wide uppercase text-center">Controls</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground tracking-wide uppercase text-center">Incidents</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground tracking-wide uppercase text-center">Regulations</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground tracking-wide uppercase text-center">MF AI Q (%)</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground tracking-wide uppercase text-center">Risk Scenarios</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground tracking-wide uppercase text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                        <FileSpreadsheet className="h-5 w-5 text-muted-foreground/50" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">No processes found</p>
                        <p className="text-xs text-muted-foreground/60 mt-0.5">Click "Add New Business Process" to get started</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((d) => {
                  const risks = d.nodes.filter((n) => n.type === 'event').length;
                  const controls = d.nodes.filter((n) => n.type === 'xor').length;
                  const incidentCount = d.incidents?.length || 0;
                  const regulationCount = d.regulations?.length || 0;
                  const mfqCount = d.mfQuestions?.length || 0;
                  const mfqAvg = mfqCount > 0 ? Math.round((d.mfQuestions!.reduce((s, q) => s + q.confidence, 0) / mfqCount)) : 0;
                  const riskScenarioCount = d.riskScenarios?.length || 0;

                  return (
                    <TableRow key={d.id} className="group hover:bg-primary/[0.03] transition-colors">
                      <TableCell className="font-medium text-foreground">{d.processName}</TableCell>
                      <TableCell className="text-sm">
                        {d.clientId && clientMap[d.clientId] ? (
                          <Badge variant="outline" className="text-[10px] font-medium">{clientMap[d.clientId]}</Badge>
                        ) : (
                          <button onClick={() => setDetailDialog({ type: 'link', diagram: d })} className="text-xs text-primary hover:underline cursor-pointer">Link client</button>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{d.owner || '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{d.department || '—'}</TableCell>
                      <TableCell className="text-center font-medium">{d.nodes.length}</TableCell>
                      <TableCell className="text-center font-medium">{risks}</TableCell>
                      <TableCell className="text-center font-medium">{controls}</TableCell>
                      <TableCell className="text-center">
                        <button onClick={() => setDetailDialog({ type: 'incidents', diagram: d })} className="text-sm font-medium text-primary hover:underline cursor-pointer">{incidentCount}</button>
                      </TableCell>
                      <TableCell className="text-center">
                        <button onClick={() => setDetailDialog({ type: 'regulations', diagram: d })} className="text-sm font-medium text-primary hover:underline cursor-pointer">{regulationCount}</button>
                      </TableCell>
                      <TableCell className="text-center">
                        <button onClick={() => setDetailDialog({ type: 'mfq', diagram: d })} className="text-sm font-medium text-primary hover:underline cursor-pointer">{mfqAvg}%</button>
                      </TableCell>
                      <TableCell className="text-center">
                        <button onClick={() => setDetailDialog({ type: 'risks', diagram: d })} className="text-sm font-medium text-primary hover:underline cursor-pointer">{riskScenarioCount}</button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/view/${d.id}`)}><Eye className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>View</TooltipContent></Tooltip>
                          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/edit/${d.id}`)}><Pencil className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip>
                          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => exportToExcel(d)}><FileSpreadsheet className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Export</TooltipContent></Tooltip>
                          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => handleDelete(d.id, d.processName)}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Delete</TooltipContent></Tooltip>
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

      {/* Detail Dialogs */}
      {detailDialog?.type === 'link' && (
        <LinkClientDialog
          diagram={detailDialog.diagram}
          clients={clients}
          onClose={() => setDetailDialog(null)}
          onSave={handleLinkSave}
        />
      )}
      {detailDialog?.type === 'incidents' && (
        <IncidentsDialog diagram={detailDialog.diagram} onClose={() => setDetailDialog(null)} onUpdate={(d) => { saveDiagram(d); setDiagrams(loadDiagrams()); }} />
      )}
      {detailDialog?.type === 'regulations' && (
        <RegulationsDialog diagram={detailDialog.diagram} onClose={() => setDetailDialog(null)} onUpdate={(d) => { saveDiagram(d); setDiagrams(loadDiagrams()); }} />
      )}
      {detailDialog?.type === 'mfq' && (
        <MFQDialog diagram={detailDialog.diagram} onClose={() => setDetailDialog(null)} onUpdate={(d) => { saveDiagram(d); setDiagrams(loadDiagrams()); }} />
      )}
      {detailDialog?.type === 'risks' && (
        <RiskScenariosDialog diagram={detailDialog.diagram} onClose={() => setDetailDialog(null)} onUpdate={(d) => { saveDiagram(d); setDiagrams(loadDiagrams()); }} />
      )}
    </div>
  );
}

/* ---------- Sub-dialogs ---------- */

function LinkClientDialog({ diagram, clients, onClose, onSave }: { diagram: EPCDiagram; clients: Client[]; onClose: () => void; onSave: (d: EPCDiagram, clientId: string, owner: string, dept: string) => void }) {
  const [clientId, setClientId] = useState(diagram.clientId || '');
  const [owner, setOwner] = useState(diagram.owner || '');
  const [department, setDepartment] = useState(diagram.department || '');
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link to Client</DialogTitle>
          <DialogDescription>Associate "{diagram.processName}" with a client, owner and department.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>Client</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5"><Label>Process Owner</Label><Input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="e.g. Jane Smith" /></div>
          <div className="grid gap-1.5"><Label>Department</Label><Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Finance" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="bg-primary hover:bg-primary/90" onClick={() => onSave(diagram, clientId, owner, department)}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function IncidentsDialog({ diagram, onClose, onUpdate }: { diagram: EPCDiagram; onClose: () => void; onUpdate: (d: EPCDiagram) => void }) {
  const [items, setItems] = useState<Incident[]>(diagram.incidents || []);
  const [title, setTitle] = useState(''); const [desc, setDesc] = useState(''); const [severity, setSeverity] = useState<Incident['severity']>('medium');
  const add = () => {
    if (!title.trim()) return;
    const newItem: Incident = { id: crypto.randomUUID(), title: title.trim(), description: desc, severity, status: 'open', date: new Date().toISOString() };
    const updated = [...items, newItem];
    setItems(updated);
    onUpdate({ ...diagram, incidents: updated });
    setTitle(''); setDesc('');
    toast({ title: 'Incident added' });
  };
  const remove = (id: string) => { const updated = items.filter((i) => i.id !== id); setItems(updated); onUpdate({ ...diagram, incidents: updated }); };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Incidents — {diagram.processName}</DialogTitle><DialogDescription>Manage incidents linked to this business process.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          {items.map((i) => (
            <div key={i.id} className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
              <AlertCircle className="h-4 w-4 mt-0.5 text-destructive flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{i.title}</p>
                <p className="text-xs text-muted-foreground">{i.description}</p>
                <Badge variant="outline" className="mt-1 text-[10px]">{i.severity}</Badge>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(i.id)}><Trash2 className="h-3 w-3" /></Button>
            </div>
          ))}
        </div>
        <div className="grid gap-3 pt-3 border-t">
          <Input placeholder="Incident title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} />
          <div className="flex gap-2">
            <Select value={severity} onValueChange={(v) => setSeverity(v as Incident['severity'])}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select>
            <Button onClick={add} className="bg-primary hover:bg-primary/90"><Plus className="mr-1 h-3 w-3" /> Add</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RegulationsDialog({ diagram, onClose, onUpdate }: { diagram: EPCDiagram; onClose: () => void; onUpdate: (d: EPCDiagram) => void }) {
  const [items, setItems] = useState<Regulation[]>(diagram.regulations || []);
  const [name, setName] = useState(''); const [desc, setDesc] = useState(''); const [authority, setAuthority] = useState(''); const [compliance, setCompliance] = useState<Regulation['complianceStatus']>('compliant');
  const add = () => {
    if (!name.trim()) return;
    const newItem: Regulation = { id: crypto.randomUUID(), name: name.trim(), description: desc, authority, complianceStatus: compliance };
    const updated = [...items, newItem];
    setItems(updated);
    onUpdate({ ...diagram, regulations: updated });
    setName(''); setDesc(''); setAuthority('');
    toast({ title: 'Regulation added' });
  };
  const remove = (id: string) => { const updated = items.filter((i) => i.id !== id); setItems(updated); onUpdate({ ...diagram, regulations: updated }); };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Regulations — {diagram.processName}</DialogTitle><DialogDescription>Manage regulatory requirements for this process.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          {items.map((i) => (
            <div key={i.id} className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
              <Scale className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{i.name}</p>
                <p className="text-xs text-muted-foreground">{i.description}</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px]">{i.authority}</Badge>
                  <Badge className={`text-[10px] border-0 ${i.complianceStatus === 'compliant' ? 'bg-primary/15 text-primary' : i.complianceStatus === 'partial' ? 'bg-yellow-500/15 text-yellow-600' : 'bg-destructive/15 text-destructive'}`}>{i.complianceStatus}</Badge>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(i.id)}><Trash2 className="h-3 w-3" /></Button>
            </div>
          ))}
        </div>
        <div className="grid gap-3 pt-3 border-t">
          <Input placeholder="Regulation name (e.g. SOX, GDPR)" value={name} onChange={(e) => setName(e.target.value)} />
          <Textarea placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} />
          <div className="flex gap-2">
            <Input placeholder="Authority" value={authority} onChange={(e) => setAuthority(e.target.value)} className="flex-1" />
            <Select value={compliance} onValueChange={(v) => setCompliance(v as Regulation['complianceStatus'])}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="compliant">Compliant</SelectItem><SelectItem value="partial">Partial</SelectItem><SelectItem value="non-compliant">Non-Compliant</SelectItem></SelectContent></Select>
          </div>
          <Button onClick={add} className="bg-primary hover:bg-primary/90"><Plus className="mr-1 h-3 w-3" /> Add</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MFQDialog({ diagram, onClose, onUpdate }: { diagram: EPCDiagram; onClose: () => void; onUpdate: (d: EPCDiagram) => void }) {
  const [items, setItems] = useState<MFQuestion[]>(diagram.mfQuestions || []);
  const [question, setQuestion] = useState(''); const [answer, setAnswer] = useState(''); const [confidence, setConfidence] = useState(80); const [category, setCategory] = useState('');
  const add = () => {
    if (!question.trim()) return;
    const newItem: MFQuestion = { id: crypto.randomUUID(), question: question.trim(), answer, confidence, category };
    const updated = [...items, newItem];
    setItems(updated);
    onUpdate({ ...diagram, mfQuestions: updated });
    setQuestion(''); setAnswer(''); setConfidence(80); setCategory('');
    toast({ title: 'MF AI Question added' });
  };
  const remove = (id: string) => { const updated = items.filter((i) => i.id !== id); setItems(updated); onUpdate({ ...diagram, mfQuestions: updated }); };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Mainframe AI Questions — {diagram.processName}</DialogTitle><DialogDescription>AI-driven analysis questions related to mainframe data for this process.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          {items.map((i) => (
            <div key={i.id} className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
              <Cpu className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{i.question}</p>
                <p className="text-xs text-muted-foreground">{i.answer}</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px]">{i.category}</Badge>
                  <Badge className="bg-primary/15 text-primary border-0 text-[10px]">{i.confidence}%</Badge>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(i.id)}><Trash2 className="h-3 w-3" /></Button>
            </div>
          ))}
        </div>
        <div className="grid gap-3 pt-3 border-t">
          <Input placeholder="Question about mainframe data" value={question} onChange={(e) => setQuestion(e.target.value)} />
          <Textarea placeholder="Answer / Analysis" value={answer} onChange={(e) => setAnswer(e.target.value)} rows={2} />
          <div className="flex gap-2">
            <Input placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} className="flex-1" />
            <Input type="number" min={0} max={100} value={confidence} onChange={(e) => setConfidence(Number(e.target.value))} className="w-24" placeholder="%" />
          </div>
          <Button onClick={add} className="bg-primary hover:bg-primary/90"><Plus className="mr-1 h-3 w-3" /> Add</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RiskScenariosDialog({ diagram, onClose, onUpdate }: { diagram: EPCDiagram; onClose: () => void; onUpdate: (d: EPCDiagram) => void }) {
  const [items, setItems] = useState<RiskScenario[]>(diagram.riskScenarios || []);
  const [desc, setDesc] = useState(''); const [likelihood, setLikelihood] = useState<RiskScenario['likelihood']>('medium'); const [impact, setImpact] = useState<RiskScenario['impact']>('medium'); const [mitigation, setMitigation] = useState('');
  const add = () => {
    if (!desc.trim()) return;
    const newItem: RiskScenario = { id: crypto.randomUUID(), description: desc.trim(), likelihood, impact, mitigation };
    const updated = [...items, newItem];
    setItems(updated);
    onUpdate({ ...diagram, riskScenarios: updated });
    setDesc(''); setMitigation('');
    toast({ title: 'Risk scenario added' });
  };
  const remove = (id: string) => { const updated = items.filter((i) => i.id !== id); setItems(updated); onUpdate({ ...diagram, riskScenarios: updated }); };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Risk Scenarios — {diagram.processName}</DialogTitle><DialogDescription>Define what can go wrong and the business impact.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          {items.map((i) => (
            <div key={i.id} className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
              <ShieldAlert className="h-4 w-4 mt-0.5 text-destructive flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{i.description}</p>
                <p className="text-xs text-muted-foreground">{i.mitigation}</p>
                <div className="flex gap-2 mt-1">
                  <Badge className={`text-[10px] border-0 ${i.likelihood === 'high' ? 'bg-destructive/15 text-destructive' : i.likelihood === 'medium' ? 'bg-yellow-500/15 text-yellow-600' : 'bg-primary/15 text-primary'}`}>L: {i.likelihood}</Badge>
                  <Badge className={`text-[10px] border-0 ${i.impact === 'high' ? 'bg-destructive/15 text-destructive' : i.impact === 'medium' ? 'bg-yellow-500/15 text-yellow-600' : 'bg-primary/15 text-primary'}`}>I: {i.impact}</Badge>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(i.id)}><Trash2 className="h-3 w-3" /></Button>
            </div>
          ))}
        </div>
        <div className="grid gap-3 pt-3 border-t">
          <Textarea placeholder="Risk scenario description (e.g. Unauthorized change to bank details → incorrect payments / fraud)" value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} />
          <Textarea placeholder="Mitigation / Controls" value={mitigation} onChange={(e) => setMitigation(e.target.value)} rows={2} />
          <div className="flex gap-2">
            <Select value={likelihood} onValueChange={(v) => setLikelihood(v as RiskScenario['likelihood'])}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select>
            <Select value={impact} onValueChange={(v) => setImpact(v as RiskScenario['impact'])}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select>
            <Button onClick={add} className="bg-primary hover:bg-primary/90"><Plus className="mr-1 h-3 w-3" /> Add</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
