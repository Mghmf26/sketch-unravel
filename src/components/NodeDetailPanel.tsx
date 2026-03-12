import { useState, useCallback, useRef } from 'react';
import { X, ShieldAlert, ShieldCheck, Scale, AlertCircle, Info, Pencil, Check, Plus, Trash2, Loader2, Monitor, MessageSquare, Paperclip, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { toast } from '@/hooks/use-toast';
import {
  updateStep, updateRisk, updateControl, updateRegulation, updateIncident,
  insertRisk, insertControl, insertRegulation, insertIncident,
  deleteRisk, deleteControl, deleteRegulation, deleteIncident,
  type Risk, type Control, type Regulation, type Incident,
} from '@/lib/api';
import { insertStepApplication, updateStepApplication, deleteStepApplication, type StepApplication } from '@/lib/api-applications';
import {
  fetchEntityComments, insertEntityComment, updateEntityComment, deleteEntityComment,
  fetchEntityAttachments, insertEntityAttachment, deleteEntityAttachment, uploadEntityFile,
  type EntityComment, type EntityAttachment,
} from '@/lib/api-comments';
import type { EPCNode, NodeType } from '@/types/epc';

interface NodeDetailPanelProps {
  node: EPCNode;
  risks: Risk[];
  controls: Control[];
  regulations: Regulation[];
  incidents: Incident[];
  applications?: StepApplication[];
  processId?: string;
  defaultTab?: string;
  onClose: () => void;
  onDataChanged?: () => void;
}

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'in-scope': { bg: '#d1fae5', text: '#065f46', border: '#10b981' },
  'interface': { bg: '#e2e8f0', text: '#1e293b', border: '#64748b' },
  'event': { bg: '#fce7f3', text: '#831843', border: '#ec4899' },
  'xor': { bg: '#dbeafe', text: '#1e3a8a', border: '#3b82f6' },
  'decision': { bg: '#ffedd5', text: '#7c2d12', border: '#f97316' },
  'start-end': { bg: '#dcfce7', text: '#14532d', border: '#22c55e' },
  'storage': { bg: '#fef9c3', text: '#713f12', border: '#eab308' },
  'delay': { bg: '#fee2e2', text: '#7f1d1d', border: '#ef4444' },
  'document': { bg: '#ede9fe', text: '#3b0764', border: '#8b5cf6' },
};

const TYPE_LABELS: Record<string, string> = {
  'in-scope': 'Step', 'interface': 'Business Process', 'event': 'Event', 'xor': 'XOR',
  'start-end': 'Start/End', 'decision': 'Decision', 'storage': 'Storage', 'delay': 'Delay', 'document': 'Document',
};

function SeverityBadge({ value }: { value: string }) {
  const colors: Record<string, string> = {
    low: 'bg-emerald-100 text-emerald-700',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700',
  };
  return <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${colors[value] || 'bg-muted text-muted-foreground'}`}>{value}</span>;
}

function StatusBadge({ value }: { value: string }) {
  const colors: Record<string, string> = {
    open: 'bg-red-100 text-red-700',
    investigating: 'bg-yellow-100 text-yellow-700',
    resolved: 'bg-emerald-100 text-emerald-700',
    closed: 'bg-slate-100 text-slate-700',
    compliant: 'bg-emerald-100 text-emerald-700',
    partial: 'bg-yellow-100 text-yellow-700',
    'non-compliant': 'bg-red-100 text-red-700',
    effective: 'bg-emerald-100 text-emerald-700',
    partially: 'bg-yellow-100 text-yellow-700',
    ineffective: 'bg-red-100 text-red-700',
  };
  return <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${colors[value] || 'bg-muted text-muted-foreground'}`}>{value}</span>;
}

function EditableField({ label, value, onSave, multiline = false }: {
  label: string; value: string; onSave: (val: string) => void; multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  const commit = () => { setEditing(false); if (text !== value) onSave(text); };
  if (!editing) {
    return (
      <div className="group">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase">{label}</span>
        <div className="flex items-start gap-1">
          <p className="text-sm flex-1">{value || <span className="text-muted-foreground italic">No {label.toLowerCase()}</span>}</p>
          <button onClick={() => { setText(value); setEditing(true); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted">
            <Pencil className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
      </div>
    );
  }
  return (
    <div>
      <span className="text-[10px] font-semibold text-muted-foreground uppercase">{label}</span>
      <div className="flex items-end gap-1 mt-0.5">
        {multiline ? (
          <Textarea value={text} onChange={e => setText(e.target.value)} className="text-sm min-h-[60px]" autoFocus onKeyDown={e => { if (e.key === 'Escape') setEditing(false); }} />
        ) : (
          <Input value={text} onChange={e => setText(e.target.value)} className="text-sm h-8" autoFocus
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }} />
        )}
        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={commit}>
          <Check className="h-3.5 w-3.5 text-primary" />
        </Button>
      </div>
    </div>
  );
}

function EditableSelect({ label, value, options, onSave }: {
  label: string; value: string; options: string[]; onSave: (val: string) => void;
}) {
  return (
    <div>
      <span className="text-[9px] text-muted-foreground">{label}:</span>
      <Select value={value} onValueChange={onSave}>
        <SelectTrigger className="h-6 text-[10px] w-auto min-w-[80px] px-1.5 border-dashed">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

// Inline comments & attachments for any entity
function EntityNotesSection({ entityType, entityId, processId }: { entityType: string; entityId: string; processId: string }) {
  const [comments, setComments] = useState<EntityComment[]>([]);
  const [attachments, setAttachments] = useState<EntityAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [newConclusion, setNewConclusion] = useState('');
  const [isConfidential, setIsConfidential] = useState(false);
  const [showAddComment, setShowAddComment] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const [c, a] = await Promise.all([
      fetchEntityComments(entityType, entityId),
      fetchEntityAttachments(entityType, entityId),
    ]);
    setComments(c); setAttachments(a); setLoading(false);
  }, [entityType, entityId]);

  useState(() => { load(); });

  const handleAddComment = async () => {
    if (!newComment.trim() && !newConclusion.trim()) return;
    try {
      await insertEntityComment({ entity_type: entityType, entity_id: entityId, process_id: processId, comment: newComment || null, conclusion: newConclusion || null });
      setNewComment(''); setNewConclusion(''); setShowAddComment(false);
      toast({ title: 'Comment added' });
      load();
    } catch { toast({ title: 'Failed', variant: 'destructive' }); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadEntityFile(file, processId);
      await insertEntityAttachment({
        entity_type: entityType, entity_id: entityId, process_id: processId,
        file_name: file.name, file_url: url, file_type: file.type, file_size: file.size,
        is_confidential: isConfidential,
      } as any);
      toast({ title: 'File uploaded' });
      load();
    } catch { toast({ title: 'Upload failed', variant: 'destructive' }); }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteComment = async (id: string) => {
    await deleteEntityComment(id); load();
  };

  const handleDeleteAttachment = async (id: string) => {
    await deleteEntityAttachment(id); load();
  };

  return (
    <div className="mt-3 space-y-2 border-t pt-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
          <MessageSquare className="h-3 w-3" /> Notes & Files
        </span>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" className="h-5 text-[10px] gap-0.5" onClick={() => setShowAddComment(true)}>
            <Plus className="h-2.5 w-2.5" /> Note
          </Button>
          <Button size="sm" variant="ghost" className="h-5 text-[10px] gap-0.5" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <Paperclip className="h-2.5 w-2.5" /> {uploading ? '...' : 'File'}
          </Button>
          <input ref={fileInputRef} type="file" className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.xml,.html,.csv,.txt,.json,.png,.jpg,.jpeg"
            onChange={handleFileUpload} disabled={uploading} />
          <div className="flex items-center gap-1.5 ml-1">
            <input type="checkbox" id={`confidential-${entityId}`} checked={isConfidential} onChange={e => setIsConfidential(e.target.checked)} className="h-3 w-3 rounded border-muted-foreground/40" />
            <label htmlFor={`confidential-${entityId}`} className="text-[9px] text-muted-foreground cursor-pointer">Confidential</label>
          </div>
        </div>
      </div>

      {showAddComment && (
        <div className="p-2 rounded border bg-muted/30 space-y-1.5">
          <Textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Comment..." className="text-xs min-h-[40px]" />
          <Textarea value={newConclusion} onChange={e => setNewConclusion(e.target.value)} placeholder="Important insights (optional)..." className="text-xs min-h-[30px]" />
          <div className="flex gap-1 justify-end">
            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setShowAddComment(false)}>Cancel</Button>
            <Button size="sm" className="h-6 text-xs" onClick={handleAddComment}>Save</Button>
          </div>
        </div>
      )}

      {comments.map(c => (
        <div key={c.id} className="p-2 rounded border bg-card text-xs space-y-1 group">
          {c.comment && <p>{c.comment}</p>}
          {c.conclusion && <p className="font-semibold text-primary">Important Insights: {c.conclusion}</p>}
          <div className="flex justify-between items-center">
            <span className="text-[9px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
            <Button variant="ghost" size="icon" className="h-4 w-4 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => handleDeleteComment(c.id)}>
              <Trash2 className="h-2.5 w-2.5" />
            </Button>
          </div>
        </div>
      ))}

      {attachments.map(a => (
        <div key={a.id} className="flex items-center gap-2 p-1.5 rounded border bg-card text-xs group">
          <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <a href={a.file_url} target="_blank" rel="noopener noreferrer" className="flex-1 truncate text-primary hover:underline">{a.file_name}</a>
          <span className="text-[9px] text-muted-foreground shrink-0">{a.file_size ? `${Math.round(a.file_size / 1024)}KB` : ''}</span>
          {(a as any).is_confidential && <Badge variant="outline" className="text-[8px] border-red-300 text-red-600">Confidential</Badge>}
          <Button variant="ghost" size="icon" className="h-4 w-4 opacity-0 group-hover:opacity-100 text-destructive shrink-0" onClick={() => handleDeleteAttachment(a.id)}>
            <Trash2 className="h-2.5 w-2.5" />
          </Button>
        </div>
      ))}

      {!loading && comments.length === 0 && attachments.length === 0 && !showAddComment && (
        <p className="text-[10px] text-muted-foreground italic text-center py-1">No notes or files yet</p>
      )}
    </div>
  );
}

type AddDialogType = 'risk' | 'control' | 'regulation' | 'incident' | 'application' | null;

export default function NodeDetailPanel({ node, risks, controls, regulations, incidents, applications = [], processId, defaultTab = 'overview', onClose, onDataChanged }: NodeDetailPanelProps) {
  const tc = TYPE_COLORS[node.type] || TYPE_COLORS['in-scope'];
  const stepRisks = risks.filter(r => r.step_id === node.id);
  const stepRiskIds = new Set(stepRisks.map(r => r.id));
  const stepControls = controls.filter(c => stepRiskIds.has(c.risk_id));
  const stepRegulations = regulations.filter(r => r.step_id === node.id);
  const stepIncidents = incidents.filter(i => i.step_id === node.id);
  const stepApps = applications.filter(a => a.step_id === node.id);

  const [addDialog, setAddDialog] = useState<AddDialogType>(null);
  const [saving, setSaving] = useState(false);
  const [contextRiskId, setContextRiskId] = useState<string | null>(null);

  // Forms
  const [riskForm, setRiskForm] = useState({ description: '', likelihood: 'medium', impact: 'medium' });
  const [controlForm, setControlForm] = useState({ name: '', description: '', type: 'preventive', effectiveness: 'effective', automation_level: '', frequency: '', last_tested: '' });
  const [regulationForm, setRegulationForm] = useState({ name: '', description: '', authority: '', compliance_status: 'partial' });
  const [incidentForm, setIncidentForm] = useState({ title: '', description: '', severity: 'medium', status: 'open', owner_department: '', money_loss_amount: '', loss_threshold: '', root_cause: '' });
  const [appForm, setAppForm] = useState({ name: '', description: '', app_type: 'application', parent_id: '', application_owner: '', business_analyst_business: '', business_analyst_it: '', platform: '' });

  const derivedProcessId = processId || stepRisks[0]?.process_id || stepRegulations[0]?.process_id || stepIncidents[0]?.process_id || '';

  const saveField = useCallback(async (fn: () => Promise<void>, msg: string) => {
    try {
      await fn();
      toast({ title: msg });
      onDataChanged?.();
    } catch {
      toast({ title: 'Save failed', variant: 'destructive' });
    }
  }, [onDataChanged]);

  const handleAddRisk = async () => {
    if (!riskForm.description.trim() || !derivedProcessId) return;
    setSaving(true);
    try {
      await insertRisk({ step_id: node.id, process_id: derivedProcessId, description: riskForm.description.trim(), likelihood: riskForm.likelihood, impact: riskForm.impact });
      toast({ title: 'Risk added' }); setAddDialog(null); setRiskForm({ description: '', likelihood: 'medium', impact: 'medium' }); onDataChanged?.();
    } catch { toast({ title: 'Failed to add risk', variant: 'destructive' }); }
    setSaving(false);
  };

  const handleAddControl = async () => {
    if (!controlForm.name.trim() || !contextRiskId) return;
    setSaving(true);
    try {
      await insertControl({ risk_id: contextRiskId, name: controlForm.name.trim(), description: controlForm.description || null, type: controlForm.type, effectiveness: controlForm.effectiveness, automation_level: controlForm.automation_level || null, frequency: controlForm.frequency || null, last_tested: controlForm.last_tested || null } as any);
      toast({ title: 'Control added' }); setAddDialog(null); setControlForm({ name: '', description: '', type: 'preventive', effectiveness: 'effective', automation_level: '', frequency: '', last_tested: '' }); onDataChanged?.();
    } catch { toast({ title: 'Failed to add control', variant: 'destructive' }); }
    setSaving(false);
  };

  const handleAddRegulation = async () => {
    if (!regulationForm.name.trim() || !derivedProcessId) return;
    setSaving(true);
    try {
      await insertRegulation({ step_id: node.id, process_id: derivedProcessId, name: regulationForm.name.trim(), description: regulationForm.description || null, authority: regulationForm.authority || null, compliance_status: regulationForm.compliance_status });
      toast({ title: 'Regulation added' }); setAddDialog(null); setRegulationForm({ name: '', description: '', authority: '', compliance_status: 'partial' }); onDataChanged?.();
    } catch { toast({ title: 'Failed to add regulation', variant: 'destructive' }); }
    setSaving(false);
  };

  const handleAddIncident = async () => {
    if (!incidentForm.title.trim() || !derivedProcessId) return;
    setSaving(true);
    try {
      await insertIncident({ step_id: node.id, process_id: derivedProcessId, title: incidentForm.title.trim(), description: incidentForm.description || null, severity: incidentForm.severity, status: incidentForm.status });
      toast({ title: 'Incident added' }); setAddDialog(null); setIncidentForm({ title: '', description: '', severity: 'medium', status: 'open' }); onDataChanged?.();
    } catch { toast({ title: 'Failed to add incident', variant: 'destructive' }); }
    setSaving(false);
  };

  const handleAddApplication = async () => {
    if (!appForm.name.trim() || !derivedProcessId) return;
    setSaving(true);
    try {
      await insertStepApplication({ 
        step_id: node.id, process_id: derivedProcessId, name: appForm.name.trim(), 
        description: appForm.description || null, app_type: appForm.app_type,
        parent_id: appForm.parent_id || null,
        application_owner: appForm.application_owner || null,
        business_analyst_business: appForm.business_analyst_business || null,
        business_analyst_it: appForm.business_analyst_it || null,
        platform: appForm.platform || null,
      } as any);
      toast({ title: 'Added' }); setAddDialog(null); 
      setAppForm({ name: '', description: '', app_type: 'application', parent_id: '', application_owner: '', business_analyst_business: '', business_analyst_it: '', platform: '' }); 
      onDataChanged?.();
    } catch { toast({ title: 'Failed to add', variant: 'destructive' }); }
    setSaving(false);
  };

  const [pendingDelete, setPendingDelete] = useState<{ type: string; id: string; label: string } | null>(null);

  const handleDeleteItem = async (type: string, id: string, label?: string) => {
    setPendingDelete({ type, id, label: label || type });
  };

  const executeDelete = async () => {
    if (!pendingDelete) return;
    const { type, id } = pendingDelete;
    try {
      if (type === 'risk') await deleteRisk(id);
      else if (type === 'control') await deleteControl(id);
      else if (type === 'regulation') await deleteRegulation(id);
      else if (type === 'incident') await deleteIncident(id);
      else if (type === 'application') await deleteStepApplication(id);
      toast({ title: `${type.charAt(0).toUpperCase() + type.slice(1)} deleted` });
      onDataChanged?.();
    } catch { toast({ title: 'Delete failed', variant: 'destructive' }); }
    setPendingDelete(null);
  };

  return (
    <>
    <div className="w-[360px] bg-background border-l shadow-lg flex flex-col h-full overflow-hidden" style={{ borderTopColor: tc.border, borderTopWidth: 3 }}>
      {/* Header */}
      <div className="flex items-start gap-2 p-4 pb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ backgroundColor: tc.bg, color: tc.text, border: `1px solid ${tc.border}` }}>
              {TYPE_LABELS[node.type] || node.type}
            </span>
          </div>
          <h3 className="text-sm font-bold truncate">{node.label}</h3>
          {node.description && <p className="text-xs text-muted-foreground mt-0.5">{node.description}</p>}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Separator />

      {/* Tabs */}
      <Tabs defaultValue={node.type !== 'in-scope' && defaultTab !== 'overview' ? 'overview' : defaultTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-4 mt-2 bg-muted/50 h-8 flex-wrap">
          <TabsTrigger value="overview" className="text-[10px] h-6 px-2">
            <Info className="h-3 w-3 mr-1" /> Info
          </TabsTrigger>
          {node.type === 'in-scope' && (
            <>
              <TabsTrigger value="risks" className="text-[10px] h-6 px-2">
                <ShieldAlert className="h-3 w-3 mr-1" />
                {stepRisks.length > 0 && <Badge variant="secondary" className="ml-0.5 h-4 text-[8px] px-1">{stepRisks.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="controls" className="text-[10px] h-6 px-2">
                <ShieldCheck className="h-3 w-3 mr-1" />
                {stepControls.length > 0 && <Badge variant="secondary" className="ml-0.5 h-4 text-[8px] px-1">{stepControls.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="regulations" className="text-[10px] h-6 px-2">
                <Scale className="h-3 w-3 mr-1" />
                {stepRegulations.length > 0 && <Badge variant="secondary" className="ml-0.5 h-4 text-[8px] px-1">{stepRegulations.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="incidents" className="text-[10px] h-6 px-2">
                <AlertCircle className="h-3 w-3 mr-1" />
                {stepIncidents.length > 0 && <Badge variant="secondary" className="ml-0.5 h-4 text-[8px] px-1">{stepIncidents.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="applications" className="text-[10px] h-6 px-2">
                <Monitor className="h-3 w-3 mr-1" />
                {stepApps.length > 0 && <Badge variant="secondary" className="ml-0.5 h-4 text-[8px] px-1">{stepApps.length}</Badge>}
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <ScrollArea className="flex-1 px-4 py-2">
          <TabsContent value="overview" className="mt-0 space-y-3">
            <EditableField label="Name" value={node.label}
              onSave={val => saveField(() => updateStep(node.id, { label: val }), 'Name updated')} />
            <EditableField label="Description" value={node.description || ''} multiline
              onSave={val => saveField(() => updateStep(node.id, { description: val }), 'Description updated')} />
            <div>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">Type</span>
              <p className="text-sm">{TYPE_LABELS[node.type] || node.type}</p>
            </div>
            <Separator />
            {node.type === 'in-scope' && (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 rounded-lg border bg-orange-50">
                    <div className="flex items-center gap-1 mb-0.5"><ShieldAlert className="h-3 w-3 text-orange-500" /><span className="text-[10px] font-semibold text-orange-700">Risks</span></div>
                    <span className="text-lg font-bold text-orange-700">{stepRisks.length}</span>
                  </div>
                  <div className="p-2 rounded-lg border bg-blue-50">
                    <div className="flex items-center gap-1 mb-0.5"><ShieldCheck className="h-3 w-3 text-blue-500" /><span className="text-[10px] font-semibold text-blue-700">Controls</span></div>
                    <span className="text-lg font-bold text-blue-700">{stepControls.length}</span>
                  </div>
                  <div className="p-2 rounded-lg border bg-purple-50">
                    <div className="flex items-center gap-1 mb-0.5"><Scale className="h-3 w-3 text-purple-500" /><span className="text-[10px] font-semibold text-purple-700">Regulations</span></div>
                    <span className="text-lg font-bold text-purple-700">{stepRegulations.length}</span>
                  </div>
                  <div className="p-2 rounded-lg border bg-red-50">
                    <div className="flex items-center gap-1 mb-0.5"><AlertCircle className="h-3 w-3 text-red-500" /><span className="text-[10px] font-semibold text-red-700">Incidents</span></div>
                    <span className="text-lg font-bold text-red-700">{stepIncidents.length}</span>
                  </div>
                  <div className="p-2 rounded-lg border bg-sky-50">
                    <div className="flex items-center gap-1 mb-0.5"><Monitor className="h-3 w-3 text-sky-500" /><span className="text-[10px] font-semibold text-sky-700">Scr./App.</span></div>
                    <span className="text-lg font-bold text-sky-700">{stepApps.length}</span>
                  </div>
                </div>
              </>
            )}
            {node.type !== 'in-scope' && (
              <div className="rounded-lg border border-dashed p-4 text-center">
                <p className="text-xs text-muted-foreground">
                  Risks, controls, regulations, incidents, and applications can only be added to <strong>Step</strong> (in-scope) nodes.
                </p>
              </div>
            )}
            {/* Notes & files for the step itself */}
            {derivedProcessId && <EntityNotesSection entityType="step" entityId={node.id} processId={derivedProcessId} />}
          </TabsContent>

          <TabsContent value="risks" className="mt-0 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-muted-foreground">{stepRisks.length} Risk{stepRisks.length !== 1 ? 's' : ''}</span>
              <Button size="sm" variant="ghost" className="h-6 text-xs gap-1" onClick={() => { setRiskForm({ description: '', likelihood: 'medium', impact: 'medium' }); setAddDialog('risk'); }}>
                <Plus className="h-3 w-3" /> Add Risk
              </Button>
            </div>
            {stepRisks.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No risks linked to this step</p>
            ) : stepRisks.map(risk => {
              const riskControls = controls.filter(c => c.risk_id === risk.id);
              return (
                <div key={risk.id} className="p-3 rounded-lg border bg-orange-50/50 space-y-2 group">
                  <div className="flex items-start justify-between">
                    <EditableField label="Risk Description" value={risk.description}
                      onSave={val => saveField(() => updateRisk(risk.id, { description: val }), 'Risk updated')} />
                    <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => handleDeleteItem('risk', risk.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex gap-3">
                    <EditableSelect label="Likelihood" value={risk.likelihood} options={['low', 'medium', 'high', 'critical']}
                      onSave={val => saveField(() => updateRisk(risk.id, { likelihood: val }), 'Likelihood updated')} />
                    <EditableSelect label="Impact" value={risk.impact} options={['low', 'medium', 'high', 'critical']}
                      onSave={val => saveField(() => updateRisk(risk.id, { impact: val }), 'Impact updated')} />
                  </div>
                  {riskControls.length > 0 && (
                    <div className="pl-2 border-l-2 border-blue-200 space-y-1 mt-1">
                      <span className="text-[9px] font-semibold text-blue-600">Controls ({riskControls.length})</span>
                      {riskControls.map(ctrl => (
                        <div key={ctrl.id} className="flex items-center gap-1.5 text-xs group/ctrl">
                          <ShieldCheck className="h-3 w-3 text-blue-400" />
                          <span className="font-medium flex-1">{ctrl.name}</span>
                          <StatusBadge value={ctrl.effectiveness || 'effective'} />
                          <Button variant="ghost" size="icon" className="h-4 w-4 opacity-0 group-hover/ctrl:opacity-100 text-destructive" onClick={() => handleDeleteItem('control', ctrl.id)}>
                            <Trash2 className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button size="sm" variant="ghost" className="h-5 text-[10px] text-blue-600 gap-1 px-1" onClick={() => { setContextRiskId(risk.id); setControlForm({ name: '', description: '', type: 'preventive', effectiveness: 'effective' }); setAddDialog('control'); }}>
                    <Plus className="h-2.5 w-2.5" /> Add Control
                  </Button>
                  {derivedProcessId && <EntityNotesSection entityType="risk" entityId={risk.id} processId={derivedProcessId} />}
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="controls" className="mt-0 space-y-2">
            {stepControls.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No controls linked to this step's risks</p>
            ) : stepControls.map(ctrl => (
              <div key={ctrl.id} className="p-3 rounded-lg border bg-blue-50/50 space-y-1.5 group">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                  <div className="flex-1"><EditableField label="Name" value={ctrl.name}
                    onSave={val => saveField(() => updateControl(ctrl.id, { name: val }), 'Control updated')} /></div>
                  <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => handleDeleteItem('control', ctrl.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                {ctrl.description && <p className="text-xs text-muted-foreground">{ctrl.description}</p>}
                <div className="flex gap-3">
                  <EditableSelect label="Type" value={ctrl.type || 'preventive'} options={['preventive', 'detective', 'corrective']}
                    onSave={val => saveField(() => updateControl(ctrl.id, { type: val }), 'Type updated')} />
                  <EditableSelect label="Effectiveness" value={ctrl.effectiveness || 'effective'} options={['effective', 'partially', 'ineffective']}
                    onSave={val => saveField(() => updateControl(ctrl.id, { effectiveness: val }), 'Effectiveness updated')} />
                </div>
                {derivedProcessId && <EntityNotesSection entityType="control" entityId={ctrl.id} processId={derivedProcessId} />}
              </div>
            ))}
          </TabsContent>

          <TabsContent value="regulations" className="mt-0 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-muted-foreground">{stepRegulations.length} Regulation{stepRegulations.length !== 1 ? 's' : ''}</span>
              <Button size="sm" variant="ghost" className="h-6 text-xs gap-1" onClick={() => { setRegulationForm({ name: '', description: '', authority: '', compliance_status: 'partial' }); setAddDialog('regulation'); }}>
                <Plus className="h-3 w-3" /> Add Regulation
              </Button>
            </div>
            {stepRegulations.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No regulations linked to this step</p>
            ) : stepRegulations.map(reg => (
              <div key={reg.id} className="p-3 rounded-lg border bg-purple-50/50 space-y-1.5 group">
                <div className="flex items-center gap-2">
                  <Scale className="h-3.5 w-3.5 text-purple-500" />
                  <div className="flex-1"><EditableField label="Name" value={reg.name}
                    onSave={val => saveField(() => updateRegulation(reg.id, { name: val }), 'Regulation updated')} /></div>
                  <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => handleDeleteItem('regulation', reg.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <EditableField label="Description" value={reg.description || ''} multiline
                  onSave={val => saveField(() => updateRegulation(reg.id, { description: val }), 'Description updated')} />
                <div className="flex gap-3">
                  {reg.authority && <Badge variant="outline" className="text-[9px]">{reg.authority}</Badge>}
                  <EditableSelect label="Compliance" value={reg.compliance_status || 'partial'} options={['compliant', 'partial', 'non-compliant']}
                    onSave={val => saveField(() => updateRegulation(reg.id, { compliance_status: val }), 'Status updated')} />
                </div>
                {derivedProcessId && <EntityNotesSection entityType="regulation" entityId={reg.id} processId={derivedProcessId} />}
              </div>
            ))}
          </TabsContent>

          <TabsContent value="incidents" className="mt-0 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-muted-foreground">{stepIncidents.length} Incident{stepIncidents.length !== 1 ? 's' : ''}</span>
              <Button size="sm" variant="ghost" className="h-6 text-xs gap-1" onClick={() => { setIncidentForm({ title: '', description: '', severity: 'medium', status: 'open' }); setAddDialog('incident'); }}>
                <Plus className="h-3 w-3" /> Add Incident
              </Button>
            </div>
            {stepIncidents.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No incidents linked to this step</p>
            ) : stepIncidents.map(inc => (
              <div key={inc.id} className="p-3 rounded-lg border bg-red-50/50 space-y-1.5 group">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                  <div className="flex-1"><EditableField label="Title" value={inc.title}
                    onSave={val => saveField(() => updateIncident(inc.id, { title: val }), 'Incident updated')} /></div>
                  <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => handleDeleteItem('incident', inc.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <EditableField label="Description" value={inc.description || ''} multiline
                  onSave={val => saveField(() => updateIncident(inc.id, { description: val }), 'Description updated')} />
                <div className="flex gap-3">
                  <EditableSelect label="Severity" value={inc.severity} options={['low', 'medium', 'high', 'critical']}
                    onSave={val => saveField(() => updateIncident(inc.id, { severity: val }), 'Severity updated')} />
                  <EditableSelect label="Status" value={inc.status || 'open'} options={['open', 'investigating', 'resolved', 'closed']}
                    onSave={val => saveField(() => updateIncident(inc.id, { status: val }), 'Status updated')} />
                </div>
                {derivedProcessId && <EntityNotesSection entityType="incident" entityId={inc.id} processId={derivedProcessId} />}
              </div>
            ))}
          </TabsContent>

          {/* Applications Tab */}
          <TabsContent value="applications" className="mt-0 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-muted-foreground">{stepApps.length} item{stepApps.length !== 1 ? 's' : ''}</span>
              <Button size="sm" variant="ghost" className="h-6 text-xs gap-1" onClick={() => { setAppForm({ name: '', description: '', app_type: 'application', parent_id: '', application_owner: '', business_analyst_business: '', business_analyst_it: '', platform: '' }); setAddDialog('application'); }}>
                <Plus className="h-3 w-3" /> Add
              </Button>
            </div>
            {stepApps.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No applications or screens linked to this step</p>
            ) : (
              <>
                {/* Screens with nested apps */}
                {stepApps.filter(a => a.app_type === 'screen' && !a.parent_id).map(screen => {
                  const childApps = stepApps.filter(a => a.parent_id === screen.id);
                  return (
                    <div key={screen.id} className="p-3 rounded-lg border bg-sky-50/50 space-y-2 group">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-3.5 w-3.5 text-sky-500" />
                        <div className="flex-1">
                          <EditableField label="Screen" value={screen.name}
                            onSave={val => saveField(() => updateStepApplication(screen.id, { name: val }), 'Screen updated')} />
                        </div>
                        <Badge className="border-0 bg-sky-100 text-sky-700 text-[9px]">Screen</Badge>
                        <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => handleDeleteItem('application', screen.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <Button size="sm" variant="ghost" className="h-5 text-[10px] gap-0.5 text-sky-600"
                        onClick={() => { setAppForm({ name: '', description: '', app_type: 'application', parent_id: screen.id, application_owner: '', business_analyst_business: '', business_analyst_it: '', platform: '' }); setAddDialog('application'); }}>
                        <Plus className="h-2.5 w-2.5" /> Add App to Screen
                      </Button>
                      {childApps.map(app => (
                        <div key={app.id} className="ml-4 pl-3 border-l-2 border-sky-200 p-2 rounded border bg-card space-y-1 group/child">
                          <div className="flex items-center gap-2">
                            <Monitor className="h-3 w-3 text-sky-400" />
                            <div className="flex-1">
                              <EditableField label="Application" value={app.name}
                                onSave={val => saveField(() => updateStepApplication(app.id, { name: val }), 'App updated')} />
                            </div>
                            <Badge variant="outline" className="text-[8px]">App</Badge>
                            <Button variant="ghost" size="icon" className="h-4 w-4 opacity-0 group-hover/child:opacity-100 text-destructive" onClick={() => handleDeleteItem('application', app.id)}>
                              <Trash2 className="h-2.5 w-2.5" />
                            </Button>
                          </div>
                          {app.description && (
                            <EditableField label="Description" value={app.description} multiline
                              onSave={val => saveField(() => updateStepApplication(app.id, { description: val }), 'Updated')} />
                          )}
                          {derivedProcessId && <EntityNotesSection entityType="application" entityId={app.id} processId={derivedProcessId} />}
                        </div>
                      ))}
                      {derivedProcessId && <EntityNotesSection entityType="application" entityId={screen.id} processId={derivedProcessId} />}
                    </div>
                  );
                })}
                {/* Standalone applications */}
                {stepApps.filter(a => a.app_type !== 'screen' && !a.parent_id).map(app => (
                  <div key={app.id} className="p-3 rounded-lg border bg-sky-50/50 space-y-1.5 group">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-3.5 w-3.5 text-sky-500" />
                      <div className="flex-1">
                        <EditableField label="Application" value={app.name}
                          onSave={val => saveField(() => updateStepApplication(app.id, { name: val }), 'App updated')} />
                      </div>
                      <Badge variant="outline" className="text-[9px] capitalize">{app.app_type}</Badge>
                      <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => handleDeleteItem('application', app.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    {app.description && (
                      <EditableField label="Description" value={app.description} multiline
                        onSave={val => saveField(() => updateStepApplication(app.id, { description: val }), 'Description updated')} />
                    )}
                    {derivedProcessId && <EntityNotesSection entityType="application" entityId={app.id} processId={derivedProcessId} />}
                  </div>
                ))}
              </>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>

    {/* Add Risk Dialog */}
    <Dialog open={addDialog === 'risk'} onOpenChange={v => !v && setAddDialog(null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-orange-500" /> Add Risk</DialogTitle>
          <DialogDescription>Add a risk scenario to this step.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label>Description *</Label>
            <Textarea value={riskForm.description} onChange={e => setRiskForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the risk..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Likelihood</Label>
              <Select value={riskForm.likelihood} onValueChange={v => setRiskForm(f => ({ ...f, likelihood: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['low', 'medium', 'high', 'critical'].map(o => <SelectItem key={o} value={o} className="capitalize">{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Impact</Label>
              <Select value={riskForm.impact} onValueChange={v => setRiskForm(f => ({ ...f, impact: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['low', 'medium', 'high', 'critical'].map(o => <SelectItem key={o} value={o} className="capitalize">{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setAddDialog(null)}>Cancel</Button>
          <Button onClick={handleAddRisk} disabled={saving || !riskForm.description.trim()}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add Risk
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Add Control Dialog */}
    <Dialog open={addDialog === 'control'} onOpenChange={v => !v && setAddDialog(null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-blue-500" /> Add Control</DialogTitle>
          <DialogDescription>Add a control measure for this risk.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label>Control Name *</Label>
            <Input value={controlForm.name} onChange={e => setControlForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Access review policy" />
          </div>
          <div className="grid gap-1.5">
            <Label>Description</Label>
            <Textarea value={controlForm.description} onChange={e => setControlForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Type</Label>
              <Select value={controlForm.type} onValueChange={v => setControlForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['preventive', 'detective', 'corrective'].map(o => <SelectItem key={o} value={o} className="capitalize">{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Effectiveness</Label>
              <Select value={controlForm.effectiveness} onValueChange={v => setControlForm(f => ({ ...f, effectiveness: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['effective', 'partially', 'ineffective'].map(o => <SelectItem key={o} value={o} className="capitalize">{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setAddDialog(null)}>Cancel</Button>
          <Button onClick={handleAddControl} disabled={saving || !controlForm.name.trim()}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add Control
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Add Regulation Dialog */}
    <Dialog open={addDialog === 'regulation'} onOpenChange={v => !v && setAddDialog(null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Scale className="h-5 w-5 text-purple-500" /> Add Regulation</DialogTitle>
          <DialogDescription>Link a regulation to this step.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label>Regulation Name *</Label>
            <Input value={regulationForm.name} onChange={e => setRegulationForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. SOX Section 404" />
          </div>
          <div className="grid gap-1.5">
            <Label>Description</Label>
            <Textarea value={regulationForm.description} onChange={e => setRegulationForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Authority</Label>
              <Input value={regulationForm.authority} onChange={e => setRegulationForm(f => ({ ...f, authority: e.target.value }))} placeholder="e.g. SEC, BaFin" />
            </div>
            <div className="grid gap-1.5">
              <Label>Compliance Status</Label>
              <Select value={regulationForm.compliance_status} onValueChange={v => setRegulationForm(f => ({ ...f, compliance_status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['compliant', 'partial', 'non-compliant'].map(o => <SelectItem key={o} value={o} className="capitalize">{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setAddDialog(null)}>Cancel</Button>
          <Button onClick={handleAddRegulation} disabled={saving || !regulationForm.name.trim()}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add Regulation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Add Incident Dialog */}
    <Dialog open={addDialog === 'incident'} onOpenChange={v => !v && setAddDialog(null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-red-500" /> Add Incident</DialogTitle>
          <DialogDescription>Report a new incident for this step.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label>Title *</Label>
            <Input value={incidentForm.title} onChange={e => setIncidentForm(f => ({ ...f, title: e.target.value }))} placeholder="Incident title..." />
          </div>
          <div className="grid gap-1.5">
            <Label>Description</Label>
            <Textarea value={incidentForm.description} onChange={e => setIncidentForm(f => ({ ...f, description: e.target.value }))} placeholder="What happened..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Severity</Label>
              <Select value={incidentForm.severity} onValueChange={v => setIncidentForm(f => ({ ...f, severity: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['low', 'medium', 'high', 'critical'].map(o => <SelectItem key={o} value={o} className="capitalize">{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Select value={incidentForm.status} onValueChange={v => setIncidentForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['open', 'investigating', 'resolved', 'closed'].map(o => <SelectItem key={o} value={o} className="capitalize">{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setAddDialog(null)}>Cancel</Button>
          <Button onClick={handleAddIncident} disabled={saving || !incidentForm.title.trim()}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add Incident
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Add Application Dialog */}
    <Dialog open={addDialog === 'application'} onOpenChange={v => !v && setAddDialog(null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Monitor className="h-5 w-5 text-sky-500" /> Add Application / Screen</DialogTitle>
          <DialogDescription>Add a standalone application or a screen with linked apps.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label>What are you adding?</Label>
            <Select value={appForm.app_type} onValueChange={v => setAppForm(f => ({ ...f, app_type: v, parent_id: v === 'screen' ? '' : f.parent_id }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="application">Application</SelectItem>
                <SelectItem value="screen">Screen</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>{appForm.app_type === 'screen' ? 'Screen Name' : 'Application Name'} *</Label>
            <Input value={appForm.name} onChange={e => setAppForm(f => ({ ...f, name: e.target.value }))} placeholder={appForm.app_type === 'screen' ? 'e.g. Invoice Entry Screen' : 'e.g. SAP FI, Oracle EBS'} />
          </div>
          {appForm.app_type === 'application' && stepApps.filter(a => a.app_type === 'screen' && !a.parent_id).length > 0 && (
            <div className="grid gap-1.5">
              <Label>Link to Screen (optional)</Label>
              <Select value={appForm.parent_id || '__none__'} onValueChange={v => setAppForm(f => ({ ...f, parent_id: v === '__none__' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Standalone application" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Standalone (no screen)</SelectItem>
                  {stepApps.filter(a => a.app_type === 'screen' && !a.parent_id).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid gap-1.5">
            <Label>Description</Label>
            <Textarea value={appForm.description} onChange={e => setAppForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Application Owner</Label>
              <Input value={appForm.application_owner} onChange={e => setAppForm(f => ({ ...f, application_owner: e.target.value }))} placeholder="e.g. John Smith" />
            </div>
            <div className="grid gap-1.5">
              <Label>Platform</Label>
              <Input value={appForm.platform} onChange={e => setAppForm(f => ({ ...f, platform: e.target.value }))} placeholder="e.g. SAP, Oracle" />
            </div>
            <div className="grid gap-1.5">
              <Label>Business Analyst (Business)</Label>
              <Input value={appForm.business_analyst_business} onChange={e => setAppForm(f => ({ ...f, business_analyst_business: e.target.value }))} placeholder="BA name" />
            </div>
            <div className="grid gap-1.5">
              <Label>Business Analyst (IT)</Label>
              <Input value={appForm.business_analyst_it} onChange={e => setAppForm(f => ({ ...f, business_analyst_it: e.target.value }))} placeholder="BA IT name" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setAddDialog(null)}>Cancel</Button>
          <Button onClick={handleAddApplication} disabled={saving || !appForm.name.trim()}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add {appForm.app_type === 'screen' ? 'Screen' : 'Application'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <ConfirmDialog
      open={!!pendingDelete}
      title={`Delete ${pendingDelete?.type || ''}?`}
      description={`Are you sure you want to delete this ${pendingDelete?.type || 'item'}? This action cannot be undone.`}
      confirmLabel="Delete"
      onConfirm={executeDelete}
      onCancel={() => setPendingDelete(null)}
    />
    </>
  );
}
