import { useEffect, useState, useMemo } from 'react';
import {
  fetchActiveQuestions, fetchStepLinks, upsertStepLink,
  type QuestionnaireQuestion, type QuestionnaireStepLink,
} from '@/lib/api-questionnaire';
import { fetchSteps, type ProcessStep } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from '@/hooks/use-toast';
import { ClipboardList, Filter, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const LEVEL_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Very Important', color: 'bg-destructive/10 text-destructive border-destructive/30' },
  2: { label: 'Important', color: 'bg-amber-500/10 text-amber-700 border-amber-300' },
  3: { label: 'Not Important', color: 'bg-muted text-muted-foreground border-border' },
};

const STEP_TYPE_COLORS: Record<string, string> = {
  critical: 'bg-destructive/10 text-destructive border-destructive/30',
  decisional: 'bg-amber-500/10 text-amber-700 border-amber-300',
  mechanical: 'bg-blue-500/10 text-blue-700 border-blue-300',
};

interface Props {
  processId: string;
}

export default function ProcessQuestionnaire({ processId }: Props) {
  const [questions, setQuestions] = useState<QuestionnaireQuestion[]>([]);
  const [links, setLinks] = useState<QuestionnaireStepLink[]>([]);
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [filterStepType, setFilterStepType] = useState<string>('all');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [q, l, s] = await Promise.all([
        fetchActiveQuestions(),
        fetchStepLinks(processId),
        fetchSteps(processId),
      ]);
      // Filter out level 3 questions (not shown during step creation)
      setQuestions(q.filter(qq => qq.importance_level !== 3));
      setLinks(l);
      setSteps(s.filter(st => st.type === 'in-scope'));
    })();
  }, [processId]);

  const linkMap = useMemo(() => {
    const m: Record<string, boolean> = {};
    links.forEach(l => {
      if (l.is_relevant) m[`${l.question_id}:${l.step_id}`] = true;
    });
    return m;
  }, [links]);

  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      if (filterStepType !== 'all' && !(q.step_types || []).includes(filterStepType)) return false;
      if (filterLevel !== 'all' && q.importance_level !== parseInt(filterLevel)) return false;
      return true;
    });
  }, [questions, filterStepType, filterLevel]);

  const sectionNumbers = [...new Set(filteredQuestions.map(q => q.section_number))].sort();
  const grouped = sectionNumbers.map(sn => ({
    number: sn,
    name: filteredQuestions.find(q => q.section_number === sn)?.section_name || '',
    items: filteredQuestions.filter(q => q.section_number === sn),
  }));

  const handleToggle = async (questionId: string, stepId: string, current: boolean) => {
    const key = `${questionId}:${stepId}`;
    setSaving(key);
    try {
      await upsertStepLink({
        process_id: processId,
        question_id: questionId,
        step_id: stepId,
        is_relevant: !current,
      });
      setLinks(prev => {
        const existing = prev.find(l => l.question_id === questionId && l.step_id === stepId);
        if (existing) {
          return prev.map(l =>
            l.question_id === questionId && l.step_id === stepId
              ? { ...l, is_relevant: !current }
              : l
          );
        }
        return [...prev, {
          id: crypto.randomUUID(),
          process_id: processId,
          question_id: questionId,
          step_id: stepId,
          is_relevant: !current,
          answer: null,
          created_at: new Date().toISOString(),
        }];
      });
    } catch (err: any) {
      toast({ title: 'Error saving', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const getRelevantStepCount = (questionId: string) => {
    return steps.filter(s => linkMap[`${questionId}:${s.id}`]).length;
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 rounded-lg p-2">
            <ClipboardList className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Business Process Analysis Questionnaire</CardTitle>
            <CardDescription>
              Select which questions are relevant for each step. Level 3 (Not Important) questions are excluded.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <Select value={filterStepType} onValueChange={setFilterStepType}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Step Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Step Types</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="decisional">Decisional</SelectItem>
              <SelectItem value="mechanical">Mechanical</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterLevel} onValueChange={setFilterLevel}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="1">Level 1 — Very Important</SelectItem>
              <SelectItem value="2">Level 2 — Important</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 text-xs text-muted-foreground ml-auto">
            <span>{steps.length} steps</span>
            <span>·</span>
            <span>{filteredQuestions.length} questions</span>
          </div>
        </div>

        {steps.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No in-scope steps found. Add steps in the Edit Data tab first.</p>
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={sectionNumbers.map(String)} className="space-y-2">
            {grouped.map(section => (
              <AccordionItem key={section.number} value={String(section.number)} className="border rounded-lg">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs font-mono">Section {section.number}</Badge>
                    <span className="font-semibold text-sm">{section.name}</span>
                    <span className="text-xs text-muted-foreground">({section.items.length})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 space-y-4">
                  {section.items.map(q => {
                    const relevantCount = getRelevantStepCount(q.id);
                    return (
                      <div key={q.id} className="border rounded-lg p-4 space-y-3 bg-card">
                        {/* Question header */}
                        <div className="flex items-start gap-3">
                          <span className="text-xs font-mono text-muted-foreground mt-0.5 min-w-[28px]">Q{q.question_number}</span>
                          <div className="flex-1">
                            <p className="text-sm font-medium leading-relaxed">{q.question_text}</p>
                            {q.observation_text && (
                              <p className="text-[11px] text-muted-foreground mt-1 italic flex items-start gap-1">
                                <Info className="h-3 w-3 mt-0.5 shrink-0" />
                                What to observe: {q.observation_text}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {(q.step_types || []).map(t => (
                              <Badge key={t} variant="outline" className={`text-[9px] capitalize ${STEP_TYPE_COLORS[t] || ''}`}>{t}</Badge>
                            ))}
                            <Badge variant="outline" className={`text-[9px] ${LEVEL_LABELS[q.importance_level]?.color || ''}`}>
                              L{q.importance_level}
                            </Badge>
                            {relevantCount > 0 && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge className="text-[9px] bg-primary/20 text-primary border-primary/30" variant="outline">
                                    {relevantCount} step{relevantCount > 1 ? 's' : ''}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>Linked to {relevantCount} step(s)</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </div>

                        {/* Step relevance checkboxes */}
                        <div className="ml-8 border-t pt-3">
                          <p className="text-[11px] font-medium text-muted-foreground mb-2">
                            Is this question relevant for the following steps?
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {steps.map(step => {
                              const key = `${q.id}:${step.id}`;
                              const isChecked = !!linkMap[key];
                              const isSaving = saving === key;
                              return (
                                <label
                                  key={step.id}
                                  className={`flex items-center gap-2 text-sm px-3 py-2 rounded-md border cursor-pointer transition-colors ${
                                    isChecked
                                      ? 'bg-primary/5 border-primary/30'
                                      : 'bg-muted/30 border-border hover:bg-muted/50'
                                  } ${isSaving ? 'opacity-50' : ''}`}
                                >
                                  <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={() => handleToggle(q.id, step.id, isChecked)}
                                    disabled={isSaving}
                                  />
                                  <span className="truncate text-xs">{step.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
