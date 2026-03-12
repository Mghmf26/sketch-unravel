import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, Trash2, Download, Upload as UploadIcon, Search, Users, ChevronDown, ChevronRight,
  Check, X, Link2, Filter, BarChart3, Briefcase, Building2, UserCheck, Copy, Pencil
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import {
  fetchProcessRaci, insertProcessRaci, updateProcessRaci, deleteProcessRaci,
  fetchRaciStepLinks, insertRaciStepLink, deleteRaciStepLink,
  type ProcessRaci, type ProcessRaciStepLink,
} from '@/lib/api-raci';
import { fetchSteps, type ProcessStep } from '@/lib/api';
import { exportRaciToExcel, parseRaciExcel } from '@/lib/raci-excel';
import { useColumnSettings, type ColumnDef } from '@/hooks/useColumnSettings';
import { ColumnSettingsDropdown } from '@/components/ColumnSettingsDropdown';
import RaciOrganigramView from '@/components/RaciOrganigramView';
import EditRaciDialog from '@/components/EditRaciDialog';

interface RaciManagementTabProps {
  processId: string;
  processName?: string;
}

const RACI_COLUMNS: ColumnDef[] = [
  { key: 'role_name', label: 'Role / Function', defaultVisible: true, minWidth: 140 },
  { key: 'job_title', label: 'Job Title', defaultVisible: true, minWidth: 120 },
  { key: 'function_dept', label: 'Function', defaultVisible: true, minWidth: 100 },
  { key: 'sub_function', label: 'Sub Function', defaultVisible: true, minWidth: 100 },
  { key: 'responsible', label: 'R', defaultVisible: true, minWidth: 80 },
  { key: 'accountable', label: 'A', defaultVisible: true, minWidth: 80 },
  { key: 'consulted', label: 'C', defaultVisible: true, minWidth: 80 },
  { key: 'informed', label: 'I', defaultVisible: true, minWidth: 80 },
  { key: 'seniority', label: 'Seniority', defaultVisible: false, minWidth: 80 },
  { key: 'tenure', label: 'Tenure', defaultVisible: false, minWidth: 80 },
  { key: 'grade', label: 'Grade', defaultVisible: false, minWidth: 60 },
  { key: 'fte', label: 'FTE', defaultVisible: true, minWidth: 50 },
  { key: 'salary', label: 'Salary', defaultVisible: false, minWidth: 80 },
  { key: 'manager_status', label: 'Manager', defaultVisible: false, minWidth: 80 },
  { key: 'span_of_control', label: 'Span', defaultVisible: false, minWidth: 60 },
  { key: 'steps', label: 'Linked Steps', defaultVisible: true, minWidth: 140 },
];

// Inline editable cell
function EditableCell({ value, onSave, type = 'text' }: { value: string; onSave: (v: string) => void; type?: 'text' | 'number' }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editing) {
    return (
      <span
        className="cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1 transition-colors block truncate min-h-[18px]"
        onClick={() => { setDraft(value); setEditing(true); }}
        title={value || 'Click to edit'}
      >
        {value || <span className="text-muted-foreground/50 italic">—</span>}
      </span>
    );
  }

  const save = () => {
    if (draft !== value) onSave(draft);
    setEditing(false);
  };

  return (
    <span className="inline-flex items-center gap-0.5">
      <Input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        className="h-6 text-xs w-full min-w-[60px] px-1"
        type={type}
        autoFocus
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
        onBlur={save}
      />
    </span>
  );
}

// RACI people tags
function RaciCell({ value, color, onSave }: { value: string; color: string; onSave: (v: string) => void }) {
  const [adding, setAdding] = useState(false);
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
    setAdding(false);
  };

  const removePerson = (idx: number) => {
    const newPeople = people.filter((_, i) => i !== idx);
    onSave(newPeople.join(', '));
  };

  return (
    <div className="flex items-center gap-0.5 flex-wrap">
      {people.map((p, i) => (
        <Badge key={i} className={`border-0 ${c.bg} ${c.text} text-[9px] gap-0.5 cursor-pointer hover:opacity-70 px-1.5 py-0`}
          onClick={() => removePerson(i)}>
          {p} ×
        </Badge>
      ))}
      {adding ? (
        <span className="inline-flex items-center gap-0.5">
          <Input value={draft} onChange={e => setDraft(e.target.value)} className="h-5 text-[10px] w-20 px-1"
            autoFocus placeholder="Name..."
            onKeyDown={e => { if (e.key === 'Enter') addPerson(); if (e.key === 'Escape') setAdding(false); }} />
          <Button variant="ghost" size="icon" className="h-4 w-4" onClick={addPerson}><Check className="h-2.5 w-2.5" /></Button>
        </span>
      ) : (
        <Button variant="ghost" size="icon" className="h-4 w-4 opacity-50 hover:opacity-100" onClick={() => setAdding(true)}>
          <Plus className="h-2.5 w-2.5" />
        </Button>
      )}
    </div>
  );
}

export default function RaciManagementTab({ processId, processName }: RaciManagementTabProps) {
  const [raciEntries, setRaciEntries] = useState<ProcessRaci[]>([]);
  const [raciStepLinks, setRaciStepLinks] = useState<ProcessRaciStepLink[]>([]);
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('__all__');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [importProcessDialogOpen, setImportProcessDialogOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'matrix' | 'organigram'>('table');
  const [editEntry, setEditEntry] = useState<ProcessRaci | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const colSettings = useColumnSettings('raci-tab', RACI_COLUMNS);

  const reload = useCallback(async () => {
    try {
      const [r, links, s] = await Promise.all([
        fetchProcessRaci(processId),
        fetchRaciStepLinks(processId),
        fetchSteps(processId),
      ]);
      setRaciEntries(r);
      setRaciStepLinks(links);
      setSteps(s);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error loading RACI data', variant: 'destructive' });
    } finally { setLoading(false); }
  }, [processId]);

  useEffect(() => { reload(); }, [reload]);

  const departments = useMemo(() => {
    const depts = new Set(raciEntries.map(r => r.function_dept).filter(Boolean));
    return Array.from(depts).sort();
  }, [raciEntries]);

  const filtered = useMemo(() => {
    return raciEntries.filter(r => {
      if (filterDept !== '__all__' && r.function_dept !== filterDept) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          r.role_name.toLowerCase().includes(q) ||
          (r.job_title || '').toLowerCase().includes(q) ||
          (r.function_dept || '').toLowerCase().includes(q) ||
          (r.responsible || '').toLowerCase().includes(q) ||
          (r.accountable || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [raciEntries, search, filterDept]);

  const inScopeSteps = useMemo(() => steps.filter(s => s.type === 'in-scope'), [steps]);

  const totalFte = useMemo(() => raciEntries.reduce((s, r) => s + (r.fte || 0), 0), [raciEntries]);
  const totalSalary = useMemo(() => raciEntries.reduce((s, r) => s + (r.salary || 0), 0), [raciEntries]);

  const handleUpdate = async (id: string, field: string, value: any) => {
    try {
      await updateProcessRaci(id, { [field]: value } as any);
      reload();
    } catch (err) {
      toast({ title: 'Update failed', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this RACI role?')) return;
    await deleteProcessRaci(id);
    toast({ title: 'Role deleted' });
    reload();
  };

  const handleExport = () => {
    exportRaciToExcel({ processName: processName || 'Process', raciEntries, raciStepLinks, steps });
    toast({ title: 'RACI exported to Excel' });
  };

  const handleImport = async (file: File) => {
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
        } as any);
        imported++;
      }
      toast({ title: `Imported ${imported} RACI roles` });
      reload();
    } catch (err: any) {
      toast({ title: 'Import failed', description: err.message, variant: 'destructive' });
    }
  };

  const getLinkedSteps = (raciId: string) => {
    const stepIds = raciStepLinks.filter(l => l.raci_id === raciId).map(l => l.step_id);
    return steps.filter(s => stepIds.includes(s.id));
  };

  const getUnlinkedSteps = (raciId: string) => {
    const linkedIds = raciStepLinks.filter(l => l.raci_id === raciId).map(l => l.step_id);
    return inScopeSteps.filter(s => !linkedIds.includes(s.id));
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading RACI data...</div>;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total Roles</p>
              <p className="text-lg font-bold">{raciEntries.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Departments</p>
              <p className="text-lg font-bold">{departments.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total FTE</p>
              <p className="text-lg font-bold">{totalFte.toFixed(1)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Link2 className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Step Links</p>
              <p className="text-lg font-bold">{raciStepLinks.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search roles..." className="h-8 pl-8 text-xs" />
        </div>
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="h-8 text-xs w-auto min-w-[140px]">
            <Filter className="h-3 w-3 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Departments</SelectItem>
            {departments.map(d => <SelectItem key={d!} value={d!}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <ColumnSettingsDropdown columns={colSettings.columns} settings={colSettings.settings} toggleColumn={colSettings.toggleColumn} setColumnWidth={colSettings.setColumnWidth} resetAll={colSettings.resetAll} />
        <div className="flex-1" />
        <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => setImportProcessDialogOpen(true)}>
          <Copy className="h-3.5 w-3.5" /> Clone from Process
        </Button>
        <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={handleExport}>
          <Download className="h-3.5 w-3.5" /> Export
        </Button>
        <label className="cursor-pointer">
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 pointer-events-none" asChild>
            <span><UploadIcon className="h-3.5 w-3.5" /> Import</span>
          </Button>
          <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={e => {
            const file = e.target.files?.[0];
            if (file) handleImport(file);
            e.target.value = '';
          }} />
        </label>
        <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Add Role
        </Button>
      </div>

      {/* View Tabs */}
      <Tabs value={viewMode} onValueChange={v => setViewMode(v as any)}>
        <TabsList className="h-8 bg-muted/50">
          <TabsTrigger value="table" className="text-xs h-7 px-3">Table View</TabsTrigger>
          <TabsTrigger value="matrix" className="text-xs h-7 px-3">RACI Matrix</TabsTrigger>
          <TabsTrigger value="organigram" className="text-xs h-7 px-3">Organigram</TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="mt-3">
          {filtered.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">
              {raciEntries.length === 0 ? 'No RACI roles defined yet. Click "Add Role" to get started.' : 'No roles match your filters.'}
            </CardContent></Card>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="w-8 px-2 py-2" />
                      {colSettings.visibleColumns.map(col => (
                        <th key={col.key} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap"
                          style={colSettings.getWidth(col.key) ? { width: colSettings.getWidth(col.key) } : undefined}>
                          {col.label}
                        </th>
                      ))}
                      <th className="w-10 px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {filtered.map(raci => {
                      const linked = getLinkedSteps(raci.id);
                      const unlinked = getUnlinkedSteps(raci.id);
                      const isExpanded = expandedId === raci.id;

                      return (
                        <Collapsible key={raci.id} open={isExpanded} onOpenChange={() => setExpandedId(isExpanded ? null : raci.id)} asChild>
                          <>
                            <CollapsibleTrigger asChild>
                              <tr className="hover:bg-muted/30 cursor-pointer transition-colors group">
                                <td className="px-2 py-2 text-center">
                                  {isExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                                </td>
                                {colSettings.isVisible('role_name') && (
                                  <td className="px-3 py-2 font-semibold" onClick={e => e.stopPropagation()}>
                                    <EditableCell value={raci.role_name} onSave={v => handleUpdate(raci.id, 'role_name', v)} />
                                  </td>
                                )}
                                {colSettings.isVisible('job_title') && (
                                  <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                                    <EditableCell value={raci.job_title || ''} onSave={v => handleUpdate(raci.id, 'job_title', v || null)} />
                                  </td>
                                )}
                                {colSettings.isVisible('function_dept') && (
                                  <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                                    <EditableCell value={raci.function_dept || ''} onSave={v => handleUpdate(raci.id, 'function_dept', v || null)} />
                                  </td>
                                )}
                                {colSettings.isVisible('sub_function') && (
                                  <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                                    <EditableCell value={raci.sub_function || ''} onSave={v => handleUpdate(raci.id, 'sub_function', v || null)} />
                                  </td>
                                )}
                                {colSettings.isVisible('responsible') && (
                                  <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                                    <RaciCell value={raci.responsible || ''} color="emerald" onSave={v => handleUpdate(raci.id, 'responsible', v || null)} />
                                  </td>
                                )}
                                {colSettings.isVisible('accountable') && (
                                  <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                                    <RaciCell value={raci.accountable || ''} color="blue" onSave={v => handleUpdate(raci.id, 'accountable', v || null)} />
                                  </td>
                                )}
                                {colSettings.isVisible('consulted') && (
                                  <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                                    <RaciCell value={raci.consulted || ''} color="amber" onSave={v => handleUpdate(raci.id, 'consulted', v || null)} />
                                  </td>
                                )}
                                {colSettings.isVisible('informed') && (
                                  <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                                    <RaciCell value={raci.informed || ''} color="purple" onSave={v => handleUpdate(raci.id, 'informed', v || null)} />
                                  </td>
                                )}
                                {colSettings.isVisible('seniority') && (
                                  <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                                    <EditableCell value={raci.seniority || ''} onSave={v => handleUpdate(raci.id, 'seniority', v || null)} />
                                  </td>
                                )}
                                {colSettings.isVisible('tenure') && (
                                  <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                                    <EditableCell value={raci.tenure || ''} onSave={v => handleUpdate(raci.id, 'tenure', v || null)} />
                                  </td>
                                )}
                                {colSettings.isVisible('grade') && (
                                  <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                                    <EditableCell value={raci.grade || ''} onSave={v => handleUpdate(raci.id, 'grade', v || null)} />
                                  </td>
                                )}
                                {colSettings.isVisible('fte') && (
                                  <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                                    <EditableCell value={raci.fte != null ? String(raci.fte) : ''} type="number" onSave={v => handleUpdate(raci.id, 'fte', parseFloat(v) || null)} />
                                  </td>
                                )}
                                {colSettings.isVisible('salary') && (
                                  <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                                    <EditableCell value={raci.salary != null ? String(raci.salary) : ''} type="number" onSave={v => handleUpdate(raci.id, 'salary', parseFloat(v) || null)} />
                                  </td>
                                )}
                                {colSettings.isVisible('manager_status') && (
                                  <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                                    <Select value={raci.manager_status || '__none__'} onValueChange={v => handleUpdate(raci.id, 'manager_status', v === '__none__' ? null : v)}>
                                      <SelectTrigger className="h-5 text-[10px] w-auto min-w-[60px] border-dashed"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="__none__">—</SelectItem>
                                        <SelectItem value="yes">Yes</SelectItem>
                                        <SelectItem value="no">No</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </td>
                                )}
                                {colSettings.isVisible('span_of_control') && (
                                  <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                                    <EditableCell value={raci.span_of_control != null ? String(raci.span_of_control) : ''} type="number" onSave={v => handleUpdate(raci.id, 'span_of_control', parseInt(v) || null)} />
                                  </td>
                                )}
                                {colSettings.isVisible('steps') && (
                                  <td className="px-3 py-2">
                                    <div className="flex gap-1 flex-wrap">
                                      {linked.length > 0
                                        ? linked.map(s => (
                                            <Badge key={s.id} variant="secondary" className="text-[9px] px-1.5 py-0 bg-cyan-100 text-cyan-700 border-0">
                                              {s.label}
                                            </Badge>
                                          ))
                                        : <span className="text-muted-foreground/50 italic">None</span>
                                      }
                                    </div>
                                  </td>
                                )}
                                 <td className="px-2 py-2 text-right">
                                   <div className="flex items-center gap-0.5 justify-end">
                                     <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary"
                                       onClick={e => { e.stopPropagation(); setEditEntry(raci); setEditDialogOpen(true); }}
                                       title="Edit RACI role">
                                       <Pencil className="h-3 w-3" />
                                     </Button>
                                     <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                                       onClick={e => { e.stopPropagation(); handleDelete(raci.id); }}>
                                       <Trash2 className="h-3 w-3" />
                                     </Button>
                                   </div>
                                 </td>
                              </tr>
                            </CollapsibleTrigger>
                            <CollapsibleContent asChild>
                              <tr>
                                <td colSpan={colSettings.visibleColumns.length + 2} className="bg-muted/20 px-6 py-4 border-b">
                                  <div className="space-y-3">
                                    {/* Job Description */}
                                    <div>
                                      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Job Description</Label>
                                      <Textarea
                                        value={raci.job_description || ''}
                                        onChange={e => handleUpdate(raci.id, 'job_description', e.target.value || null)}
                                        placeholder="Enter job description..."
                                        className="mt-1 text-xs min-h-[60px] resize-y"
                                      />
                                    </div>

                                    {/* Step Links Management */}
                                    <div>
                                      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Linked Steps</Label>
                                      <div className="flex gap-1.5 flex-wrap mt-1.5">
                                        {linked.map(s => {
                                          const link = raciStepLinks.find(l => l.raci_id === raci.id && l.step_id === s.id);
                                          return (
                                            <Badge key={s.id} className="border-0 bg-cyan-100 text-cyan-700 text-[10px] gap-1 cursor-pointer hover:bg-red-100 hover:text-red-700 transition-colors"
                                              onClick={() => { if (link && confirm(`Unlink "${s.label}"?`)) deleteRaciStepLink(link.id).then(reload); }}>
                                              {s.label} ×
                                            </Badge>
                                          );
                                        })}
                                        {linked.length === 0 && <span className="text-[10px] text-muted-foreground italic">No steps linked</span>}
                                      </div>
                                      {unlinked.length > 0 && (
                                        <Select onValueChange={v => insertRaciStepLink(raci.id, v).then(reload)}>
                                          <SelectTrigger className="h-7 text-xs w-auto min-w-[160px] mt-2 border-dashed">
                                            <SelectValue placeholder="+ Link a step..." />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {unlinked.map(s => <SelectItem key={s.id} value={s.id} className="text-xs">{s.label}</SelectItem>)}
                                          </SelectContent>
                                        </Select>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            </CollapsibleContent>
                          </>
                        </Collapsible>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="matrix" className="mt-3">
          <RaciMatrixView raciEntries={filtered} steps={inScopeSteps} raciStepLinks={raciStepLinks} />
        </TabsContent>

        <TabsContent value="organigram" className="mt-3">
          <RaciOrganigramView
            raciEntries={filtered}
            steps={inScopeSteps}
            onUpdateRaci={handleUpdate}
          />
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <EditRaciDialog
        open={addDialogOpen || editDialogOpen}
        onClose={() => { setAddDialogOpen(false); setEditDialogOpen(false); setEditEntry(null); }}
        onRefresh={reload}
        entry={editEntry}
        processId={processId}
      />
      {/* Import from Process Dialog */}
      {importProcessDialogOpen && (
        <ImportFromProcessDialog processId={processId} onClose={() => setImportProcessDialogOpen(false)} onRefresh={reload} />
      )}
    </div>
  );
}

// RACI Matrix View (Roles × Steps)
function RaciMatrixView({ raciEntries, steps, raciStepLinks }: {
  raciEntries: ProcessRaci[];
  steps: ProcessStep[];
  raciStepLinks: ProcessRaciStepLink[];
}) {
  if (raciEntries.length === 0 || steps.length === 0) {
    return (
      <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">
        Add RACI roles and link them to steps to see the matrix view.
      </CardContent></Card>
    );
  }

  const getAssignment = (raciId: string, stepId: string): string => {
    const isLinked = raciStepLinks.some(l => l.raci_id === raciId && l.step_id === stepId);
    if (!isLinked) return '';
    const raci = raciEntries.find(r => r.id === raciId);
    if (!raci) return '';
    const parts: string[] = [];
    if (raci.responsible) parts.push('R');
    if (raci.accountable) parts.push('A');
    if (raci.consulted) parts.push('C');
    if (raci.informed) parts.push('I');
    return parts.join('/') || '●';
  };

  const cellColor = (assignment: string) => {
    if (!assignment) return '';
    if (assignment.includes('R')) return 'bg-emerald-100 text-emerald-700';
    if (assignment.includes('A')) return 'bg-blue-100 text-blue-700';
    if (assignment.includes('C')) return 'bg-amber-100 text-amber-700';
    if (assignment.includes('I')) return 'bg-purple-100 text-purple-700';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sticky left-0 bg-muted/50 z-10 min-w-[160px]">
                Role / Function
              </th>
              {steps.map(s => (
                <th key={s.id} className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground min-w-[80px] max-w-[120px]">
                  <span className="block truncate" title={s.label}>{s.label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {raciEntries.map(raci => (
              <tr key={raci.id} className="hover:bg-muted/20">
                <td className="px-3 py-2 font-medium sticky left-0 bg-background z-10 border-r border-border/30">
                  <div className="truncate max-w-[160px]" title={raci.role_name}>{raci.role_name}</div>
                  {raci.function_dept && <span className="text-[9px] text-muted-foreground">{raci.function_dept}</span>}
                </td>
                {steps.map(s => {
                  const assignment = getAssignment(raci.id, s.id);
                  return (
                    <td key={s.id} className="px-2 py-2 text-center">
                      {assignment ? (
                        <Badge variant="secondary" className={`text-[9px] px-1.5 py-0 border-0 font-bold ${cellColor(assignment)}`}>
                          {assignment}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground/30">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 bg-muted/30 border-t flex gap-4 text-[10px] text-muted-foreground">
        <span><Badge className="border-0 bg-emerald-100 text-emerald-700 text-[9px] px-1.5 py-0">R</Badge> Responsible</span>
        <span><Badge className="border-0 bg-blue-100 text-blue-700 text-[9px] px-1.5 py-0">A</Badge> Accountable</span>
        <span><Badge className="border-0 bg-amber-100 text-amber-700 text-[9px] px-1.5 py-0">C</Badge> Consulted</span>
        <span><Badge className="border-0 bg-purple-100 text-purple-700 text-[9px] px-1.5 py-0">I</Badge> Informed</span>
      </div>
    </div>
  );
}

// Add Role Dialog
function AddRaciRoleDialog({ processId, onClose, onRefresh }: { processId: string; onClose: () => void; onRefresh: () => void }) {
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
      toast({ title: 'Please fill mandatory fields (Role Name, Job Title, Function)', variant: 'destructive' });
      return;
    }
    await insertProcessRaci({
      process_id: processId,
      role_name: roleName.trim(),
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
      responsible: responsible || null,
      accountable: accountable || null,
      consulted: consulted || null,
      informed: informed || null,
    } as any);
    toast({ title: 'RACI role added' });
    onRefresh();
    onClose();
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
            </div>
            <div className="grid gap-1.5">
              <Label>Function (Department) *</Label>
              <Input value={functionDept} onChange={e => setFunctionDept(e.target.value)} placeholder="e.g. Finance, IT" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Job Description</Label>
            <Textarea value={jobDesc} onChange={e => setJobDesc(e.target.value)} placeholder="Short description of the role" className="min-h-[60px]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Sub Function</Label>
              <Input value={subFunction} onChange={e => setSubFunction(e.target.value)} placeholder="e.g. Accounts Payable" />
            </div>
            <div className="grid gap-1.5">
              <Label>Seniority</Label>
              <Input value={seniority} onChange={e => setSeniority(e.target.value)} placeholder="e.g. Senior, Lead" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label>Tenure</Label>
              <Input value={tenure} onChange={e => setTenure(e.target.value)} placeholder="e.g. 5 years" />
            </div>
            <div className="grid gap-1.5">
              <Label>Grade</Label>
              <Input value={grade} onChange={e => setGrade(e.target.value)} placeholder="e.g. L4" />
            </div>
            <div className="grid gap-1.5">
              <Label>FTE</Label>
              <Input type="number" step="0.1" value={fte} onChange={e => setFte(e.target.value)} placeholder="1.0" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label>Salary</Label>
              <Input type="number" value={salary} onChange={e => setSalary(e.target.value)} placeholder="Annual" />
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
            </div>
            <div className="grid gap-1.5">
              <Label>Span of Control</Label>
              <Input type="number" value={spanOfControl} onChange={e => setSpanOfControl(e.target.value)} placeholder="# direct reports" />
            </div>
          </div>
          <Separator />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">RACI Assignments</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-emerald-700">Responsible</Label>
              <Input value={responsible} onChange={e => setResponsible(e.target.value)} placeholder="Comma-separated names" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-blue-700">Accountable</Label>
              <Input value={accountable} onChange={e => setAccountable(e.target.value)} placeholder="Comma-separated names" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-amber-700">Consulted</Label>
              <Input value={consulted} onChange={e => setConsulted(e.target.value)} placeholder="Comma-separated names" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-purple-700">Informed</Label>
              <Input value={informed} onChange={e => setInformed(e.target.value)} placeholder="Comma-separated names" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>Add Role</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Import RACI from another process (clone/copy approach)
function ImportFromProcessDialog({ processId, onClose, onRefresh }: { processId: string; onClose: () => void; onRefresh: () => void }) {
  const [processes, setProcesses] = useState<{ id: string; process_name: string }[]>([]);
  const [selectedProcessId, setSelectedProcessId] = useState('');
  const [previewRaci, setPreviewRaci] = useState<ProcessRaci[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await (await import('@/integrations/supabase/client')).supabase
        .from('business_processes').select('id, process_name').neq('id', processId).order('process_name');
      setProcesses(data || []);
    })();
  }, [processId]);

  const loadPreview = async (pid: string) => {
    setSelectedProcessId(pid);
    setLoading(true);
    try {
      const entries = await fetchProcessRaci(pid);
      setPreviewRaci(entries);
      setSelectedIds(new Set(entries.map(e => e.id)));
    } finally { setLoading(false); }
  };

  const toggleId = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleImport = async () => {
    const toImport = previewRaci.filter(r => selectedIds.has(r.id));
    if (toImport.length === 0) return;
    setImporting(true);
    try {
      for (const r of toImport) {
        await insertProcessRaci({
          process_id: processId,
          role_name: r.role_name,
          job_title: r.job_title,
          job_description: r.job_description,
          function_dept: r.function_dept,
          sub_function: r.sub_function,
          seniority: r.seniority,
          tenure: r.tenure,
          grade: r.grade,
          fte: r.fte,
          salary: r.salary,
          manager_status: r.manager_status,
          span_of_control: r.span_of_control,
          responsible: r.responsible,
          accountable: r.accountable,
          consulted: r.consulted,
          informed: r.informed,
        } as any);
      }
      toast({ title: `Cloned ${toImport.length} RACI roles from another process` });
      onRefresh();
      onClose();
    } catch (err: any) {
      toast({ title: 'Clone failed', description: err.message, variant: 'destructive' });
    } finally { setImporting(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Copy className="h-5 w-5 text-primary" /> Clone RACI from Another Process</DialogTitle>
          <DialogDescription>Select a process to clone its RACI roles into this process. Each role will be copied independently.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-1.5">
            <Label className="text-xs font-semibold">Source Process</Label>
            <Select value={selectedProcessId} onValueChange={loadPreview}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select a process..." /></SelectTrigger>
              <SelectContent>
                {processes.map(p => <SelectItem key={p.id} value={p.id}>{p.process_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {loading && <p className="text-sm text-muted-foreground text-center py-4">Loading RACI roles...</p>}

          {!loading && previewRaci.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Select roles to clone ({selectedIds.size}/{previewRaci.length})</Label>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setSelectedIds(new Set(previewRaci.map(r => r.id)))}>Select All</Button>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setSelectedIds(new Set())}>Deselect All</Button>
                </div>
              </div>
              <div className="border rounded-lg max-h-[300px] overflow-y-auto divide-y">
                {previewRaci.map(r => (
                  <label key={r.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/30 cursor-pointer">
                    <Checkbox checked={selectedIds.has(r.id)} onCheckedChange={() => toggleId(r.id)} className="h-4 w-4" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{r.role_name}</span>
                      <div className="flex gap-2 text-[10px] text-muted-foreground">
                        {r.job_title && <span>{r.job_title}</span>}
                        {r.function_dept && <span>• {r.function_dept}</span>}
                        {r.fte != null && <span>• {r.fte} FTE</span>}
                      </div>
                      <div className="flex gap-1 mt-0.5 flex-wrap">
                        {r.responsible && <Badge className="border-0 bg-emerald-100 text-emerald-700 text-[8px] px-1 py-0">R: {r.responsible}</Badge>}
                        {r.accountable && <Badge className="border-0 bg-blue-100 text-blue-700 text-[8px] px-1 py-0">A: {r.accountable}</Badge>}
                        {r.consulted && <Badge className="border-0 bg-amber-100 text-amber-700 text-[8px] px-1 py-0">C: {r.consulted}</Badge>}
                        {r.informed && <Badge className="border-0 bg-purple-100 text-purple-700 text-[8px] px-1 py-0">I: {r.informed}</Badge>}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {!loading && selectedProcessId && previewRaci.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No RACI roles found in the selected process.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleImport} disabled={importing || selectedIds.size === 0}>
            {importing ? 'Cloning...' : `Clone ${selectedIds.size} Role(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
