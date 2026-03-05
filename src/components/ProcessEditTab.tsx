import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, ArrowRight, ShieldAlert, ShieldCheck, Scale,
  AlertCircle, Database, HelpCircle, ChevronDown, ChevronRight, Pencil, Users,
  Check, X, Save, Monitor
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
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
  insertRisk, deleteRisk, updateRisk,
  insertControl, deleteControl, updateControl,
  insertRegulation, deleteRegulation, updateRegulation,
  insertIncident, deleteIncident, updateIncident,
  insertMainframeImport, deleteMainframeImport,
  insertMFQuestion, deleteMFQuestion,
  insertStepRaci, deleteStepRaci, updateStepRaci,
  type ProcessStep, type StepConnection, type Risk, type Control,
  type Regulation, type Incident, type MainframeImport, type MFQuestion, type StepRaci,
} from '@/lib/api';
import { fetchStepApplications, insertStepApplication, updateStepApplication, deleteStepApplication, type StepApplication } from '@/lib/api-applications';

interface ProcessEditTabProps {
  processId: string;
}

// Color mapping matching the diagram node colors
const typeColors: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  'in-scope': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300', dot: 'bg-emerald-500' },
  'interface': { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-300', dot: 'bg-slate-400' },
  'event': { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-300', dot: 'bg-pink-500' },
  'xor': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300', dot: 'bg-blue-500' },
  'decision': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300', dot: 'bg-orange-500' },
  'start-end': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300', dot: 'bg-emerald-400' },
  'storage': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-300', dot: 'bg-yellow-500' },
  'delay': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300', dot: 'bg-red-500' },
  'document': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300', dot: 'bg-purple-500' },
};

const typeLabel: Record<string, string> = {
  'in-scope': 'Step',
  'interface': 'Process Interface',
  'event': 'Event',
  'xor': 'XOR Gateway',
  'decision': 'Decision',
  'start-end': 'Start / End',
  'storage': 'Storage',
  'delay': 'Delay',
  'document': 'Document',
};

function getTypeStyle(type: string) {
  return typeColors[type] || typeColors['in-scope'];
}

type AddDialog = 'step' | 'risk' | 'control' | 'regulation' | 'incident' | 'import' | 'mfq' | 'connection' | 'raci' | 'application' | null;

// Inline editable text field
function InlineEdit({ value, onSave, className = '', multiline = false }: {
  value: string; onSave: (v: string) => void; className?: string; multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editing) {
    return (
      <span
        className={`cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1 transition-colors ${className}`}
        onClick={() => { setDraft(value); setEditing(true); }}
        title="Click to edit"
      >
        {value || <span className="text-muted-foreground italic">Click to edit</span>}
      </span>
    );
  }

  const save = () => {
    if (draft.trim() && draft !== value) onSave(draft.trim());
    setEditing(false);
  };

  return (
    <span className="inline-flex items-center gap-1">
      {multiline ? (
        <Textarea value={draft} onChange={e => setDraft(e.target.value)} className="text-sm min-h-[60px]" autoFocus onKeyDown={e => { if (e.key === 'Escape') setEditing(false); }} />
      ) : (
        <Input value={draft} onChange={e => setDraft(e.target.value)} className="h-7 text-sm w-auto min-w-[120px]" autoFocus
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }} />
      )}
      <Button variant="ghost" size="icon" className="h-6 w-6 text-emerald-600" onClick={save}><Check className="h-3 w-3" /></Button>
      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => setEditing(false)}><X className="h-3 w-3" /></Button>
    </span>
  );
}

// Inline select editor
function InlineSelect({ value, options, onSave, className = '' }: {
  value: string; options: { value: string; label: string }[]; onSave: (v: string) => void; className?: string;
}) {
  return (
    <Select value={value} onValueChange={v => { if (v !== value) onSave(v); }}>
      <SelectTrigger className={`h-6 text-[10px] w-auto min-w-[80px] border-dashed ${className}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

// Type badge with diagram-matching colors
function TypeBadge({ type }: { type: string }) {
  const style = getTypeStyle(type);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${style.bg} ${style.text} ${style.border}`}>
      <span className={`w-2 h-2 rounded-full ${style.dot}`} />
      {typeLabel[type] || type}
    </span>
  );
}

export default function ProcessEditTab({ processId }: ProcessEditTabProps) {
  const { canAccessModule } = usePermissions();
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [connections, setConnections] = useState<StepConnection[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [controls, setControls] = useState<Control[]>([]);
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [imports, setImports] = useState<MainframeImport[]>([]);
  const [mfQuestions, setMfQuestions] = useState<MFQuestion[]>([]);
  const [applications, setApplications] = useState<StepApplication[]>([]);
  const [raciEntries, setRaciEntries] = useState<StepRaci[]>([]);
  const [addDialog, setAddDialog] = useState<AddDialog>(null);
  const [contextStepId, setContextStepId] = useState<string | null>(null);
  const [contextRiskId, setContextRiskId] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  // Global sections
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    steps: true, connections: true, imports: true, mfq: true,
  });

  const toggleSection = (key: string) =>
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  const toggleStep = (id: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const expandAllSteps = () => setExpandedSteps(new Set(steps.map(s => s.id)));
  const collapseAllSteps = () => setExpandedSteps(new Set());

  const reload = useCallback(async () => {
    const [s, c, r, ctrl, reg, inc, imp, mfq, raci, apps] = await Promise.all([
      fetchSteps(processId), fetchStepConnections(processId),
      fetchRisks(processId), fetchAllControls(),
      fetchRegulations(processId), fetchIncidents(processId),
      fetchMainframeImports(processId), fetchMFQuestions(processId),
      fetchStepRaci(processId), fetchStepApplications(processId),
    ]);
    setSteps(s);
    setConnections(c);
    setRisks(r);
    const riskIds = new Set(r.map(x => x.id));
    setControls(ctrl.filter(x => riskIds.has(x.risk_id)));
    setRegulations(reg);
    setIncidents(inc);
    setImports(imp);
    setMfQuestions(mfq);
    setRaciEntries(raci);
    setApplications(apps);
  }, [processId]);

  useEffect(() => { reload(); }, [reload]);

  const stepMap: Record<string, string> = {};
  steps.forEach(s => (stepMap[s.id] = s.label));

  const SectionHeader = ({ icon: Icon, title, count, sectionKey, onAdd, extra }: {
    icon: any; title: string; count: number; sectionKey: string; onAdd?: () => void; extra?: React.ReactNode;
  }) => (
    <div className="flex items-center justify-between py-2">
      <CollapsibleTrigger className="flex items-center gap-2 hover:text-primary transition-colors">
        {openSections[sectionKey] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold">{title}</span>
        <Badge variant="secondary" className="text-[10px] h-5">{count}</Badge>
      </CollapsibleTrigger>
      <div className="flex items-center gap-1">
        {extra}
        {onAdd && (
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onAdd}>
            <Plus className="h-3 w-3 mr-1" /> Add
          </Button>
        )}
      </div>
    </div>
  );

  // Get step-related data
  const getStepRisks = (stepId: string) => risks.filter(r => r.step_id === stepId);
  const getStepRegulations = (stepId: string) => regulations.filter(r => r.step_id === stepId);
  const getStepIncidents = (stepId: string) => incidents.filter(i => i.step_id === stepId);
  const getStepRaci = (stepId: string) => raciEntries.filter(r => r.step_id === stepId);
  const getStepApps = (stepId: string) => applications.filter(a => a.step_id === stepId);
  const getRiskControls = (riskId: string) => controls.filter(c => c.risk_id === riskId);

  const countRelations = (stepId: string) => {
    const r = getStepRisks(stepId).length;
    const reg = getStepRegulations(stepId).length;
    const inc = getStepIncidents(stepId).length;
    const raci = getStepRaci(stepId).length;
    const apps = getStepApps(stepId).length;
    return r + reg + inc + raci + apps;
  };

  return (
    <div className="space-y-3">
      {/* Summary Bar */}
      <div className="grid grid-cols-4 md:grid-cols-9 gap-2">
        {[
          { label: 'Steps', count: steps.length, dot: 'bg-emerald-500' },
          { label: 'Interfaces', count: steps.filter(s => s.type === 'interface').length, dot: 'bg-slate-400' },
          { label: 'Connections', count: connections.length, dot: 'bg-slate-500' },
          { label: 'Risks', count: risks.length, dot: 'bg-orange-500' },
          { label: 'Controls', count: controls.length, dot: 'bg-blue-500' },
          { label: 'Regulations', count: regulations.length, dot: 'bg-purple-500' },
          { label: 'Incidents', count: incidents.length, dot: 'bg-red-500' },
          { label: 'Apps', count: applications.length, dot: 'bg-sky-500' },
          { label: 'RACI', count: raciEntries.length, dot: 'bg-cyan-500' },
        ].map(m => (
          <div key={m.label} className="flex items-center gap-2 p-2 rounded-lg border bg-card">
            <div className={`w-2 h-2 rounded-full ${m.dot}`} />
            <div className="text-xs">
              <span className="font-bold">{m.count}</span>
              <span className="text-muted-foreground ml-1">{m.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Steps (Step-Centric View) */}
      <Collapsible open={openSections.steps} onOpenChange={() => toggleSection('steps')}>
        <Card>
          <CardHeader className="py-2 px-4">
            <SectionHeader icon={Pencil} title="Steps & Relations" count={steps.length} sectionKey="steps"
              onAdd={() => setAddDialog('step')}
              extra={
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-6 text-[10px] text-muted-foreground" onClick={expandAllSteps}>Expand All</Button>
                  <Button size="sm" variant="ghost" className="h-6 text-[10px] text-muted-foreground" onClick={collapseAllSteps}>Collapse All</Button>
                </div>
              }
            />
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="p-0">
              <div className="divide-y">
                {steps.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No steps defined</p>}
                {steps.map(step => {
                  const isExpanded = expandedSteps.has(step.id);
                  const stepApps = getStepApps(step.id);
                  const stepRisks = getStepRisks(step.id);
                  const stepRegs = getStepRegulations(step.id);
                  const stepIncs = getStepIncidents(step.id);
                  const stepRaci = getStepRaci(step.id);
                  const relCount = countRelations(step.id);
                  const style = getTypeStyle(step.type);

                  return (
                    <div key={step.id} className={`${isExpanded ? style.bg + '/30' : ''}`}>
                      {/* Step Row */}
                      <div className={`px-4 py-2.5 flex items-center gap-3 hover:bg-muted/30 group cursor-pointer border-l-4 ${style.border}`}
                        onClick={() => toggleStep(step.id)}>
                        <div className="shrink-0">
                          {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <TypeBadge type={step.type} />
                        <span className="text-sm flex-1 font-medium" onClick={e => e.stopPropagation()}>
                          <InlineEdit value={step.label} onSave={v => updateStep(step.id, { label: v }).then(reload)} />
                        </span>
                        {step.description && <span className="text-xs text-muted-foreground truncate max-w-[200px]">{step.description}</span>}
                        {relCount > 0 && (
                          <Badge variant="secondary" className="text-[9px] h-5">{relCount} relations</Badge>
                        )}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                          {canAccessModule('risks') && (
                          <Button variant="ghost" size="icon" className="h-6 w-6" title="Add Risk"
                            onClick={() => { setContextStepId(step.id); setAddDialog('risk'); }}>
                            <ShieldAlert className="h-3 w-3 text-orange-500" />
                          </Button>
                          )}
                          {canAccessModule('regulations') && (
                          <Button variant="ghost" size="icon" className="h-6 w-6" title="Add Regulation"
                            onClick={() => { setContextStepId(step.id); setAddDialog('regulation'); }}>
                            <Scale className="h-3 w-3 text-purple-500" />
                          </Button>
                          )}
                          {canAccessModule('incidents') && (
                          <Button variant="ghost" size="icon" className="h-6 w-6" title="Add Incident"
                            onClick={() => { setContextStepId(step.id); setAddDialog('incident'); }}>
                            <AlertCircle className="h-3 w-3 text-red-500" />
                          </Button>
                          )}
                          {canAccessModule('raci') && (
                          <Button variant="ghost" size="icon" className="h-6 w-6" title="Add RACI"
                            onClick={() => { setContextStepId(step.id); setAddDialog('raci'); }}>
                            <Users className="h-3 w-3 text-cyan-500" />
                          </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => { if (confirm('Delete this step?')) deleteStep(step.id).then(reload); }}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Expanded Relations */}
                      {isExpanded && (
                        <div className="pl-12 pr-4 pb-3 space-y-3">
                          {/* Description */}
                          <div className="text-xs space-y-1">
                            <span className="text-muted-foreground font-medium">Description:</span>
                            <InlineEdit value={step.description || ''} onSave={v => updateStep(step.id, { description: v }).then(reload)} className="text-xs" />
                          </div>

                          {/* Type changer */}
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground font-medium">Type:</span>
                            <InlineSelect
                              value={step.type}
                              options={Object.entries(typeLabel).map(([v, l]) => ({ value: v, label: l }))}
                              onSave={v => updateStep(step.id, { type: v }).then(reload)}
                            />
                          </div>

                          {/* Risks & Controls */}
                          {canAccessModule('risks') && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5 justify-between">
                                <div className="flex items-center gap-1.5">
                                  <ShieldAlert className="h-3 w-3 text-orange-500" />
                                  <span className="text-[11px] font-semibold text-orange-700">Risks ({stepRisks.length})</span>
                                </div>
                                <Button variant="ghost" size="sm" className="h-5 text-[10px] text-orange-600" onClick={() => { setContextStepId(step.id); setAddDialog('risk'); }}>
                                  <Plus className="h-3 w-3 mr-0.5" /> Add
                                </Button>
                              </div>
                              {stepRisks.map(risk => {
                                const ctrls = getRiskControls(risk.id);
                                return (
                                  <div key={risk.id} className="ml-4 pl-3 border-l-2 border-orange-200 space-y-1.5">
                                    <div className="flex items-start gap-2 group/risk">
                                      <div className="flex-1 min-w-0">
                                        <InlineEdit value={risk.description} onSave={v => updateRisk(risk.id, { description: v }).then(reload)} className="text-sm font-medium" />
                                        <div className="flex gap-2 mt-1">
                                          <span className="text-[10px] text-muted-foreground">Likelihood:</span>
                                          <InlineSelect value={risk.likelihood} options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]}
                                            onSave={v => updateRisk(risk.id, { likelihood: v }).then(reload)} />
                                          <span className="text-[10px] text-muted-foreground">Impact:</span>
                                          <InlineSelect value={risk.impact} options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]}
                                            onSave={v => updateRisk(risk.id, { impact: v }).then(reload)} />
                                        </div>
                                      </div>
                                      <div className="flex gap-1 opacity-0 group-hover/risk:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-5 w-5" title="Add Control"
                                          onClick={() => { setContextRiskId(risk.id); setAddDialog('control'); }}>
                                          <ShieldCheck className="h-3 w-3 text-blue-500" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive"
                                          onClick={() => deleteRisk(risk.id).then(reload)}>
                                          <Trash2 className="h-2.5 w-2.5" />
                                        </Button>
                                      </div>
                                    </div>
                                    {/* Controls under risk */}
                                    {ctrls.length > 0 && (
                                      <div className="ml-3 pl-3 border-l-2 border-blue-200 space-y-1">
                                        {ctrls.map(ctrl => (
                                          <div key={ctrl.id} className="flex items-center gap-2 text-xs py-1 group/ctrl">
                                            <ShieldCheck className="h-3 w-3 text-blue-400 shrink-0" />
                                            <InlineEdit value={ctrl.name} onSave={v => updateControl(ctrl.id, { name: v }).then(reload)} className="font-medium" />
                                            <InlineSelect value={ctrl.type || 'preventive'} options={[{ value: 'preventive', label: 'Preventive' }, { value: 'detective', label: 'Detective' }, { value: 'corrective', label: 'Corrective' }]}
                                              onSave={v => updateControl(ctrl.id, { type: v }).then(reload)} />
                                            <InlineSelect value={ctrl.effectiveness || 'effective'} options={[{ value: 'effective', label: 'Effective' }, { value: 'partially', label: 'Partial' }, { value: 'ineffective', label: 'Ineffective' }]}
                                              onSave={v => updateControl(ctrl.id, { effectiveness: v }).then(reload)}
                                              className={ctrl.effectiveness === 'effective' ? 'text-emerald-700' : ctrl.effectiveness === 'ineffective' ? 'text-red-700' : 'text-yellow-700'} />
                                            <span className="flex-1" />
                                            <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover/ctrl:opacity-100 text-muted-foreground hover:text-destructive"
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
                              {stepRisks.length === 0 && <p className="text-[10px] text-muted-foreground italic ml-4">No risks</p>}
                            </div>
                          )}

                          {/* Regulations */}
                          {canAccessModule('regulations') && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5 justify-between">
                                <div className="flex items-center gap-1.5">
                                  <Scale className="h-3 w-3 text-purple-500" />
                                  <span className="text-[11px] font-semibold text-purple-700">Regulations ({stepRegs.length})</span>
                                </div>
                                <Button variant="ghost" size="sm" className="h-5 text-[10px] text-purple-600" onClick={() => { setContextStepId(step.id); setAddDialog('regulation'); }}>
                                  <Plus className="h-3 w-3 mr-0.5" /> Add
                                </Button>
                              </div>
                              {stepRegs.map(reg => (
                                <div key={reg.id} className="ml-4 pl-3 border-l-2 border-purple-200 flex items-center gap-2 group/reg py-1">
                                  <InlineEdit value={reg.name} onSave={v => updateRegulation(reg.id, { name: v }).then(reload)} className="text-sm font-medium" />
                                  {reg.authority && <Badge variant="outline" className="text-[9px]">{reg.authority}</Badge>}
                                  <InlineSelect value={reg.compliance_status || 'partial'}
                                    options={[{ value: 'compliant', label: 'Compliant' }, { value: 'partial', label: 'Partial' }, { value: 'non-compliant', label: 'Non-Compliant' }]}
                                    onSave={v => updateRegulation(reg.id, { compliance_status: v }).then(reload)}
                                    className={reg.compliance_status === 'compliant' ? 'text-emerald-700' : reg.compliance_status === 'non-compliant' ? 'text-red-700' : 'text-yellow-700'} />
                                  <span className="flex-1" />
                                  <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover/reg:opacity-100 text-muted-foreground hover:text-destructive"
                                    onClick={() => deleteRegulation(reg.id).then(reload)}>
                                    <Trash2 className="h-2.5 w-2.5" />
                                  </Button>
                                </div>
                              ))}
                              {stepRegs.length === 0 && <p className="text-[10px] text-muted-foreground italic ml-4">No regulations</p>}
                            </div>
                          )}

                          {/* Incidents */}
                          {canAccessModule('incidents') && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5 justify-between">
                                <div className="flex items-center gap-1.5">
                                  <AlertCircle className="h-3 w-3 text-red-500" />
                                  <span className="text-[11px] font-semibold text-red-700">Incidents ({stepIncs.length})</span>
                                </div>
                                <Button variant="ghost" size="sm" className="h-5 text-[10px] text-red-600" onClick={() => { setContextStepId(step.id); setAddDialog('incident'); }}>
                                  <Plus className="h-3 w-3 mr-0.5" /> Add
                                </Button>
                              </div>
                              {stepIncs.map(inc => (
                                <div key={inc.id} className="ml-4 pl-3 border-l-2 border-red-200 flex items-center gap-2 group/inc py-1">
                                  <InlineEdit value={inc.title} onSave={v => updateIncident(inc.id, { title: v }).then(reload)} className="text-sm font-medium" />
                                  <InlineSelect value={inc.severity || 'medium'}
                                    options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }, { value: 'critical', label: 'Critical' }]}
                                    onSave={v => updateIncident(inc.id, { severity: v }).then(reload)}
                                    className={inc.severity === 'critical' ? 'text-red-700' : inc.severity === 'high' ? 'text-orange-700' : 'text-yellow-700'} />
                                  <InlineSelect value={inc.status || 'open'}
                                    options={[{ value: 'open', label: 'Open' }, { value: 'investigating', label: 'Investigating' }, { value: 'resolved', label: 'Resolved' }, { value: 'closed', label: 'Closed' }]}
                                    onSave={v => updateIncident(inc.id, { status: v }).then(reload)} />
                                  <span className="flex-1" />
                                  <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover/inc:opacity-100 text-muted-foreground hover:text-destructive"
                                    onClick={() => deleteIncident(inc.id).then(reload)}>
                                    <Trash2 className="h-2.5 w-2.5" />
                                  </Button>
                                </div>
                              ))}
                              {stepIncs.length === 0 && <p className="text-[10px] text-muted-foreground italic ml-4">No incidents</p>}
                            </div>
                          )}

                          {/* RACI */}
                          {canAccessModule('raci') && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5 justify-between">
                                <div className="flex items-center gap-1.5">
                                  <Users className="h-3 w-3 text-cyan-500" />
                                  <span className="text-[11px] font-semibold text-cyan-700">RACI ({stepRaci.length})</span>
                                </div>
                                <Button variant="ghost" size="sm" className="h-5 text-[10px] text-cyan-600" onClick={() => { setContextStepId(step.id); setAddDialog('raci'); }}>
                                  <Plus className="h-3 w-3 mr-0.5" /> Add
                                </Button>
                              </div>
                              {stepRaci.map(raci => (
                                <div key={raci.id} className="ml-4 pl-3 border-l-2 border-cyan-200 py-1 group/raci">
                                  <div className="flex items-center gap-2">
                                    <InlineEdit value={raci.role_name} onSave={v => updateStepRaci(raci.id, { role_name: v }).then(reload)} className="text-sm font-medium" />
                                    <span className="flex-1" />
                                    <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover/raci:opacity-100 text-muted-foreground hover:text-destructive"
                                      onClick={() => deleteStepRaci(raci.id).then(reload)}>
                                      <Trash2 className="h-2.5 w-2.5" />
                                    </Button>
                                  </div>
                                  <div className="flex gap-3 mt-1 flex-wrap text-[10px]">
                                    {raci.responsible && <Badge className="border-0 bg-emerald-100 text-emerald-700 text-[9px]">R: {raci.responsible}</Badge>}
                                    {raci.accountable && <Badge className="border-0 bg-blue-100 text-blue-700 text-[9px]">A: {raci.accountable}</Badge>}
                                    {raci.consulted && <Badge className="border-0 bg-amber-100 text-amber-700 text-[9px]">C: {raci.consulted}</Badge>}
                                    {raci.informed && <Badge className="border-0 bg-purple-100 text-purple-700 text-[9px]">I: {raci.informed}</Badge>}
                                  </div>
                                </div>
                              ))}
                              {stepRaci.length === 0 && <p className="text-[10px] text-muted-foreground italic ml-4">No RACI assignments</p>}
                            </div>
                          )}
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
                {connections.map(conn => {
                  const sourceType = steps.find(s => s.id === conn.source_step_id)?.type || 'in-scope';
                  const targetType = steps.find(s => s.id === conn.target_step_id)?.type || 'in-scope';
                  return (
                    <div key={conn.id} className="px-4 py-2.5 flex items-center gap-2 hover:bg-muted/30 group">
                      <TypeBadge type={sourceType} />
                      <span className="text-xs font-medium truncate max-w-[140px]">{stepMap[conn.source_step_id] || conn.source_step_id}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <TypeBadge type={targetType} />
                      <span className="text-xs font-medium truncate max-w-[140px]">{stepMap[conn.target_step_id] || conn.target_step_id}</span>
                      {conn.label && <Badge className="bg-primary/10 text-primary border-0 text-[9px] ml-2">{conn.label}</Badge>}
                      <span className="flex-1" />
                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteStepConnection(conn.id).then(reload)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
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
                        <Badge className={`text-[9px] border-0 ${imp.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>
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
      {addDialog === 'raci' && contextStepId && (
        <AddRaciDialog processId={processId} stepId={contextStepId} onClose={() => { setAddDialog(null); setContextStepId(null); }} onRefresh={reload} />
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
  const style = getTypeStyle(type);
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add Step</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5"><Label>Label *</Label><Input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Validate Payment" /></div>
          <div className="grid gap-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(typeLabel).map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${typeColors[v]?.dot || 'bg-gray-400'}`} />
                      {l}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Label>Source *</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>{steps.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${getTypeStyle(s.type).dot}`} />
                    {s.label}
                  </span>
                </SelectItem>
              ))}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Target *</Label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>{steps.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${getTypeStyle(s.type).dot}`} />
                    {s.label}
                  </span>
                </SelectItem>
              ))}</SelectContent>
            </Select>
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

function AddRaciDialog({ processId, stepId, onClose, onRefresh }: { processId: string; stepId: string; onClose: () => void; onRefresh: () => void }) {
  const [roleName, setRoleName] = useState('');
  const [responsible, setResponsible] = useState('');
  const [accountable, setAccountable] = useState('');
  const [consulted, setConsulted] = useState('');
  const [informed, setInformed] = useState('');
  const submit = async () => {
    if (!roleName.trim()) return;
    await insertStepRaci({
      process_id: processId, step_id: stepId, role_name: roleName.trim(),
      responsible: responsible || null, accountable: accountable || null,
      consulted: consulted || null, informed: informed || null,
    });
    toast({ title: 'RACI entry added' }); onRefresh(); onClose();
  };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add RACI Assignment</DialogTitle>
          <DialogDescription>Define who is Responsible, Accountable, Consulted, and Informed for this step.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5"><Label>Role / Function Name *</Label><Input value={roleName} onChange={e => setRoleName(e.target.value)} placeholder="e.g. Finance Manager, IT Operations" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>Responsible</Label><Input value={responsible} onChange={e => setResponsible(e.target.value)} placeholder="Person / team" /></div>
            <div className="grid gap-1.5"><Label>Accountable</Label><Input value={accountable} onChange={e => setAccountable(e.target.value)} placeholder="Person / team" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>Consulted</Label><Input value={consulted} onChange={e => setConsulted(e.target.value)} placeholder="Person / team" /></div>
            <div className="grid gap-1.5"><Label>Informed</Label><Input value={informed} onChange={e => setInformed(e.target.value)} placeholder="Person / team" /></div>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit}>Add</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
