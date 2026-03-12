import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Plus, Trash2, ArrowRight, ShieldAlert, ShieldCheck, Scale,
  AlertCircle, Database, HelpCircle, ChevronDown, ChevronRight, Pencil, Users,
  Check, X, Save, Monitor, Cpu, Link2, CircleHelp, ClipboardList, Download, Upload as UploadIcon
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  fetchSteps, fetchStepConnections, fetchRisks, fetchControls, fetchAllControls,
  fetchRegulations, fetchIncidents, fetchMainframeImports, fetchMFQuestions,
  insertStep, deleteStep, updateStep,
  insertStepConnection, deleteStepConnection,
  insertRisk, deleteRisk, updateRisk,
  insertControl, deleteControl, updateControl,
  insertRegulation, deleteRegulation, updateRegulation,
  insertIncident, deleteIncident, updateIncident,
  insertMainframeImport, deleteMainframeImport,
  insertMFQuestion, deleteMFQuestion,
  type ProcessStep, type StepConnection, type Risk, type Control,
  type Regulation, type Incident, type MainframeImport, type MFQuestion,
} from '@/lib/api';
import {
  fetchProcessRaci, insertProcessRaci, updateProcessRaci, deleteProcessRaci,
  fetchRaciStepLinks, insertRaciStepLink, deleteRaciStepLink,
  type ProcessRaci, type ProcessRaciStepLink,
} from '@/lib/api-raci';
import { fetchStepApplications, insertStepApplication, updateStepApplication, deleteStepApplication, type StepApplication } from '@/lib/api-applications';
import { fetchMainframeFlows, fetchMFFlowNodes, type MainframeFlow, type MFFlowNode, MF_NODE_TYPE_META } from '@/lib/api-mainframe-flows';
import { StepTypeBadge, STEP_TYPE_OPTIONS } from '@/components/StepTypeBadge';
import {
  fetchActiveQuestions, fetchQuestions, fetchStepLinks, upsertStepLink, updateQuestion,
  type QuestionnaireQuestion, type QuestionnaireStepLink,
} from '@/lib/api-questionnaire';
import { exportRaciToExcel, parseRaciExcel, type ImportedRaciRow } from '@/lib/raci-excel';

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
  'interface': 'Business Process',
  'event': 'Event',
  'xor': 'XOR Gateway',
  'decision': 'Decision',
  'start-end': 'Start / End',
  'storage': 'Storage',
  'delay': 'Delay',
  'document': 'Document',
};

const typeDescriptions: Record<string, string> = {
  'in-scope': 'A core process step that is within the scope of the audit/review. Risks, controls, regulations, and incidents can be attached.',
  'interface': 'A reference to another business process that connects to this flow. Used for cross-process linkage.',
  'event': 'An event that triggers or results from a process activity (e.g., receiving an email, timer expiring).',
  'xor': 'An exclusive gateway (XOR) where the flow splits into exactly one of multiple paths based on a condition.',
  'decision': 'A decision point where a choice or judgment is made that affects the process flow.',
  'start-end': 'Marks the beginning or end of the process flow.',
  'storage': 'A data store or repository where information is saved or retrieved.',
  'delay': 'A waiting period or delay in the process (e.g., approval pending, batch processing window).',
  'document': 'A document or report that is produced, consumed, or referenced in the process.',
};

function getTypeStyle(type: string) {
  return typeColors[type] || typeColors['in-scope'];
}

type AddDialog = 'step' | 'risk' | 'control' | 'regulation' | 'incident' | 'import' | 'mfq' | 'connection' | 'raci' | 'application' | null;

// Multi-person RACI field with tags
function RaciPeopleField({ label, color, value, onSave }: {
  label: string; color: string; value: string; onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const people = value ? value.split(',').map(p => p.trim()).filter(Boolean) : [];

  const colorMap: Record<string, { bg: string; text: string }> = {
    emerald: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-700' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-700' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-700' },
  };
  const c = colorMap[color] || colorMap.emerald;

  const addPerson = () => {
    if (!draft.trim()) return;
    const newPeople = [...people, draft.trim()];
    onSave(newPeople.join(', '));
    setDraft('');
    setEditing(false);
  };

  const removePerson = (idx: number) => {
    const newPeople = people.filter((_, i) => i !== idx);
    onSave(newPeople.join(', '));
  };

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className={`font-bold ${c.text} text-[10px]`}>{label}:</span>
      {people.map((p, i) => (
        <Badge key={i} className={`border-0 ${c.bg} ${c.text} text-[9px] gap-0.5 cursor-pointer hover:opacity-70`}
          onClick={() => removePerson(i)}>
          {p} ×
        </Badge>
      ))}
      {editing ? (
        <span className="inline-flex items-center gap-0.5">
          <Input value={draft} onChange={e => setDraft(e.target.value)} className="h-5 text-[10px] w-24 px-1"
            autoFocus placeholder="Name..."
            onKeyDown={e => { if (e.key === 'Enter') addPerson(); if (e.key === 'Escape') setEditing(false); }} />
          <Button variant="ghost" size="icon" className="h-4 w-4" onClick={addPerson}><Check className="h-2.5 w-2.5" /></Button>
          <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => setEditing(false)}><X className="h-2.5 w-2.5" /></Button>
        </span>
      ) : (
        <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => setEditing(true)} title={`Add ${label} person`}>
          <Plus className="h-2.5 w-2.5 text-muted-foreground" />
        </Button>
      )}
    </div>
  );
}

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
  const [raciEntries, setRaciEntries] = useState<ProcessRaci[]>([]);
  const [raciStepLinks, setRaciStepLinks] = useState<ProcessRaciStepLink[]>([]);
  const [mfFlows, setMfFlows] = useState<MainframeFlow[]>([]);
  const [mfFlowNodes, setMfFlowNodes] = useState<MFFlowNode[]>([]);
  const [questQuestions, setQuestQuestions] = useState<QuestionnaireQuestion[]>([]);
  const [questLinks, setQuestLinks] = useState<QuestionnaireStepLink[]>([]);
  const [savingQuestLink, setSavingQuestLink] = useState<string | null>(null);
  const [questVisible, setQuestVisible] = useState<Record<string, boolean>>({});
  const [questSectionsOpen, setQuestSectionsOpen] = useState<Record<string, boolean>>({});
  const [addDialog, setAddDialog] = useState<AddDialog>(null);
  const [contextStepId, setContextStepId] = useState<string | null>(null);
  const [contextRiskId, setContextRiskId] = useState<string | null>(null);
  const [contextScreenId, setContextScreenId] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  // Global sections
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    steps: true, connections: true, imports: true, mfq: true, raci: true,
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
    const [s, c, r, ctrl, reg, inc, imp, mfq, raci, raciLinks, apps, flows, qq, ql] = await Promise.all([
      fetchSteps(processId), fetchStepConnections(processId),
      fetchRisks(processId), fetchAllControls(),
      fetchRegulations(processId), fetchIncidents(processId),
      fetchMainframeImports(processId), fetchMFQuestions(processId),
      fetchProcessRaci(processId), fetchRaciStepLinks(processId),
      fetchStepApplications(processId),
      fetchMainframeFlows(processId),
      fetchQuestions(),
      fetchStepLinks(processId),
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
    setRaciStepLinks(raciLinks);
    setApplications(apps);
    setMfFlows(flows);
    setQuestQuestions(qq.filter(q => q.is_active));
    setQuestLinks(ql);
    // Fetch all flow nodes
    const allNodes = await Promise.all(flows.map(f => fetchMFFlowNodes(f.id)));
    setMfFlowNodes(allNodes.flat());
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

  // Questionnaire helpers
  const questLinkMap = useMemo(() => {
    const m: Record<string, boolean> = {};
    questLinks.forEach(l => { if (l.is_relevant) m[`${l.question_id}:${l.step_id}`] = true; });
    return m;
  }, [questLinks]);

  const inScopeSteps = useMemo(() => steps.filter(s => s.type === 'in-scope'), [steps]);

  const getStepQuestions = (stepId: string) => {
    const step = steps.find(s => s.id === stepId);
    if (!step) return [];
    return questQuestions.filter(q => {
      // Hide L3 questions
      if (q.importance_level === 3) return false;
      if (q.step_types.length === 0) return true;
      if (!step.step_type) return true;
      return q.step_types.includes(step.step_type);
    });
  };

  const handleQuestToggle = async (questionId: string, stepId: string, current: boolean) => {
    const key = `${questionId}:${stepId}`;
    setSavingQuestLink(key);
    try {
      await upsertStepLink({ process_id: processId, question_id: questionId, step_id: stepId, is_relevant: !current });
      setQuestLinks(prev => {
        const existing = prev.find(l => l.question_id === questionId && l.step_id === stepId);
        if (existing) return prev.map(l => l.question_id === questionId && l.step_id === stepId ? { ...l, is_relevant: !current } : l);
        return [...prev, { id: crypto.randomUUID(), process_id: processId, question_id: questionId, step_id: stepId, is_relevant: !current, created_at: new Date().toISOString() }];
      });
    } catch (err: any) {
      toast({ title: 'Error saving', description: err.message, variant: 'destructive' });
    } finally {
      setSavingQuestLink(null);
    }
  };

  const handleQuestionConfigChange = async (questionId: string, updates: Partial<QuestionnaireQuestion>) => {
    try {
      await updateQuestion(questionId, updates);
      setQuestQuestions(prev => prev.map(q => q.id === questionId ? { ...q, ...updates } : q));
    } catch (err: any) {
      toast({ title: 'Error updating question', description: err.message, variant: 'destructive' });
    }
  };

  const toggleQuestVisible = (stepId: string) =>
    setQuestVisible(prev => ({ ...prev, [stepId]: !prev[stepId] }));

  const toggleQuestSection = (key: string) =>
    setQuestSectionsOpen(prev => ({ ...prev, [key]: prev[key] === undefined ? false : !prev[key] }));

  // Get step-related data
  const getStepRisks = (stepId: string) => risks.filter(r => r.step_id === stepId);
  const getStepRegulations = (stepId: string) => regulations.filter(r => r.step_id === stepId);
  const getStepIncidents = (stepId: string) => incidents.filter(i => i.step_id === stepId);
  const getStepRaciLinks = (stepId: string) => raciStepLinks.filter(l => l.step_id === stepId);
  const getStepApps = (stepId: string) => applications.filter(a => a.step_id === stepId);
  const getRiskControls = (riskId: string) => controls.filter(c => c.risk_id === riskId);

  const countRelations = (stepId: string) => {
    const r = getStepRisks(stepId).length;
    const reg = getStepRegulations(stepId).length;
    const inc = getStepIncidents(stepId).length;
    const raciLinked = getStepRaciLinks(stepId).length;
    const apps = getStepApps(stepId).length;
    return r + reg + inc + raciLinked + apps;
  };

  return (
    <div className="space-y-3">
      {/* Summary Bar */}
      <div className="grid grid-cols-4 md:grid-cols-10 gap-2">
        {[
          { label: 'Steps', count: steps.length, dot: 'bg-emerald-500' },
          { label: 'Bus. Processes', count: steps.filter(s => s.type === 'interface').length, dot: 'bg-slate-400' },
          { label: 'Connections', count: connections.length, dot: 'bg-slate-500' },
          { label: 'Risks', count: risks.length, dot: 'bg-orange-500' },
          { label: 'Controls', count: controls.length, dot: 'bg-blue-500' },
          { label: 'Regulations', count: regulations.length, dot: 'bg-purple-500' },
          { label: 'Incidents', count: incidents.length, dot: 'bg-red-500' },
          { label: 'Scr./App.', count: applications.length, dot: 'bg-sky-500' },
          { label: 'MF Sources', count: imports.length, dot: 'bg-amber-500' },
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
                  const stepRaciLinked = getStepRaciLinks(step.id);
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
                        {step.step_type && <StepTypeBadge stepType={step.step_type as any} />}
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
                          <Button variant="ghost" size="icon" className="h-6 w-6" title="Add Application"
                            onClick={() => { setContextStepId(step.id); setAddDialog('application'); }}>
                            <Monitor className="h-3 w-3 text-sky-500" />
                          </Button>
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
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0">
                                    <CircleHelp className="h-3.5 w-3.5 text-muted-foreground" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-[300px]">
                                  <p className="text-xs font-medium mb-1">{typeLabel[step.type] || step.type}</p>
                                  <p className="text-xs text-muted-foreground">{typeDescriptions[step.type] || 'No description available.'}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>

                          {/* Step Type (Critical/Mechanical/Decisional) - only for in-scope steps */}
                          {step.type === 'in-scope' && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground font-medium">Step Type:</span>
                            <InlineSelect
                              value={step.step_type || '__none__'}
                              options={[{ value: '__none__', label: '— None —' }, ...STEP_TYPE_OPTIONS]}
                              onSave={v => updateStep(step.id, { step_type: v === '__none__' ? null : v } as any).then(reload)}
                            />
                            {step.step_type && <StepTypeBadge stepType={step.step_type as any} />}
                          </div>
                          )}

                          {/* Business Process Questionnaire — after step type, before risks */}
                          {step.type === 'in-scope' && (() => {
                            const stepQs = getStepQuestions(step.id);
                            const relevantCount = stepQs.filter(q => questLinkMap[`${q.id}:${step.id}`]).length;
                            const sectionNums = [...new Set(stepQs.map(q => q.section_number))].sort();
                            const isQuestVisible = questVisible[step.id] !== false;

                            if (!step.step_type) {
                              return (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-1.5">
                                    <ClipboardList className="h-3 w-3 text-indigo-500" />
                                    <span className="text-[11px] font-semibold text-indigo-700">Business Process Questionnaire</span>
                                  </div>
                                  <div className="ml-4 pl-3 border-l-2 border-indigo-200">
                                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                                      <CircleHelp className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                      <p className="text-[11px] text-amber-800">
                                        Please set the <strong>Step Type</strong> above (Critical, Decisional, or Mechanical) to see the relevant questionnaire.
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div className="space-y-2">
                                <div className="flex items-center gap-1.5 justify-between">
                                  <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => toggleQuestVisible(step.id)}>
                                    {isQuestVisible ? <ChevronDown className="h-3 w-3 text-indigo-500" /> : <ChevronRight className="h-3 w-3 text-indigo-500" />}
                                    <ClipboardList className="h-3 w-3 text-indigo-500" />
                                    <span className="text-[11px] font-semibold text-indigo-700">Business Process Questionnaire</span>
                                    <Badge variant="outline" className="text-[9px] border-indigo-300 text-indigo-600">
                                      {relevantCount}/{stepQs.length} linked
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-muted-foreground capitalize">
                                      <strong>{step.step_type}</strong> step
                                    </span>
                                    <Button variant="ghost" size="sm" className="h-5 text-[10px] text-indigo-600" onClick={() => toggleQuestVisible(step.id)}>
                                      {isQuestVisible ? 'Hide' : 'Show'}
                                    </Button>
                                  </div>
                                </div>

                                {isQuestVisible && (
                                  <>
                                    {stepQs.length === 0 ? (
                                      <p className="text-[10px] text-muted-foreground italic ml-4">No questions available for {step.step_type} steps.</p>
                                    ) : (
                                      <div className="ml-4 pl-3 border-l-2 border-indigo-200 space-y-3">
                                        <p className="text-[10px] text-muted-foreground">
                                          Select relevant questions, set their importance, and choose which other steps they also apply to.
                                        </p>
                                        {sectionNums.map(sn => {
                                          const sectionQs = stepQs.filter(q => q.section_number === sn);
                                          const sectionName = sectionQs[0]?.section_name || '';
                                          const sectionRelevant = sectionQs.filter(q => questLinkMap[`${q.id}:${step.id}`]).length;
                                          const sectionKey = `${step.id}:${sn}`;
                                          const isSectionOpen = questSectionsOpen[sectionKey] !== false;

                                          return (
                                            <div key={sn} className="space-y-1">
                                              <div
                                                className="flex items-center justify-between cursor-pointer rounded px-1 py-0.5 hover:bg-indigo-50/50 transition-colors"
                                                onClick={() => toggleQuestSection(sectionKey)}
                                              >
                                                <div className="flex items-center gap-1.5">
                                                  {isSectionOpen ? <ChevronDown className="h-3 w-3 text-indigo-400" /> : <ChevronRight className="h-3 w-3 text-indigo-400" />}
                                                  <p className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider">
                                                    Section {sn}: {sectionName}
                                                  </p>
                                                </div>
                                                <span className="text-[9px] text-muted-foreground">{sectionRelevant}/{sectionQs.length}</span>
                                              </div>

                                              {isSectionOpen && (
                                                <div className="space-y-2 ml-1">
                                                  {sectionQs.map(q => {
                                                    const isLinkedToThis = !!questLinkMap[`${q.id}:${step.id}`];
                                                    const linkedSteps = inScopeSteps.filter(s => questLinkMap[`${q.id}:${s.id}`]);
                                                    const lKey = `${q.id}:${step.id}`;
                                                    const isSaving = savingQuestLink === lKey;
                                                    return (
                                                      <div key={q.id} className={`rounded-lg border p-3 space-y-2.5 transition-colors ${isLinkedToThis ? 'bg-indigo-50/50 border-indigo-200' : 'bg-card'}`}>
                                                        {/* Question with link checkbox */}
                                                        <div className="flex items-start gap-2">
                                                          <Checkbox
                                                            checked={isLinkedToThis}
                                                            onCheckedChange={() => handleQuestToggle(q.id, step.id, isLinkedToThis)}
                                                            disabled={isSaving}
                                                            className="h-4 w-4 mt-0.5"
                                                          />
                                                          <div className="flex-1 min-w-0">
                                                            <p className="text-[11px] leading-relaxed font-medium">
                                                              <span className="font-mono text-muted-foreground mr-1">Q{q.question_number}.</span>
                                                              {q.question_text}
                                                            </p>
                                                            {q.observation_text && (
                                                              <p className="text-[10px] text-muted-foreground mt-0.5 italic">↳ {q.observation_text}</p>
                                                            )}
                                                          </div>
                                                          {/* Importance badge */}
                                                          <Badge variant="outline" className={`text-[8px] shrink-0 ${q.importance_level === 1 ? 'border-red-300 text-red-600' : 'border-yellow-300 text-yellow-700'}`}>
                                                            L{q.importance_level}
                                                          </Badge>
                                                        </div>

                                                        {/* Show details only when linked */}
                                                        {isLinkedToThis && (
                                                          <>
                                                            {/* Importance selector */}
                                                            <div className="flex items-center gap-2 border-t pt-2">
                                                              <span className="text-[10px] text-muted-foreground font-medium">Importance:</span>
                                                              <Select
                                                                value={String(q.importance_level)}
                                                                onValueChange={v => handleQuestionConfigChange(q.id, { importance_level: parseInt(v) })}
                                                              >
                                                                <SelectTrigger className="h-5 text-[10px] w-auto min-w-[110px] border-dashed">
                                                                  <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                  <SelectItem value="1">L1 — Very Important</SelectItem>
                                                                  <SelectItem value="2">L2 — Important</SelectItem>
                                                                  <SelectItem value="3">L3 — Not Important</SelectItem>
                                                                </SelectContent>
                                                              </Select>
                                                            </div>

                                                            {/* Step relevance */}
                                                            <div className="border-t pt-2">
                                                              <p className="text-[10px] font-medium text-muted-foreground mb-1.5">
                                                                Also relevant for these steps:
                                                              </p>
                                                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                                                                {inScopeSteps.filter(s => s.id !== step.id).map(s => {
                                                                  const sKey = `${q.id}:${s.id}`;
                                                                  const isOtherLinked = !!questLinkMap[sKey];
                                                                  const isOtherSaving = savingQuestLink === sKey;
                                                                  return (
                                                                    <label
                                                                      key={s.id}
                                                                      className={`flex items-center gap-1.5 text-[10px] px-2 py-1.5 rounded border cursor-pointer transition-all ${
                                                                        isOtherLinked
                                                                          ? 'bg-indigo-50 border-indigo-200'
                                                                          : 'bg-muted/20 border-border hover:bg-muted/40'
                                                                      } ${isOtherSaving ? 'opacity-50' : ''}`}
                                                                    >
                                                                      <Checkbox
                                                                        checked={isOtherLinked}
                                                                        onCheckedChange={() => handleQuestToggle(q.id, s.id, isOtherLinked)}
                                                                        disabled={isOtherSaving}
                                                                        className="h-3 w-3"
                                                                      />
                                                                      <span className="truncate">{s.label}</span>
                                                                      {s.step_type && (
                                                                        <Badge variant="outline" className="text-[7px] px-1 py-0 ml-auto shrink-0 capitalize">{s.step_type.charAt(0)}</Badge>
                                                                      )}
                                                                    </label>
                                                                  );
                                                                })}
                                                              </div>
                                                              {linkedSteps.length > 1 && (
                                                                <p className="text-[9px] text-indigo-600 mt-1">
                                                                  Linked to {linkedSteps.length} steps total
                                                                </p>
                                                              )}
                                                            </div>
                                                          </>
                                                        )}
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            );
                          })()}

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
                                          <div key={ctrl.id} className="text-xs py-1 group/ctrl space-y-1">
                                            <div className="flex items-center gap-2">
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
                                            <div className="flex items-center gap-2 ml-5">
                                              <InlineSelect value={(ctrl as any).automation_level || '__none__'} 
                                                options={[{ value: '__none__', label: '— Automation —' }, { value: 'automatic', label: 'Automatic' }, { value: 'semi-automatic', label: 'Semi-Automatic' }, { value: 'manual', label: 'Manual' }]}
                                                onSave={v => updateControl(ctrl.id, { automation_level: v === '__none__' ? null : v } as any).then(reload)} />
                                              <InlineSelect value={(ctrl as any).frequency || '__none__'} 
                                                options={[{ value: '__none__', label: '— Frequency —' }, { value: 'multiple_daily', label: 'Multiple/Day' }, { value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }, { value: 'quarterly', label: 'Quarterly' }, { value: 'yearly', label: 'Yearly' }]}
                                                onSave={v => updateControl(ctrl.id, { frequency: v === '__none__' ? null : v } as any).then(reload)} />
                                              <span className="text-[10px] text-muted-foreground">Last tested:</span>
                                              <InlineEdit value={(ctrl as any).last_tested || ''} onSave={v => updateControl(ctrl.id, { last_tested: v } as any).then(reload)} className="text-[10px]" />
                                            </div>
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
                                <div key={inc.id} className="ml-4 pl-3 border-l-2 border-red-200 group/inc py-1 space-y-1">
                                  <div className="flex items-center gap-2">
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
                                  <div className="flex items-center gap-2 text-xs ml-1">
                                    <span className="text-[10px] text-muted-foreground">Owner:</span>
                                    <InlineEdit value={(inc as any).owner_department || ''} onSave={v => updateIncident(inc.id, { owner_department: v } as any).then(reload)} className="text-[10px]" />
                                    <InlineSelect value={(inc as any).root_cause || '__none__'}
                                      options={[{ value: '__none__', label: '— Root Cause —' }, { value: 'people', label: 'People' }, { value: 'system', label: 'System' }, { value: 'market', label: 'Market' }, { value: 'regulations', label: 'Regulations' }]}
                                      onSave={v => updateIncident(inc.id, { root_cause: v === '__none__' ? null : v } as any).then(reload)} />
                                  </div>
                                  <div className="flex items-center gap-2 text-xs ml-1">
                                    <span className="text-[10px] text-muted-foreground">Loss:</span>
                                    <InlineEdit value={(inc as any).money_loss_amount || ''} onSave={v => updateIncident(inc.id, { money_loss_amount: v } as any).then(reload)} className="text-[10px]" />
                                    <span className="text-[10px] text-muted-foreground">Threshold:</span>
                                    <InlineEdit value={(inc as any).loss_threshold || ''} onSave={v => updateIncident(inc.id, { loss_threshold: v } as any).then(reload)} className="text-[10px]" />
                                  </div>
                                </div>
                              ))}
                              {stepIncs.length === 0 && <p className="text-[10px] text-muted-foreground italic ml-4">No incidents</p>}
                            </div>
                          )}

                          {/* RACI (inherited from process level) */}
                          {canAccessModule('raci') && (() => {
                            const stepLinks = getStepRaciLinks(step.id);
                            const linkedRacis = stepLinks.map(l => raciEntries.find(r => r.id === l.raci_id)).filter(Boolean) as ProcessRaci[];
                            return linkedRacis.length > 0 ? (
                              <div className="space-y-2">
                                <div className="flex items-center gap-1.5">
                                  <Users className="h-3 w-3 text-cyan-500" />
                                  <span className="text-[11px] font-semibold text-cyan-700">RACI ({linkedRacis.length} linked)</span>
                                </div>
                                {linkedRacis.map(raci => (
                                  <div key={raci.id} className="ml-4 pl-3 border-l-2 border-cyan-200 py-1">
                                    <span className="text-sm font-medium">{raci.role_name}</span>
                                    <div className="flex gap-3 mt-1 flex-wrap text-[10px]">
                                      {raci.responsible && <Badge className="border-0 bg-emerald-100 text-emerald-700 text-[9px]">R: {raci.responsible}</Badge>}
                                      {raci.accountable && <Badge className="border-0 bg-blue-100 text-blue-700 text-[9px]">A: {raci.accountable}</Badge>}
                                      {raci.consulted && <Badge className="border-0 bg-amber-100 text-amber-700 text-[9px]">C: {raci.consulted}</Badge>}
                                      {raci.informed && <Badge className="border-0 bg-purple-100 text-purple-700 text-[9px]">I: {raci.informed}</Badge>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : null;
                          })()}

                          {/* Applications */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5 justify-between">
                              <div className="flex items-center gap-1.5">
                                <Monitor className="h-3 w-3 text-sky-500" />
                                <span className="text-[11px] font-semibold text-sky-700">Screens / Applications ({stepApps.length})</span>
                              </div>
                              <Button variant="ghost" size="sm" className="h-5 text-[10px] text-sky-600" onClick={() => { setContextStepId(step.id); setAddDialog('application'); }}>
                                <Plus className="h-3 w-3 mr-0.5" /> Add
                              </Button>
                            </div>
                            {/* Screens with nested apps */}
                            {stepApps.filter(a => a.app_type === 'screen' && !a.parent_id).map(screen => {
                              const childApps = stepApps.filter(a => a.parent_id === screen.id);
                              return (
                                <div key={screen.id} className="ml-4 pl-3 border-l-2 border-sky-200 space-y-1">
                                  <div className="flex items-center gap-2 group/app py-1">
                                    <Monitor className="h-3 w-3 text-sky-400 shrink-0" />
                                    <InlineEdit value={screen.name} onSave={v => updateStepApplication(screen.id, { name: v }).then(reload)} className="text-sm font-medium" />
                                    <Badge className="border-0 bg-sky-100 text-sky-700 text-[9px]">Screen</Badge>
                                    <span className="flex-1" />
                                    <Button variant="ghost" size="sm" className="h-5 text-[10px] text-sky-600 opacity-0 group-hover/app:opacity-100"
                                      onClick={() => { setContextStepId(step.id); setContextScreenId(screen.id); setAddDialog('application'); }}>
                                      <Plus className="h-2.5 w-2.5 mr-0.5" /> App
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover/app:opacity-100 text-muted-foreground hover:text-destructive"
                                      onClick={() => deleteStepApplication(screen.id).then(reload)}>
                                      <Trash2 className="h-2.5 w-2.5" />
                                    </Button>
                                  </div>
                                  {childApps.length > 0 && (
                                    <div className="ml-4 pl-3 border-l-2 border-sky-100 space-y-1">
                                      {childApps.map(app => (
                                        <div key={app.id} className="flex items-center gap-2 group/child py-0.5">
                                          <Monitor className="h-2.5 w-2.5 text-sky-300 shrink-0" />
                                          <InlineEdit value={app.name} onSave={v => updateStepApplication(app.id, { name: v }).then(reload)} className="text-xs" />
                                          <Badge variant="outline" className="text-[8px]">App</Badge>
                                          <span className="flex-1" />
                                          <Button variant="ghost" size="icon" className="h-4 w-4 opacity-0 group-hover/child:opacity-100 text-muted-foreground hover:text-destructive"
                                            onClick={() => deleteStepApplication(app.id).then(reload)}>
                                            <Trash2 className="h-2 w-2" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            {/* Standalone applications (no parent, not screens) */}
                            {stepApps.filter(a => a.app_type !== 'screen' && !a.parent_id).map(app => (
                              <div key={app.id} className="ml-4 pl-3 border-l-2 border-sky-200 flex items-center gap-2 group/app py-1">
                                <Monitor className="h-3 w-3 text-sky-400 shrink-0" />
                                <InlineEdit value={app.name} onSave={v => updateStepApplication(app.id, { name: v }).then(reload)} className="text-sm font-medium" />
                                <Badge variant="outline" className="text-[9px] capitalize">{app.app_type}</Badge>
                                <span className="flex-1" />
                                <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover/app:opacity-100 text-muted-foreground hover:text-destructive"
                                  onClick={() => deleteStepApplication(app.id).then(reload)}>
                                  <Trash2 className="h-2.5 w-2.5" />
                                </Button>
                              </div>
                            ))}
                            {stepApps.length === 0 && <p className="text-[10px] text-muted-foreground italic ml-4">No applications</p>}
                          </div>
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

      {/* MF Data Sources — Hierarchical View */}
      <Collapsible open={openSections.imports} onOpenChange={() => toggleSection('imports')}>
        <Card>
          <CardHeader className="py-2 px-4">
            <SectionHeader icon={Database} title="MF Data Sources" count={imports.length} sectionKey="imports"
              onAdd={() => setAddDialog('import')} />
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="p-0">
              {imports.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No MF data sources</p>
              ) : (
                <div className="divide-y">
                  {/* Group imports by step */}
                  {(() => {
                    const inScopeSteps = steps.filter(s => s.type === 'in-scope');
                    const unlinkedImports = imports.filter(i => !i.step_id);
                    
                    return (
                      <>
                        {inScopeSteps.map(step => {
                          const stepImports = imports.filter(i => i.step_id === step.id);
                          const stepFlows = mfFlows.filter(f => f.step_id === step.id);
                          if (stepImports.length === 0 && stepFlows.length === 0) return null;
                          
                          return (
                            <div key={step.id} className="border-l-4 border-emerald-300">
                              {/* Step header */}
                              <div className="px-4 py-2 bg-emerald-50/50 flex items-center gap-2">
                                <TypeBadge type="in-scope" />
                                <span className="text-xs font-semibold flex-1">{step.label}</span>
                                <Badge variant="secondary" className="text-[9px]">{stepImports.length} source(s)</Badge>
                                {stepFlows.length > 0 && <Badge className="text-[9px] border-0 bg-blue-100 text-blue-700">{stepFlows.length} flow(s)</Badge>}
                              </div>
                              
                              {/* Mainframe Flows under this step */}
                              {stepFlows.map(flow => {
                                const flowNodes = mfFlowNodes.filter(n => n.flow_id === flow.id);
                                const flowImports = stepImports.filter(i => i.flow_id === flow.id);
                                
                                return (
                                  <div key={flow.id} className="ml-6 border-l-2 border-blue-200">
                                    <div className="px-3 py-1.5 flex items-center gap-2 bg-blue-50/30">
                                      <Cpu className="h-3 w-3 text-blue-500" />
                                      <span className="text-[11px] font-semibold text-blue-700">{flow.name}</span>
                                      {flowNodes.length > 0 && <Badge variant="outline" className="text-[8px]">{flowNodes.length} nodes</Badge>}
                                    </div>
                                    
                                    {/* Imports linked to specific flow nodes */}
                                    {flowNodes.map(node => {
                                      const nodeImports = flowImports.filter(i => i.flow_node_id === node.id);
                                      if (nodeImports.length === 0) return null;
                                      const meta = MF_NODE_TYPE_META[node.node_type as keyof typeof MF_NODE_TYPE_META];
                                      
                                      return (
                                        <div key={node.id} className="ml-4 border-l-2 border-slate-200">
                                          <div className="px-3 py-1 flex items-center gap-2">
                                            <Link2 className="h-2.5 w-2.5 text-muted-foreground" />
                                            <span className="text-[10px] font-medium" style={{ color: meta?.color }}>{node.label}</span>
                                            {meta && <Badge variant="outline" className="text-[8px]" style={{ borderColor: meta.color, color: meta.color }}>{meta.label}</Badge>}
                                          </div>
                                          {nodeImports.map(imp => (
                                            <div key={imp.id} className="ml-6 px-3 py-1.5 flex items-center gap-2 hover:bg-muted/30 group">
                                              <Database className="h-3 w-3 text-amber-500 shrink-0" />
                                              <span className="text-xs font-medium">{imp.source_name}</span>
                                              <Badge variant="outline" className="text-[8px]">{imp.source_type}</Badge>
                                              {imp.dataset_name && <Badge variant="outline" className="text-[8px]">{imp.dataset_name}</Badge>}
                                              <Badge variant="outline" className="text-[8px]">{imp.record_count} rec.</Badge>
                                              <Badge className={`text-[8px] border-0 ${imp.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>{imp.status}</Badge>
                                              <span className="flex-1" />
                                              <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                                                onClick={() => deleteMainframeImport(imp.id).then(reload)}>
                                                <Trash2 className="h-2.5 w-2.5" />
                                              </Button>
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    })}
                                    
                                    {/* Imports linked to flow but no specific node */}
                                    {flowImports.filter(i => !i.flow_node_id).map(imp => (
                                      <div key={imp.id} className="ml-4 px-3 py-1.5 flex items-center gap-2 hover:bg-muted/30 group">
                                        <Database className="h-3 w-3 text-amber-500 shrink-0" />
                                        <span className="text-xs font-medium">{imp.source_name}</span>
                                        <Badge variant="outline" className="text-[8px]">{imp.source_type}</Badge>
                                        {imp.dataset_name && <Badge variant="outline" className="text-[8px]">{imp.dataset_name}</Badge>}
                                        <Badge variant="outline" className="text-[8px]">{imp.record_count} rec.</Badge>
                                        <Badge className={`text-[8px] border-0 ${imp.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>{imp.status}</Badge>
                                        <span className="flex-1" />
                                        <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                                          onClick={() => deleteMainframeImport(imp.id).then(reload)}>
                                          <Trash2 className="h-2.5 w-2.5" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })}
                              
                              {/* Imports linked to step but no flow */}
                              {stepImports.filter(i => !i.flow_id).map(imp => (
                                <div key={imp.id} className="ml-6 px-3 py-2 flex items-center gap-2 hover:bg-muted/30 group">
                                  <Database className="h-3 w-3 text-amber-500 shrink-0" />
                                  <span className="text-xs font-medium">{imp.source_name}</span>
                                  <Badge variant="outline" className="text-[9px]">{imp.source_type}</Badge>
                                  {imp.dataset_name && <Badge variant="outline" className="text-[9px]">{imp.dataset_name}</Badge>}
                                  <Badge variant="outline" className="text-[9px]">{imp.record_count} records</Badge>
                                  <Badge className={`text-[9px] border-0 ${imp.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>{imp.status}</Badge>
                                  <span className="flex-1" />
                                  <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                                    onClick={() => deleteMainframeImport(imp.id).then(reload)}>
                                    <Trash2 className="h-2.5 w-2.5" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                        
                        {/* Unlinked imports (no step) */}
                        {unlinkedImports.length > 0 && (
                          <div className="border-l-4 border-slate-300">
                            <div className="px-4 py-2 bg-slate-50/50 flex items-center gap-2">
                              <Badge variant="outline" className="text-[9px]">Unlinked</Badge>
                              <span className="text-xs font-semibold text-muted-foreground flex-1">Not linked to a step</span>
                              <Badge variant="secondary" className="text-[9px]">{unlinkedImports.length} source(s)</Badge>
                            </div>
                            {unlinkedImports.map(imp => (
                              <div key={imp.id} className="ml-6 px-3 py-2 flex items-center gap-2 hover:bg-muted/30 group">
                                <Database className="h-3 w-3 text-amber-500 shrink-0" />
                                <span className="text-xs font-medium">{imp.source_name}</span>
                                <Badge variant="outline" className="text-[9px]">{imp.source_type}</Badge>
                                {imp.dataset_name && <Badge variant="outline" className="text-[9px]">{imp.dataset_name}</Badge>}
                                <Badge variant="outline" className="text-[9px]">{imp.record_count} records</Badge>
                                <Badge className={`text-[9px] border-0 ${imp.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>{imp.status}</Badge>
                                <span className="flex-1" />
                                <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                                  onClick={() => deleteMainframeImport(imp.id).then(reload)}>
                                  <Trash2 className="h-2.5 w-2.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
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

      {/* RACI (Process Level) */}
      {canAccessModule('raci') && (
      <Collapsible open={openSections.raci} onOpenChange={() => toggleSection('raci')}>
        <Card>
          <CardHeader className="py-2 px-4">
            <SectionHeader icon={Users} title="RACI Roles / Functions" count={raciEntries.length} sectionKey="raci"
              onAdd={() => setAddDialog('raci')}
              extra={
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-6 text-[10px] text-muted-foreground gap-1" onClick={() => {
                    exportRaciToExcel({
                      processName: 'Process',
                      raciEntries, raciStepLinks, steps,
                    });
                    toast({ title: 'RACI exported to Excel' });
                  }}>
                    <Download className="h-3 w-3" /> Export
                  </Button>
                  <label className="cursor-pointer">
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] text-muted-foreground gap-1 pointer-events-none" asChild>
                      <span><UploadIcon className="h-3 w-3" /> Import</span>
                    </Button>
                    <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const rows = await parseRaciExcel(file);
                        if (rows.length === 0) { toast({ title: 'No data found', variant: 'destructive' }); return; }
                        let imported = 0;
                        for (const row of rows) {
                          if (!row.role_name) continue;
                          await insertProcessRaci({
                            process_id: processId,
                            role_name: row.role_name,
                            job_title: row.job_title || null,
                            job_description: row.job_description || null,
                            function_dept: row.function_dept || null,
                            sub_function: row.sub_function || null,
                            seniority: row.seniority || null,
                            tenure: row.tenure || null,
                            grade: row.grade || null,
                            fte: row.fte,
                            salary: row.salary,
                            manager_status: row.manager_status || null,
                            span_of_control: row.span_of_control,
                            responsible: row.responsible || null,
                            accountable: row.accountable || null,
                            consulted: row.consulted || null,
                            informed: row.informed || null,
                          });
                          imported++;
                        }
                        toast({ title: `Imported ${imported} RACI roles` });
                        reload();
                      } catch (err: any) {
                        toast({ title: 'Import failed', description: err.message, variant: 'destructive' });
                      }
                      e.target.value = '';
                    }} />
                  </label>
                </div>
              }
            />
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="p-0">
              {raciEntries.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No RACI roles defined. Add roles at the process level, then link them to steps.</p>
              ) : (
                <div className="divide-y">
                  {raciEntries.map(raci => {
                    const linkedStepIds = raciStepLinks.filter(l => l.raci_id === raci.id).map(l => l.step_id);
                    const linkedSteps = steps.filter(s => linkedStepIds.includes(s.id));
                    const unlinkedSteps = steps.filter(s => s.type === 'in-scope' && !linkedStepIds.includes(s.id));
                    return (
                      <div key={raci.id} className="px-4 py-3 hover:bg-muted/30 group space-y-2">
                        <div className="flex items-center gap-2">
                          <InlineEdit value={raci.role_name} onSave={v => updateProcessRaci(raci.id, { role_name: v }).then(reload)} className="text-sm font-semibold" />
                          <span className="flex-1" />
                          <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                            onClick={() => { if (confirm('Delete this RACI role?')) deleteProcessRaci(raci.id).then(reload); }}>
                            <Trash2 className="h-2.5 w-2.5" />
                          </Button>
                        </div>

                        {/* Metadata fields */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-[10px]">
                          <div>
                            <span className="text-muted-foreground font-medium">Job Title:</span>{' '}
                            <InlineEdit value={raci.job_title || ''} onSave={v => updateProcessRaci(raci.id, { job_title: v } as any).then(reload)} className="text-[10px] font-medium" />
                          </div>
                          <div>
                            <span className="text-muted-foreground font-medium">Function:</span>{' '}
                            <InlineEdit value={raci.function_dept || ''} onSave={v => updateProcessRaci(raci.id, { function_dept: v } as any).then(reload)} className="text-[10px]" />
                          </div>
                          <div>
                            <span className="text-muted-foreground font-medium">Sub Function:</span>{' '}
                            <InlineEdit value={raci.sub_function || ''} onSave={v => updateProcessRaci(raci.id, { sub_function: v } as any).then(reload)} className="text-[10px]" />
                          </div>
                          <div>
                            <span className="text-muted-foreground font-medium">Seniority:</span>{' '}
                            <InlineEdit value={raci.seniority || ''} onSave={v => updateProcessRaci(raci.id, { seniority: v } as any).then(reload)} className="text-[10px]" />
                          </div>
                          <div>
                            <span className="text-muted-foreground font-medium">Tenure:</span>{' '}
                            <InlineEdit value={raci.tenure || ''} onSave={v => updateProcessRaci(raci.id, { tenure: v } as any).then(reload)} className="text-[10px]" />
                          </div>
                          <div>
                            <span className="text-muted-foreground font-medium">Grade:</span>{' '}
                            <InlineEdit value={raci.grade || ''} onSave={v => updateProcessRaci(raci.id, { grade: v } as any).then(reload)} className="text-[10px]" />
                          </div>
                          <div>
                            <span className="text-muted-foreground font-medium">FTE:</span>{' '}
                            <InlineEdit value={raci.fte != null ? String(raci.fte) : ''} onSave={v => updateProcessRaci(raci.id, { fte: parseFloat(v) || null } as any).then(reload)} className="text-[10px] font-medium" />
                          </div>
                          <div>
                            <span className="text-muted-foreground font-medium">Salary:</span>{' '}
                            <InlineEdit value={raci.salary != null ? String(raci.salary) : ''} onSave={v => updateProcessRaci(raci.id, { salary: parseFloat(v) || null } as any).then(reload)} className="text-[10px]" />
                          </div>
                          <div>
                            <span className="text-muted-foreground font-medium">Manager:</span>{' '}
                            <InlineSelect value={raci.manager_status || '__none__'}
                              options={[{ value: '__none__', label: '— Select —' }, { value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]}
                              onSave={v => updateProcessRaci(raci.id, { manager_status: v === '__none__' ? null : v } as any).then(reload)} />
                          </div>
                          <div>
                            <span className="text-muted-foreground font-medium">Span of Control:</span>{' '}
                            <InlineEdit value={raci.span_of_control != null ? String(raci.span_of_control) : ''} onSave={v => updateProcessRaci(raci.id, { span_of_control: parseInt(v) || null } as any).then(reload)} className="text-[10px]" />
                          </div>
                        </div>

                        {raci.job_description && (
                          <div className="text-[10px]">
                            <span className="text-muted-foreground font-medium">Description:</span>{' '}
                            <span className="text-muted-foreground italic">{raci.job_description}</span>
                          </div>
                        )}

                        {/* RACI assignments with multi-person tags */}
                        <div className="flex gap-3 flex-wrap text-[10px]">
                          <RaciPeopleField label="R" color="emerald" value={raci.responsible || ''} onSave={v => updateProcessRaci(raci.id, { responsible: v || null }).then(reload)} />
                          <RaciPeopleField label="A" color="blue" value={raci.accountable || ''} onSave={v => updateProcessRaci(raci.id, { accountable: v || null }).then(reload)} />
                          <RaciPeopleField label="C" color="amber" value={raci.consulted || ''} onSave={v => updateProcessRaci(raci.id, { consulted: v || null }).then(reload)} />
                          <RaciPeopleField label="I" color="purple" value={raci.informed || ''} onSave={v => updateProcessRaci(raci.id, { informed: v || null }).then(reload)} />
                        </div>

                        {/* Linked Steps */}
                        <div className="mt-2">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase">Linked Steps:</span>
                          <div className="flex gap-1.5 flex-wrap mt-1">
                            {linkedSteps.map(s => {
                              const link = raciStepLinks.find(l => l.raci_id === raci.id && l.step_id === s.id);
                              return (
                                <Badge key={s.id} className="border-0 bg-cyan-100 text-cyan-700 text-[9px] gap-1 cursor-pointer hover:bg-red-100 hover:text-red-700 transition-colors"
                                  onClick={() => { if (link && confirm(`Unlink "${s.label}" from this role?`)) deleteRaciStepLink(link.id).then(reload); }}>
                                  {s.label} ×
                                </Badge>
                              );
                            })}
                            {linkedSteps.length === 0 && <span className="text-[10px] text-muted-foreground italic">No steps linked</span>}
                          </div>
                          {unlinkedSteps.length > 0 && (
                            <Select onValueChange={v => insertRaciStepLink(raci.id, v).then(reload)}>
                              <SelectTrigger className="h-6 text-[10px] w-auto min-w-[120px] mt-1 border-dashed">
                                <SelectValue placeholder="+ Link step..." />
                              </SelectTrigger>
                              <SelectContent>
                                {unlinkedSteps.map(s => <SelectItem key={s.id} value={s.id} className="text-xs">{s.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
      )}

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
      {addDialog === 'raci' && (
        <AddRaciDialog processId={processId} onClose={() => setAddDialog(null)} onRefresh={reload} />
      )}
      {addDialog === 'application' && contextStepId && (
        <AddApplicationDialog 
          processId={processId} stepId={contextStepId} 
          parentScreenId={contextScreenId}
          screens={applications.filter(a => a.app_type === 'screen' && a.step_id === contextStepId && !a.parent_id)}
          onClose={() => { setAddDialog(null); setContextStepId(null); setContextScreenId(null); }} onRefresh={reload} 
        />
      )}
    </div>
  );
}

// ---- Add Dialogs ----

function AddStepDialog({ processId, onClose, onRefresh }: { processId: string; onClose: () => void; onRefresh: () => void }) {
  const [label, setLabel] = useState('');
  const [type, setType] = useState('in-scope');
  const [stepType, setStepType] = useState('__none__');
  const [desc, setDesc] = useState('');
  const submit = async () => {
    if (!label.trim()) return;
    await insertStep({ process_id: processId, label: label.trim(), type, description: desc || null, step_type: stepType === '__none__' ? null : stepType } as any);
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
            <div className="flex items-center gap-2">
              <Label>Type</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <CircleHelp className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[320px] space-y-1.5">
                    {Object.entries(typeDescriptions).map(([k, d]) => (
                      <div key={k}><span className="font-semibold text-xs">{typeLabel[k]}:</span> <span className="text-xs text-muted-foreground">{d}</span></div>
                    ))}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
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
          <div className="grid gap-1.5">
            <Label>Step Type</Label>
            <Select value={stepType} onValueChange={setStepType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— None —</SelectItem>
                {STEP_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
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
  const [automationLevel, setAutomationLevel] = useState('');
  const [frequency, setFrequency] = useState('');
  const [lastTested, setLastTested] = useState('');
  const submit = async () => {
    if (!name.trim()) return;
    await insertControl({ risk_id: riskId, name: name.trim(), type, effectiveness, automation_level: automationLevel || null, frequency: frequency || null, last_tested: lastTested || null } as any);
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
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>Automation Level</Label><Select value={automationLevel || '__none__'} onValueChange={v => setAutomationLevel(v === '__none__' ? '' : v)}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="__none__">— Select —</SelectItem><SelectItem value="automatic">Automatic</SelectItem><SelectItem value="semi-automatic">Semi-Automatic</SelectItem><SelectItem value="manual">Manual</SelectItem></SelectContent></Select></div>
            <div className="grid gap-1.5"><Label>Frequency</Label><Select value={frequency || '__none__'} onValueChange={v => setFrequency(v === '__none__' ? '' : v)}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="__none__">— Select —</SelectItem><SelectItem value="multiple_daily">Multiple times/day</SelectItem><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem><SelectItem value="yearly">Yearly</SelectItem></SelectContent></Select></div>
          </div>
          <div className="grid gap-1.5"><Label>Last Tested by Client</Label><Input value={lastTested} onChange={e => setLastTested(e.target.value)} placeholder="e.g. 2024-12-15 or N/A" /></div>
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
  const [ownerDepartment, setOwnerDepartment] = useState('');
  const [moneyLossAmount, setMoneyLossAmount] = useState('');
  const [lossThreshold, setLossThreshold] = useState('');
  const [rootCause, setRootCause] = useState('');
  const submit = async () => {
    if (!title.trim()) return;
    await insertIncident({ process_id: processId, step_id: stepId, title: title.trim(), severity, description: desc || null, owner_department: ownerDepartment || null, money_loss_amount: moneyLossAmount || null, loss_threshold: lossThreshold || null, root_cause: rootCause || null } as any);
    toast({ title: 'Incident added' }); onRefresh(); onClose();
  };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Add Incident</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5"><Label>Title *</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>Severity</Label><Select value={severity} onValueChange={setSeverity}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select></div>
            <div className="grid gap-1.5"><Label>Owner (Department)</Label><Input value={ownerDepartment} onChange={e => setOwnerDepartment(e.target.value)} placeholder="e.g. Finance, IT" /></div>
          </div>
          <div className="grid gap-1.5"><Label>Description</Label><Textarea value={desc} onChange={e => setDesc(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>Money Loss Amount</Label><Input value={moneyLossAmount} onChange={e => setMoneyLossAmount(e.target.value)} placeholder="e.g. $50,000" /></div>
            <div className="grid gap-1.5"><Label>Loss Threshold (Client)</Label><Input value={lossThreshold} onChange={e => setLossThreshold(e.target.value)} placeholder="e.g. $100,000" /></div>
          </div>
          <div className="grid gap-1.5"><Label>Root Cause</Label><Select value={rootCause || '__none__'} onValueChange={v => setRootCause(v === '__none__' ? '' : v)}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="__none__">— Select —</SelectItem><SelectItem value="people">People</SelectItem><SelectItem value="system">System</SelectItem><SelectItem value="market">Market</SelectItem><SelectItem value="regulations">Regulations</SelectItem></SelectContent></Select></div>
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

function AddRaciDialog({ processId, onClose, onRefresh }: { processId: string; onClose: () => void; onRefresh: () => void }) {
  const [roleName, setRoleName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [functionDept, setFunctionDept] = useState('');
  const [subFunction, setSubFunction] = useState('');
  const [seniority, setSeniority] = useState('');
  const [tenure, setTenure] = useState('');
  const [grade, setGrade] = useState('');
  const [fte, setFte] = useState('');
  const [salary, setSalary] = useState('');
  const [managerStatus, setManagerStatus] = useState('');
  const [spanOfControl, setSpanOfControl] = useState('');
  const [responsible, setResponsible] = useState('');
  const [accountable, setAccountable] = useState('');
  const [consulted, setConsulted] = useState('');
  const [informed, setInformed] = useState('');
  const submit = async () => {
    if (!roleName.trim() || !jobTitle.trim() || !functionDept.trim()) {
      toast({ title: 'Please fill in all mandatory fields (Role Name, Job Title, Function)', variant: 'destructive' });
      return;
    }
    await insertProcessRaci({
      process_id: processId, role_name: roleName.trim(),
      job_title: jobTitle.trim(),
      job_description: jobDesc.trim() || null,
      function_dept: functionDept.trim(),
      sub_function: subFunction.trim() || null,
      seniority: seniority.trim() || null,
      tenure: tenure.trim() || null,
      grade: grade.trim() || null,
      fte: fte ? parseFloat(fte) : null,
      salary: salary ? parseFloat(salary) : null,
      manager_status: managerStatus || null,
      span_of_control: spanOfControl ? parseInt(spanOfControl) : null,
      responsible: responsible || null, accountable: accountable || null,
      consulted: consulted || null, informed: informed || null,
    } as any);
    toast({ title: 'RACI role added to process' }); onRefresh(); onClose();
  };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add RACI Role / Function</DialogTitle>
          <DialogDescription>Define a role at the business process level. Fields marked with * are mandatory.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label>Role / Function Name *</Label>
            <Input value={roleName} onChange={e => setRoleName(e.target.value)} placeholder="e.g. Finance Manager, IT Operations" />
          </div>

          <Separator />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role Details</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Job Title *</Label>
              <Input value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="Standardized role title" />
              <p className="text-[10px] text-muted-foreground">The standardized title representing the role analysed.</p>
            </div>
            <div className="grid gap-1.5">
              <Label>Function (Department) *</Label>
              <Input value={functionDept} onChange={e => setFunctionDept(e.target.value)} placeholder="e.g. Finance, IT, Operations" />
              <p className="text-[10px] text-muted-foreground">Main business area where the role sits.</p>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Job Description</Label>
            <Textarea value={jobDesc} onChange={e => setJobDesc(e.target.value)} placeholder="Short description summarizing the main purpose and key activities of the role" className="min-h-[60px]" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Sub Function</Label>
              <Input value={subFunction} onChange={e => setSubFunction(e.target.value)} placeholder="e.g. Accounts Payable, Network Security" />
              <p className="text-[10px] text-muted-foreground">Specific specialization within the function.</p>
            </div>
            <div className="grid gap-1.5">
              <Label>Seniority</Label>
              <Input value={seniority} onChange={e => setSeniority(e.target.value)} placeholder="e.g. Senior, Junior, Lead" />
              <p className="text-[10px] text-muted-foreground">Hierarchical level reflecting expertise and autonomy.</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label>Tenure</Label>
              <Input value={tenure} onChange={e => setTenure(e.target.value)} placeholder="e.g. 5 years" />
            </div>
            <div className="grid gap-1.5">
              <Label>Grade</Label>
              <Input value={grade} onChange={e => setGrade(e.target.value)} placeholder="e.g. Band 7, Level 3" />
              <p className="text-[10px] text-muted-foreground">Internal organizational level or band.</p>
            </div>
            <div className="grid gap-1.5">
              <Label>FTE *</Label>
              <Input type="number" step="0.1" value={fte} onChange={e => setFte(e.target.value)} placeholder="e.g. 12.5" />
              <p className="text-[10px] text-muted-foreground">Total FTE volume for this role.</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label>Salary</Label>
              <Input type="number" value={salary} onChange={e => setSalary(e.target.value)} placeholder="Annual base salary" />
              <p className="text-[10px] text-muted-foreground">Average annual base salary.</p>
            </div>
            <div className="grid gap-1.5">
              <Label>Manager Status</Label>
              <Select value={managerStatus || '__none__'} onValueChange={v => setManagerStatus(v === '__none__' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Select —</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">Includes managerial duties?</p>
            </div>
            <div className="grid gap-1.5">
              <Label>Span of Control</Label>
              <Input type="number" value={spanOfControl} onChange={e => setSpanOfControl(e.target.value)} placeholder="Direct reports" />
              <p className="text-[10px] text-muted-foreground">Avg. direct reports per manager.</p>
            </div>
          </div>

          <Separator />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">RACI Assignments (comma-separate for multiple people)</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>Responsible</Label><Input value={responsible} onChange={e => setResponsible(e.target.value)} placeholder="e.g. John Doe, Jane Smith" /></div>
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

function AddApplicationDialog({ processId, stepId, parentScreenId, screens, onClose, onRefresh }: { 
  processId: string; stepId: string; parentScreenId?: string | null; screens: StepApplication[]; onClose: () => void; onRefresh: () => void;
}) {
  const [name, setName] = useState('');
  const [appType, setAppType] = useState(parentScreenId ? 'application' : 'application');
  const [parentId, setParentId] = useState(parentScreenId || '');
  const [desc, setDesc] = useState('');
  const [appOwner, setAppOwner] = useState('');
  const [baBusiness, setBaBusiness] = useState('');
  const [baIT, setBaIT] = useState('');
  const [platform, setPlatform] = useState('');
  const submit = async () => {
    if (!name.trim()) return;
    await insertStepApplication({ 
      process_id: processId, step_id: stepId, name: name.trim(), 
      app_type: appType, description: desc || null,
      parent_id: parentId || null,
      application_owner: appOwner || null,
      business_analyst_business: baBusiness || null,
      business_analyst_it: baIT || null,
      platform: platform || null,
    } as any);
    toast({ title: `${appType === 'screen' ? 'Screen' : 'Application'} added` }); onRefresh(); onClose();
  };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Monitor className="h-5 w-5 text-sky-500" /> Add Application / Screen</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label>What are you adding?</Label>
            <Select value={appType} onValueChange={v => { setAppType(v); if (v === 'screen') setParentId(''); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="application">Application</SelectItem>
                <SelectItem value="screen">Screen</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>{appType === 'screen' ? 'Screen Name' : 'Application Name'} *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder={appType === 'screen' ? 'e.g. Invoice Entry Screen' : 'e.g. SAP FI, Oracle EBS'} />
          </div>
          {appType === 'application' && screens.length > 0 && (
            <div className="grid gap-1.5">
              <Label>Link to Screen (optional)</Label>
              <Select value={parentId || '__none__'} onValueChange={v => setParentId(v === '__none__' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Standalone application" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Standalone (no screen)</SelectItem>
                  {screens.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">Link this application to a screen to show it as a child</p>
            </div>
          )}
          <div className="grid gap-1.5"><Label>Description</Label><Textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional description..." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Application Owner</Label>
              <Input value={appOwner} onChange={e => setAppOwner(e.target.value)} placeholder="e.g. John Smith" />
            </div>
            <div className="grid gap-1.5">
              <Label>Platform</Label>
              <Input value={platform} onChange={e => setPlatform(e.target.value)} placeholder="e.g. SAP, Oracle" />
            </div>
            <div className="grid gap-1.5">
              <Label>Business Analyst (Business)</Label>
              <Input value={baBusiness} onChange={e => setBaBusiness(e.target.value)} placeholder="BA name" />
            </div>
            <div className="grid gap-1.5">
              <Label>Business Analyst (IT)</Label>
              <Input value={baIT} onChange={e => setBaIT(e.target.value)} placeholder="BA IT name" />
            </div>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit} disabled={!name.trim()}>Add {appType === 'screen' ? 'Screen' : 'Application'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
