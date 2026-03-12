import { useEffect, useState, useMemo } from 'react';
import {
  fetchQuestions, updateQuestion,
  type QuestionnaireQuestion,
} from '@/lib/api-questionnaire';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Search, Filter, ClipboardList, AlertTriangle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const STEP_TYPES = [
  { value: 'Critical', label: 'Critical', color: 'border-red-300 text-red-700 bg-red-50' },
  { value: 'Decisional', label: 'Decisional', color: 'border-amber-300 text-amber-700 bg-amber-50' },
  { value: 'Mechanical', label: 'Mechanical', color: 'border-blue-300 text-blue-700 bg-blue-50' },
];

const IMPORTANCE_LEVELS = [
  { value: 1, label: 'L1 — Very Important', short: 'L1', color: 'border-red-300 text-red-600' },
  { value: 2, label: 'L2 — Important', short: 'L2', color: 'border-yellow-300 text-yellow-700' },
  { value: 3, label: 'L3 — Not Relevant', short: 'L3', color: 'border-muted text-muted-foreground' },
];

export default function ProcessQuestionnaireConfig() {
  const [questions, setQuestions] = useState<QuestionnaireQuestion[]>([]);
  const [search, setSearch] = useState('');
  const [filterSection, setFilterSection] = useState('all');
  const [filterStepType, setFilterStepType] = useState('all');

  const load = async () => {
    const q = await fetchQuestions();
    setQuestions(q);
  };

  useEffect(() => { load(); }, []);

  const sections = [...new Set(questions.map(q => q.section_name))];
  const sectionNumbers = [...new Set(questions.map(q => q.section_number))].sort();

  const filtered = useMemo(() => questions.filter(q => {
    if (!q.is_active) return false;
    const matchSearch = !search || q.question_text.toLowerCase().includes(search.toLowerCase());
    const matchSection = filterSection === 'all' || q.section_name === filterSection;
    const matchStepType = filterStepType === 'all' || q.step_types.includes(filterStepType);
    return matchSearch && matchSection && matchStepType;
  }), [questions, search, filterSection, filterStepType]);

  const grouped = useMemo(() => sectionNumbers
    .map(sn => ({
      number: sn,
      name: questions.find(q => q.section_number === sn)?.section_name || '',
      items: filtered.filter(q => q.section_number === sn),
    }))
    .filter(g => g.items.length > 0),
  [sectionNumbers, filtered, questions]);

  const handleStepTypeToggle = async (question: QuestionnaireQuestion, stepType: string) => {
    const current = question.step_types || [];
    const updated = current.includes(stepType)
      ? current.filter(t => t !== stepType)
      : [...current, stepType];
    try {
      await updateQuestion(question.id, { step_types: updated });
      setQuestions(prev => prev.map(q => q.id === question.id ? { ...q, step_types: updated } : q));
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleImportanceChange = async (question: QuestionnaireQuestion, level: number) => {
    try {
      await updateQuestion(question.id, { importance_level: level });
      setQuestions(prev => prev.map(q => q.id === question.id ? { ...q, importance_level: level } : q));
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const l3Count = questions.filter(q => q.importance_level === 3 && q.is_active).length;

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-indigo-500" />
              Business Process Questionnaire
            </CardTitle>
            <CardDescription className="mt-1">
              Configure which questions are relevant per step type and set importance levels.
              Questions set to <strong>L3 (Not Relevant)</strong> will not appear in the Edit Data tab.
            </CardDescription>
          </div>
          {l3Count > 0 && (
            <Badge variant="outline" className="text-[10px] border-muted text-muted-foreground gap-1">
              <AlertTriangle className="h-3 w-3" />
              {l3Count} hidden (L3)
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search questions..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterSection} onValueChange={setFilterSection}>
            <SelectTrigger className="w-56">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Sections" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sections</SelectItem>
              {sections.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStepType} onValueChange={setFilterStepType}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Step Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Step Types</SelectItem>
              {STEP_TYPES.map(st => <SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>)}
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
                      {STEP_TYPES.map(st => (
                        <TableHead key={st.value} className="text-[10px] font-semibold uppercase w-24 text-center">{st.label}</TableHead>
                      ))}
                      <TableHead className="text-[10px] font-semibold uppercase w-36 text-center">Importance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {section.items.map(q => {
                      const impLevel = IMPORTANCE_LEVELS.find(l => l.value === q.importance_level);
                      return (
                        <TableRow key={q.id} className={q.importance_level === 3 ? 'opacity-40' : ''}>
                          <TableCell className="text-xs font-mono text-muted-foreground">{q.question_number}</TableCell>
                          <TableCell>
                            <p className="text-sm">{q.question_text}</p>
                            {q.observation_text && (
                              <p className="text-[11px] text-muted-foreground mt-0.5 italic">↳ {q.observation_text}</p>
                            )}
                          </TableCell>
                          {STEP_TYPES.map(st => (
                            <TableCell key={st.value} className="text-center">
                              <Checkbox
                                checked={q.step_types.includes(st.value)}
                                onCheckedChange={() => handleStepTypeToggle(q, st.value)}
                                className="mx-auto"
                              />
                            </TableCell>
                          ))}
                          <TableCell className="text-center">
                            <Select
                              value={String(q.importance_level)}
                              onValueChange={v => handleImportanceChange(q, parseInt(v))}
                            >
                              <SelectTrigger className={`h-7 text-[10px] w-auto min-w-[120px] ${impLevel?.color || ''}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {IMPORTANCE_LEVELS.map(l => (
                                  <SelectItem key={l.value} value={String(l.value)}>
                                    {l.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
    </Card>
  );
}
