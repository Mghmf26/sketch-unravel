import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, ArrowRight, ShieldAlert, Shield, BookOpen,
  AlertTriangle, Database, HelpCircle, ChevronDown, ChevronRight, Pencil, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  fetchSteps, fetchStepConnections, fetchRisks, fetchControls, fetchAllControls,
  fetchRegulations, fetchIncidents, fetchMainframeImports, fetchMFQuestions, fetchStepRaci,
  insertStep, deleteStep, updateStep,
  insertStepConnection, deleteStepConnection,
  insertRisk, deleteRisk,
  insertControl, deleteControl,
  insertRegulation, deleteRegulation,
  insertIncident, deleteIncident, updateIncident,
  insertMainframeImport, deleteMainframeImport,
  insertMFQuestion, deleteMFQuestion,
  insertStepRaci, deleteStepRaci,
  type ProcessStep, type StepConnection, type Risk, type Control,
  type Regulation, type Incident, type MainframeImport, type MFQuestion, type StepRaci,
} from '@/lib/api';

interface ProcessEditTabProps {
  processId: string;
}

type AddDialog = 'step' | 'risk' | 'control' | 'regulation' | 'incident' | 'import' | 'mfq' | 'connection' | null;

export default function ProcessEditTab({ processId }: ProcessEditTabProps) {
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [connections, setConnections] = useState<StepConnection[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [controls, setControls] = useState<Control[]>([]);
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [imports, setImports] = useState<MainframeImport[]>([]);
  const [mfQuestions, setMfQuestions] = useState<MFQuestion[]>([]);
  const [addDialog, setAddDialog] = useState<AddDialog>(null);
  const [contextStepId, setContextStepId] = useState<string | null>(null);
  const [contextRiskId, setContextRiskId] = useState<string | null>(null);

  // Collapsible sections
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    steps: true, connections: true, risks: true, regulations: true,
    incidents: true, imports: true, mfq: true,
  });

  const toggleSection = (key: string) =>
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  const reload = useCallback(async () => {
    const [s, c, r, ctrl, reg, inc, imp, mfq] = await Promise.all([
      fetchSteps(processId), fetchStepConnections(processId),
      fetchRisks(processId), fetchAllControls(),
      fetchRegulations(processId), fetchIncidents(processId),
      fetchMainframeImports(processId), fetchMFQuestions(processId),
    ]);
    setSteps(s);
    setConnections(c);
    setRisks(r);
    // Filter controls to only those belonging to this process's risks
    const riskIds = new Set(r.map(x => x.id));
    setControls(ctrl.filter(x => riskIds.has(x.risk_id)));
    setRegulations(reg);
    setIncidents(inc);
    setImports(imp);
    setMfQuestions(mfq);
  }, [processId]);

  useEffect(() => { reload(); }, [reload]);

  const stepMap: Record<string, string> = {};
  steps.forEach(s => (stepMap[s.id] = s.label));

  const SectionHeader = ({ icon: Icon, title, count, sectionKey, onAdd }: {
    icon: any; title: string; count: number; sectionKey: string; onAdd?: () => void;
  }) => (
    <div className="flex items-center justify-between py-2">
      <CollapsibleTrigger className="flex items-center gap-2 hover:text-primary transition-colors">
        {openSections[sectionKey] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold">{title}</span>
        <Badge variant="secondary" className="text-[10px] h-5">{count}</Badge>
      </CollapsibleTrigger>
      {onAdd && (
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onAdd}>
          <Plus className="h-3 w-3 mr-1" /> Add
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Summary Bar */}
      <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
        {[
          { label: 'Steps', count: steps.length, color: 'bg-emerald-500' },
          { label: 'Connections', count: connections.length, color: 'bg-slate-400' },
          { label: 'Risks', count: risks.length, color: 'bg-orange-500' },
          { label: 'Controls', count: controls.length, color: 'bg-blue-500' },
          { label: 'Regulations', count: regulations.length, color: 'bg-violet-500' },
          { label: 'Incidents', count: incidents.length, color: 'bg-red-500' },
          { label: 'MF Imports', count: imports.length, color: 'bg-yellow-500' },
        ].map(m => (
          <div key={m.label} className="flex items-center gap-2 p-2 rounded-lg border bg-card">
            <div className={`w-2 h-2 rounded-full ${m.color}`} />
            <div className="text-xs">
              <span className="font-bold">{m.count}</span>
              <span className="text-muted-foreground ml-1">{m.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Process Steps */}
      <Collapsible open={openSections.steps} onOpenChange={() => toggleSection('steps')}>
        <Card>
          <CardHeader className="py-2 px-4">
            <SectionHeader icon={Pencil} title="Process Steps" count={steps.length} sectionKey="steps"
              onAdd={() => setAddDialog('step')} />
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="p-0">
              <div className="divide-y">
                {steps.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No steps defined</p>}
                {steps.map(step => (
                  <div key={step.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-muted/30 group">
                    <Badge variant="outline" className="text-[9px] uppercase font-bold shrink-0 w-24 justify-center">{step.type}</Badge>
                    <span className="text-sm flex-1 truncate font-medium">{step.label}</span>
                    {step.description && <span className="text-xs text-muted-foreground truncate max-w-[200px]">{step.description}</span>}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-6 w-6" title="Add Risk"
                        onClick={() => { setContextStepId(step.id); setAddDialog('risk'); }}>
                        <ShieldAlert className="h-3 w-3 text-orange-500" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" title="Add Regulation"
                        onClick={() => { setContextStepId(step.id); setAddDialog('regulation'); }}>
                        <BookOpen className="h-3 w-3 text-violet-500" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" title="Add Incident"
                        onClick={() => { setContextStepId(step.id); setAddDialog('incident'); }}>
                        <AlertTriangle className="h-3 w-3 text-red-500" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteStep(step.id).then(reload)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Connections */}
      <Collapsible open={openSections.connections} onOpenChange={() => toggleSection('connections')}>
        <Card>
          <CardHeader className="py-2 px-4">
            <SectionHeader icon={ArrowRight} title="Step Connections" count={connections.length} sectionKey="connections"
              onAdd={() => setAddDialog('connection')} />
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="p-0">
              <div className="divide-y">
                {connections.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No connections</p>}
                {connections.map(conn => (
                  <div key={conn.id} className="px-4 py-2.5 flex items-center gap-2 hover:bg-muted/30 group">
                    <Badge variant="outline" className="text-[10px] truncate max-w-[180px]">{stepMap[conn.source_step_id] || conn.source_step_id}</Badge>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <Badge variant="outline" className="text-[10px] truncate max-w-[180px]">{stepMap[conn.target_step_id] || conn.target_step_id}</Badge>
                    {conn.label && <Badge className="bg-primary/10 text-primary border-0 text-[9px]">{conn.label}</Badge>}
                    <span className="flex-1" />
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteStepConnection(conn.id).then(reload)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Risks & Controls */}
      <Collapsible open={openSections.risks} onOpenChange={() => toggleSection('risks')}>
        <Card>
          <CardHeader className="py-2 px-4">
            <SectionHeader icon={ShieldAlert} title="Risks & Controls" count={risks.length} sectionKey="risks" />
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="p-0">
              <div className="divide-y">
                {risks.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No risks identified</p>}
                {risks.map(risk => {
                  const riskControls = controls.filter(c => c.risk_id === risk.id);
                  return (
                    <div key={risk.id} className="px-4 py-3 space-y-2 hover:bg-muted/20 group">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{risk.description}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-[9px]">
                              Step: {stepMap[risk.step_id] || '—'}
                            </Badge>
                            <Badge className={`text-[9px] border-0 ${risk.likelihood === 'high' ? 'bg-red-100 text-red-700' : risk.likelihood === 'medium' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                              L: {risk.likelihood}
                            </Badge>
                            <Badge className={`text-[9px] border-0 ${risk.impact === 'high' ? 'bg-red-100 text-red-700' : risk.impact === 'medium' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                              I: {risk.impact}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-6 w-6" title="Add Control"
                            onClick={() => { setContextRiskId(risk.id); setAddDialog('control'); }}>
                            <Shield className="h-3 w-3 text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteRisk(risk.id).then(reload)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {riskControls.length > 0 && (
                        <div className="ml-4 pl-3 border-l-2 border-blue-200 space-y-1">
                          {riskControls.map(ctrl => (
                            <div key={ctrl.id} className="flex items-center gap-2 text-xs py-1">
                              <Shield className="h-3 w-3 text-blue-400" />
                              <span className="font-medium">{ctrl.name}</span>
                              <Badge variant="outline" className="text-[8px]">{ctrl.type}</Badge>
                              <Badge className={`text-[8px] border-0 ${ctrl.effectiveness === 'effective' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {ctrl.effectiveness}
                              </Badge>
                              <span className="flex-1" />
                              <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive"
                                onClick={() => deleteControl(ctrl.id).then(reload)}>
                                <Trash2 className="h-2.5 w-2.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Regulations */}
      <Collapsible open={openSections.regulations} onOpenChange={() => toggleSection('regulations')}>
        <Card>
          <CardHeader className="py-2 px-4">
            <SectionHeader icon={BookOpen} title="Regulations" count={regulations.length} sectionKey="regulations" />
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="p-0">
              <div className="divide-y">
                {regulations.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No regulations linked</p>}
                {regulations.map(reg => (
                  <div key={reg.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-muted/30 group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{reg.name}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-[9px]">Step: {stepMap[reg.step_id] || '—'}</Badge>
                        {reg.authority && <Badge variant="outline" className="text-[9px]">{reg.authority}</Badge>}
                        <Badge className={`text-[9px] border-0 ${reg.compliance_status === 'compliant' ? 'bg-green-100 text-green-700' : reg.compliance_status === 'non-compliant' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {reg.compliance_status}
                        </Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteRegulation(reg.id).then(reload)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Incidents */}
      <Collapsible open={openSections.incidents} onOpenChange={() => toggleSection('incidents')}>
        <Card>
          <CardHeader className="py-2 px-4">
            <SectionHeader icon={AlertTriangle} title="Incidents" count={incidents.length} sectionKey="incidents" />
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="p-0">
              <div className="divide-y">
                {incidents.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No incidents recorded</p>}
                {incidents.map(inc => (
                  <div key={inc.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-muted/30 group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{inc.title}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-[9px]">Step: {stepMap[inc.step_id] || '—'}</Badge>
                        <Badge className={`text-[9px] border-0 ${inc.severity === 'critical' ? 'bg-red-100 text-red-700' : inc.severity === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {inc.severity}
                        </Badge>
                        <Badge variant="outline" className="text-[9px]">{inc.status}</Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteIncident(inc.id).then(reload)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Mainframe Imports */}
      <Collapsible open={openSections.imports} onOpenChange={() => toggleSection('imports')}>
        <Card>
          <CardHeader className="py-2 px-4">
            <SectionHeader icon={Database} title="Mainframe Imports" count={imports.length} sectionKey="imports"
              onAdd={() => setAddDialog('import')} />
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="p-0">
              <div className="divide-y">
                {imports.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No mainframe imports</p>}
                {imports.map(imp => (
                  <div key={imp.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-muted/30 group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{imp.source_name}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-[9px]">{imp.source_type}</Badge>
                        {imp.dataset_name && <Badge variant="outline" className="text-[9px]">{imp.dataset_name}</Badge>}
                        <Badge variant="outline" className="text-[9px]">{imp.record_count} records</Badge>
                        <Badge className={`text-[9px] border-0 ${imp.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {imp.status}
                        </Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteMainframeImport(imp.id).then(reload)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* MF Questions */}
      <Collapsible open={openSections.mfq} onOpenChange={() => toggleSection('mfq')}>
        <Card>
          <CardHeader className="py-2 px-4">
            <SectionHeader icon={HelpCircle} title="MF AI Questions" count={mfQuestions.length} sectionKey="mfq"
              onAdd={() => setAddDialog('mfq')} />
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="p-0">
              <div className="divide-y">
                {mfQuestions.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No questions</p>}
                {mfQuestions.map(q => (
                  <div key={q.id} className="px-4 py-2.5 flex items-start gap-3 hover:bg-muted/30 group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{q.question}</p>
                      {q.answer && <p className="text-xs text-muted-foreground mt-1">{q.answer}</p>}
                      <div className="flex gap-2 mt-1">
                        {q.category && <Badge variant="outline" className="text-[9px]">{q.category}</Badge>}
                        <Badge variant="outline" className="text-[9px]">{Math.round(q.confidence * 100)}% confidence</Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteMFQuestion(q.id).then(reload)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Add Dialogs */}
      {addDialog === 'step' && (
        <AddStepDialog processId={processId} onClose={() => setAddDialog(null)} onRefresh={reload} />
      )}
      {addDialog === 'connection' && (
        <AddConnectionDialog processId={processId} steps={steps} onClose={() => setAddDialog(null)} onRefresh={reload} />
      )}
      {addDialog === 'risk' && contextStepId && (
        <AddRiskDialog processId={processId} stepId={contextStepId} onClose={() => { setAddDialog(null); setContextStepId(null); }} onRefresh={reload} />
      )}
      {addDialog === 'control' && contextRiskId && (
        <AddControlDialog riskId={contextRiskId} onClose={() => { setAddDialog(null); setContextRiskId(null); }} onRefresh={reload} />
      )}
      {addDialog === 'regulation' && contextStepId && (
        <AddRegulationDialog processId={processId} stepId={contextStepId} onClose={() => { setAddDialog(null); setContextStepId(null); }} onRefresh={reload} />
      )}
      {addDialog === 'incident' && contextStepId && (
        <AddIncidentDialog processId={processId} stepId={contextStepId} onClose={() => { setAddDialog(null); setContextStepId(null); }} onRefresh={reload} />
      )}
      {addDialog === 'import' && (
        <AddImportDialog processId={processId} steps={steps} onClose={() => setAddDialog(null)} onRefresh={reload} />
      )}
      {addDialog === 'mfq' && (
        <AddMFQuestionDialog processId={processId} onClose={() => setAddDialog(null)} onRefresh={reload} />
      )}
    </div>
  );
}

// ---- Add Dialogs ----

function AddStepDialog({ processId, onClose, onRefresh }: { processId: string; onClose: () => void; onRefresh: () => void }) {
  const [label, setLabel] = useState('');
  const [type, setType] = useState('in-scope');
  const [desc, setDesc] = useState('');
  const submit = async () => {
    if (!label.trim()) return;
    await insertStep({ process_id: processId, label: label.trim(), type, description: desc || null });
    toast({ title: 'Step added' }); onRefresh(); onClose();
  };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add Process Step</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5"><Label>Label *</Label><Input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Validate Payment" /></div>
          <div className="grid gap-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
              <SelectItem value="in-scope">In-Scope</SelectItem><SelectItem value="interface">Interface</SelectItem>
              <SelectItem value="event">Event</SelectItem><SelectItem value="decision">Decision</SelectItem>
              <SelectItem value="xor">XOR</SelectItem><SelectItem value="start-end">Start/End</SelectItem>
              <SelectItem value="storage">Storage</SelectItem><SelectItem value="delay">Delay</SelectItem>
              <SelectItem value="document">Document</SelectItem>
            </SelectContent></Select>
          </div>
          <div className="grid gap-1.5"><Label>Description</Label><Input value={desc} onChange={e => setDesc(e.target.value)} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit}>Add</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddConnectionDialog({ processId, steps, onClose, onRefresh }: { processId: string; steps: ProcessStep[]; onClose: () => void; onRefresh: () => void }) {
  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');
  const [label, setLabel] = useState('');
  const submit = async () => {
    if (!source || !target) return;
    await insertStepConnection({ process_id: processId, source_step_id: source, target_step_id: target, label: label || null });
    toast({ title: 'Connection added' }); onRefresh(); onClose();
  };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add Connection</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label>Source Step *</Label>
            <Select value={source} onValueChange={setSource}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>{steps.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Target Step *</Label>
            <Select value={target} onValueChange={setTarget}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>{steps.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="grid gap-1.5"><Label>Label</Label><Input value={label} onChange={e => setLabel(e.target.value)} placeholder='e.g. "Yes", "No"' /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit}>Add</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddRiskDialog({ processId, stepId, onClose, onRefresh }: { processId: string; stepId: string; onClose: () => void; onRefresh: () => void }) {
  const [desc, setDesc] = useState('');
  const [likelihood, setLikelihood] = useState('medium');
  const [impact, setImpact] = useState('medium');
  const submit = async () => {
    if (!desc.trim()) return;
    await insertRisk({ process_id: processId, step_id: stepId, description: desc.trim(), likelihood, impact });
    toast({ title: 'Risk added' }); onRefresh(); onClose();
  };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add Risk</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5"><Label>Description *</Label><Textarea value={desc} onChange={e => setDesc(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>Likelihood</Label><Select value={likelihood} onValueChange={setLikelihood}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select></div>
            <div className="grid gap-1.5"><Label>Impact</Label><Select value={impact} onValueChange={setImpact}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select></div>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit}>Add</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddControlDialog({ riskId, onClose, onRefresh }: { riskId: string; onClose: () => void; onRefresh: () => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('preventive');
  const [effectiveness, setEffectiveness] = useState('effective');
  const submit = async () => {
    if (!name.trim()) return;
    await insertControl({ risk_id: riskId, name: name.trim(), type, effectiveness });
    toast({ title: 'Control added' }); onRefresh(); onClose();
  };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add Control</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5"><Label>Name *</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>Type</Label><Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="preventive">Preventive</SelectItem><SelectItem value="detective">Detective</SelectItem><SelectItem value="corrective">Corrective</SelectItem></SelectContent></Select></div>
            <div className="grid gap-1.5"><Label>Effectiveness</Label><Select value={effectiveness} onValueChange={setEffectiveness}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="effective">Effective</SelectItem><SelectItem value="partially">Partially</SelectItem><SelectItem value="ineffective">Ineffective</SelectItem></SelectContent></Select></div>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit}>Add</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddRegulationDialog({ processId, stepId, onClose, onRefresh }: { processId: string; stepId: string; onClose: () => void; onRefresh: () => void }) {
  const [name, setName] = useState('');
  const [authority, setAuthority] = useState('');
  const [status, setStatus] = useState('partial');
  const submit = async () => {
    if (!name.trim()) return;
    await insertRegulation({ process_id: processId, step_id: stepId, name: name.trim(), authority: authority || null, compliance_status: status });
    toast({ title: 'Regulation added' }); onRefresh(); onClose();
  };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add Regulation</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5"><Label>Name *</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label>Authority</Label><Input value={authority} onChange={e => setAuthority(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label>Compliance Status</Label><Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="compliant">Compliant</SelectItem><SelectItem value="partial">Partial</SelectItem><SelectItem value="non-compliant">Non-Compliant</SelectItem></SelectContent></Select></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit}>Add</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddIncidentDialog({ processId, stepId, onClose, onRefresh }: { processId: string; stepId: string; onClose: () => void; onRefresh: () => void }) {
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [desc, setDesc] = useState('');
  const submit = async () => {
    if (!title.trim()) return;
    await insertIncident({ process_id: processId, step_id: stepId, title: title.trim(), severity, description: desc || null });
    toast({ title: 'Incident added' }); onRefresh(); onClose();
  };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add Incident</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5"><Label>Title *</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label>Severity</Label><Select value={severity} onValueChange={setSeverity}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select></div>
          <div className="grid gap-1.5"><Label>Description</Label><Textarea value={desc} onChange={e => setDesc(e.target.value)} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit}>Add</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddImportDialog({ processId, steps, onClose, onRefresh }: { processId: string; steps: ProcessStep[]; onClose: () => void; onRefresh: () => void }) {
  const [sourceName, setSourceName] = useState('');
  const [sourceType, setSourceType] = useState('DB2');
  const [datasetName, setDatasetName] = useState('');
  const [stepId, setStepId] = useState('');
  const submit = async () => {
    if (!sourceName.trim()) return;
    await insertMainframeImport({ process_id: processId, source_name: sourceName.trim(), source_type: sourceType, dataset_name: datasetName || null, step_id: stepId || null });
    toast({ title: 'Import added' }); onRefresh(); onClose();
  };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add Mainframe Import</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5"><Label>Source Name *</Label><Input value={sourceName} onChange={e => setSourceName(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>Source Type</Label><Select value={sourceType} onValueChange={setSourceType}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="DB2">DB2</SelectItem><SelectItem value="VSAM">VSAM</SelectItem><SelectItem value="IMS">IMS</SelectItem><SelectItem value="CICS">CICS</SelectItem><SelectItem value="MQ">MQ</SelectItem></SelectContent></Select></div>
            <div className="grid gap-1.5"><Label>Dataset</Label><Input value={datasetName} onChange={e => setDatasetName(e.target.value)} /></div>
          </div>
          <div className="grid gap-1.5">
            <Label>Linked Step</Label>
            <Select value={stepId} onValueChange={setStepId}><SelectTrigger><SelectValue placeholder="Optional..." /></SelectTrigger>
              <SelectContent>{steps.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent></Select>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit}>Add</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddMFQuestionDialog({ processId, onClose, onRefresh }: { processId: string; onClose: () => void; onRefresh: () => void }) {
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState('');
  const submit = async () => {
    if (!question.trim()) return;
    await insertMFQuestion({ process_id: processId, question: question.trim(), category: category || null });
    toast({ title: 'Question added' }); onRefresh(); onClose();
  };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add MF AI Question</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5"><Label>Question *</Label><Textarea value={question} onChange={e => setQuestion(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label>Category</Label><Input value={category} onChange={e => setCategory(e.target.value)} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit}>Add</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
