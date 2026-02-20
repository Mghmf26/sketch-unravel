import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ArrowLeft, Layers, Clock, Users, Building2, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import {
  fetchProcesses, fetchClients, fetchSteps, fetchRisks, fetchAllControls, fetchIncidents, fetchRegulations, fetchMFQuestions,
  insertStep, deleteStep,
  type BusinessProcess, type ProcessStep, type Client,
} from '@/lib/api';

export default function ProcessDetails() {
  const navigate = useNavigate();
  const [processes, setProcesses] = useState<BusinessProcess[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [riskCounts, setRiskCounts] = useState<Record<string, number>>({});
  const [controlCounts, setControlCounts] = useState<Record<string, number>>({});
  const [incidentCounts, setIncidentCounts] = useState<Record<string, number>>({});
  const [regCounts, setRegCounts] = useState<Record<string, number>>({});
  const [mfqCounts, setMfqCounts] = useState<Record<string, number>>({});
  const [addStepFor, setAddStepFor] = useState<string | null>(null);

  const reload = async () => {
    const [p, c, s, r, ctrl, i, reg, mfq] = await Promise.all([
      fetchProcesses(), fetchClients(), fetchSteps(), fetchRisks(), fetchAllControls(), fetchIncidents(), fetchRegulations(), fetchMFQuestions(),
    ]);
    setProcesses(p); setClients(c); setSteps(s);

    const rc: Record<string, number> = {};
    const cc: Record<string, number> = {};
    const ic: Record<string, number> = {};
    const regc: Record<string, number> = {};
    const mfc: Record<string, number> = {};
    p.forEach(proc => {
      const pRisks = r.filter(x => x.process_id === proc.id);
      rc[proc.id] = pRisks.length;
      cc[proc.id] = ctrl.filter(x => pRisks.some(pr => pr.id === x.risk_id)).length;
      ic[proc.id] = i.filter(x => x.process_id === proc.id).length;
      regc[proc.id] = reg.filter(x => x.process_id === proc.id).length;
      mfc[proc.id] = mfq.filter(x => x.process_id === proc.id).length;
    });
    setRiskCounts(rc); setControlCounts(cc); setIncidentCounts(ic); setRegCounts(regc); setMfqCounts(mfc);
  };

  useEffect(() => { reload(); }, []);

  const clientMap: Record<string, string> = {};
  clients.forEach(c => clientMap[c.id] = c.name);

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Process Details</h1>
          <p className="text-sm text-muted-foreground mt-1">Detailed view of each process, its steps, and linked components</p>
        </div>
      </div>

      {processes.length === 0 ? (
        <Card className="border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <FileText className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No processes created yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5">
          {processes.map(p => {
            const pSteps = steps.filter(s => s.process_id === p.id);
            return (
              <Card key={p.id} className="border bg-card hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{p.process_name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">{p.description || 'No description'}</p>
                    </div>
                    <Badge className="bg-primary/15 text-primary border-0 text-[10px]">ACTIVE</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Client:</span>
                      <span className="font-medium">{p.client_id ? clientMap[p.client_id] || '—' : '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Owner:</span>
                      <span className="font-medium">{p.owner || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Layers className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Steps:</span>
                      <span className="font-medium">{pSteps.length}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Updated:</span>
                      <span className="font-medium">{new Date(p.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Steps */}
                  {pSteps.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Process Steps</p>
                      <div className="flex flex-wrap gap-1.5">
                        {pSteps.map(s => (
                          <div key={s.id} className="flex items-center gap-1 px-2 py-1 border rounded text-xs bg-muted/30">
                            <span className="font-medium">{s.label}</span>
                            <Badge variant="outline" className="text-[9px]">{s.type}</Badge>
                            <Button variant="ghost" size="icon" className="h-4 w-4 ml-1" onClick={async () => { await deleteStep(s.id); reload(); }}><Trash2 className="h-2.5 w-2.5" /></Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap mb-3">
                    <Badge variant="outline" className="text-[10px]">{riskCounts[p.id] || 0} Risks</Badge>
                    <Badge variant="outline" className="text-[10px]">{controlCounts[p.id] || 0} Controls</Badge>
                    <Badge variant="outline" className="text-[10px]">{incidentCounts[p.id] || 0} Incidents</Badge>
                    <Badge variant="outline" className="text-[10px]">{regCounts[p.id] || 0} Regulations</Badge>
                    <Badge variant="outline" className="text-[10px]">{mfqCounts[p.id] || 0} MF Questions</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setAddStepFor(p.id)}>
                      <Plus className="mr-1 h-3 w-3" /> Add Step
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {addStepFor && <AddStepDialog processId={addStepFor} onClose={() => setAddStepFor(null)} onRefresh={reload} />}
    </div>
  );
}

function AddStepDialog({ processId, onClose, onRefresh }: { processId: string; onClose: () => void; onRefresh: () => void }) {
  const [label, setLabel] = useState('');
  const [type, setType] = useState('in-scope');
  const [desc, setDesc] = useState('');

  const add = async () => {
    if (!label.trim()) return;
    await insertStep({ process_id: processId, label: label.trim(), type, description: desc || null });
    toast({ title: 'Step added' });
    setLabel(''); setDesc('');
    onRefresh();
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add Process Step</DialogTitle><DialogDescription>Steps are the building blocks of your process. Risks, regulations, and incidents are linked to steps.</DialogDescription></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5"><Label>Step Label *</Label><Input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Validate Payment" /></div>
          <div className="grid gap-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
              <SelectItem value="in-scope">In-Scope (Process Step)</SelectItem>
              <SelectItem value="interface">Interface (Input/Output)</SelectItem>
              <SelectItem value="event">Event</SelectItem>
              <SelectItem value="decision">Decision</SelectItem>
              <SelectItem value="xor">XOR Gateway</SelectItem>
              <SelectItem value="start-end">Start/End</SelectItem>
              <SelectItem value="storage">Storage</SelectItem>
              <SelectItem value="delay">Delay</SelectItem>
              <SelectItem value="document">Document</SelectItem>
            </SelectContent></Select>
          </div>
          <div className="grid gap-1.5"><Label>Description</Label><Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional description" /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={add}>Add Step</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
