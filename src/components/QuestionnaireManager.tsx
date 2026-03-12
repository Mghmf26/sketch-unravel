import { useEffect, useState } from 'react';
import {
  fetchQuestions, insertQuestion, updateQuestion, deleteQuestion,
  type QuestionnaireQuestion,
} from '@/lib/api-questionnaire';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Search, Filter } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const STEP_TYPE_OPTIONS = [
  { value: 'critical', label: 'Critical' },
  { value: 'decisional', label: 'Decisional' },
  { value: 'mechanical', label: 'Mechanical' },
];

const LEVEL_OPTIONS = [
  { value: 1, label: 'Level 1 — Very Important', color: 'bg-destructive/10 text-destructive border-destructive/30' },
  { value: 2, label: 'Level 2 — Important', color: 'bg-amber-500/10 text-amber-700 border-amber-300' },
  { value: 3, label: 'Level 3 — Not Important', color: 'bg-muted text-muted-foreground border-border' },
];

const EMPTY_FORM = {
  section_number: 1,
  section_name: '',
  question_number: 0,
  question_text: '',
  observation_text: '',
  step_types: [] as string[],
  importance_level: 1,
  is_active: true,
  position_index: 0,
};

export default function QuestionnaireManager() {
  const [questions, setQuestions] = useState<QuestionnaireQuestion[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<QuestionnaireQuestion | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [filterSection, setFilterSection] = useState('all');

  const load = async () => {
    const q = await fetchQuestions();
    setQuestions(q);
  };

  useEffect(() => { load(); }, []);

  const sections = [...new Set(questions.map(q => q.section_name))];
  const sectionNumbers = [...new Set(questions.map(q => q.section_number))].sort();

  const filtered = questions.filter(q => {
    const matchSearch = !search || q.question_text.toLowerCase().includes(search.toLowerCase());
    const matchSection = filterSection === 'all' || q.section_name === filterSection;
    return matchSearch && matchSection;
  });

  const grouped = sectionNumbers
    .map(sn => ({
      number: sn,
      name: questions.find(q => q.section_number === sn)?.section_name || '',
      items: filtered.filter(q => q.section_number === sn),
    }))
    .filter(g => g.items.length > 0);

  const openAdd = () => {
    setEditing(null);
    const maxQ = questions.length > 0 ? Math.max(...questions.map(q => q.question_number)) : 0;
    const maxPos = questions.length > 0 ? Math.max(...questions.map(q => q.position_index)) : 0;
    setForm({ ...EMPTY_FORM, question_number: maxQ + 1, position_index: maxPos + 1 });
    setShowDialog(true);
  };

  const openEdit = (q: QuestionnaireQuestion) => {
    setEditing(q);
    setForm({
      section_number: q.section_number,
      section_name: q.section_name,
      question_number: q.question_number,
      question_text: q.question_text,
      observation_text: q.observation_text || '',
      step_types: q.step_types || [],
      importance_level: q.importance_level,
      is_active: q.is_active,
      position_index: q.position_index,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.question_text.trim() || !form.section_name.trim()) {
      toast({ title: 'Question text and section name are required', variant: 'destructive' });
      return;
    }
    try {
      if (editing) {
        await updateQuestion(editing.id, form);
        toast({ title: 'Question updated' });
      } else {
        await insertQuestion(form);
        toast({ title: 'Question added' });
      }
      setShowDialog(false);
      load();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this question? This cannot be undone.')) return;
    try {
      await deleteQuestion(id);
      toast({ title: 'Question deleted' });
      load();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const toggleStepType = (type: string) => {
    setForm(f => ({
      ...f,
      step_types: f.step_types.includes(type)
        ? f.step_types.filter(t => t !== type)
        : [...f.step_types, type],
    }));
  };

  const levelBadge = (level: number) => {
    const opt = LEVEL_OPTIONS.find(l => l.value === level);
    return (
      <Badge variant="outline" className={`text-[10px] ${opt?.color || ''}`}>
        L{level}
      </Badge>
    );
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Business Process Analysis Questionnaire</CardTitle>
            <CardDescription>Manage questions used during step analysis. {questions.length} questions across {sectionNumbers.length} sections.</CardDescription>
          </div>
          <Button onClick={openAdd} size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> Add Question
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search questions..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterSection} onValueChange={setFilterSection}>
            <SelectTrigger className="w-64">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Sections" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sections</SelectItem>
              {sections.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Questions by section */}
        <Accordion type="multiple" defaultValue={sectionNumbers.map(String)} className="space-y-2">
          {grouped.map(section => (
            <AccordionItem key={section.number} value={String(section.number)} className="border rounded-lg">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-xs">Section {section.number}</Badge>
                  <span className="font-semibold text-sm">{section.name}</span>
                  <span className="text-xs text-muted-foreground">({section.items.length} questions)</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-0 pb-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-[10px] font-semibold uppercase w-12">#</TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase">Question</TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase w-36">Step Types</TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase w-20 text-center">Level</TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase w-16 text-center">Active</TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase w-20 text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {section.items.map(q => (
                      <TableRow key={q.id} className={!q.is_active ? 'opacity-50' : ''}>
                        <TableCell className="text-xs font-mono text-muted-foreground">{q.question_number}</TableCell>
                        <TableCell>
                          <p className="text-sm">{q.question_text}</p>
                          {q.observation_text && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 italic">↳ {q.observation_text}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(q.step_types || []).map(t => (
                              <Badge key={t} variant="secondary" className="text-[9px] capitalize">{t}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{levelBadge(q.importance_level)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={`text-[9px] ${q.is_active ? 'border-emerald-300 text-emerald-700' : 'border-destructive/30 text-destructive'}`}>
                            {q.is_active ? 'Yes' : 'No'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(q)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(q.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">No questions found.</div>
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Question' : 'Add Question'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Section Number *</Label>
                <Input type="number" min={1} value={form.section_number} onChange={e => setForm(f => ({ ...f, section_number: parseInt(e.target.value) || 1 }))} />
              </div>
              <div>
                <Label>Question Number *</Label>
                <Input type="number" min={1} value={form.question_number} onChange={e => setForm(f => ({ ...f, question_number: parseInt(e.target.value) || 1, position_index: parseInt(e.target.value) || 1 }))} />
              </div>
            </div>
            <div>
              <Label>Section Name *</Label>
              <Input value={form.section_name} onChange={e => setForm(f => ({ ...f, section_name: e.target.value }))} placeholder="e.g. Process Efficiency & Time" />
            </div>
            <div>
              <Label>Question Text *</Label>
              <Textarea value={form.question_text} onChange={e => setForm(f => ({ ...f, question_text: e.target.value }))} rows={3} placeholder="Enter the question..." />
            </div>
            <div>
              <Label>What to Observe</Label>
              <Input value={form.observation_text} onChange={e => setForm(f => ({ ...f, observation_text: e.target.value }))} placeholder="Observation guidance..." />
            </div>
            <div>
              <Label>Applicable Step Types</Label>
              <div className="flex gap-4 mt-1">
                {STEP_TYPE_OPTIONS.map(opt => (
                  <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={form.step_types.includes(opt.value)}
                      onCheckedChange={() => toggleStepType(opt.value)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>Importance Level</Label>
              <Select value={String(form.importance_level)} onValueChange={v => setForm(f => ({ ...f, importance_level: parseInt(v) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEVEL_OPTIONS.map(l => (
                    <SelectItem key={l.value} value={String(l.value)}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.importance_level === 3 && (
                <p className="text-[11px] text-amber-600 mt-1">Level 3 questions will be hidden during step creation.</p>
              )}
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={form.is_active} onCheckedChange={(v) => setForm(f => ({ ...f, is_active: !!v }))} />
                Active (visible in questionnaires)
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Save Changes' : 'Add Question'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
