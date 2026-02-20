import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, Cpu, Layers, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  fetchProcesses, fetchMFQuestions,
  type BusinessProcess, type MFQuestion,
} from '@/lib/api';

export default function ProcessingAnalysis() {
  const navigate = useNavigate();
  const [processes, setProcesses] = useState<BusinessProcess[]>([]);
  const [mfQuestions, setMfQuestions] = useState<MFQuestion[]>([]);

  useEffect(() => {
    Promise.all([fetchProcesses(), fetchMFQuestions()]).then(([p, q]) => {
      setProcesses(p); setMfQuestions(q);
    });
  }, []);

  const processMap: Record<string, string> = {};
  processes.forEach(p => processMap[p.id] = p.process_name);

  const avgConfidence = mfQuestions.length > 0 ? Math.round(mfQuestions.reduce((s, q) => s + Number(q.confidence), 0) / mfQuestions.length) : 0;
  const categories = [...new Set(mfQuestions.map(q => q.category).filter(Boolean))];

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Mainframe Processing Analysis</h1>
          <p className="text-sm text-muted-foreground mt-1">AI-driven analysis of mainframe data relationships, risk patterns, and control effectiveness</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'AI QUESTIONS', value: mfQuestions.length, icon: Cpu },
          { label: 'AVG CONFIDENCE', value: `${avgConfidence}%`, icon: BarChart3 },
          { label: 'CATEGORIES', value: categories.length, icon: Layers },
          { label: 'PROCESSES ANALYZED', value: processes.filter(p => mfQuestions.some(q => q.process_id === p.id)).length, icon: FileText },
        ].map(s => (
          <Card key={s.label} className="border border-dashed border-primary/40 bg-card">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-2xl font-bold text-primary">{s.value}</p>
                <p className="text-[10px] text-muted-foreground font-semibold tracking-widest uppercase">{s.label}</p>
              </div>
              <s.icon className="h-5 w-5 text-primary/60" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-sm overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">Mainframe AI Question Analysis</CardTitle>
          <CardDescription>Questions assessing data integrity, access controls, and processing completeness per process</CardDescription>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="font-semibold text-xs uppercase">Process</TableHead>
              <TableHead className="font-semibold text-xs uppercase">Category</TableHead>
              <TableHead className="font-semibold text-xs uppercase">Question</TableHead>
              <TableHead className="font-semibold text-xs uppercase">Answer / Findings</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-center">Confidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mfQuestions.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No MF AI questions added yet. Add them via Business Processes.</TableCell></TableRow>
            ) : (
              mfQuestions.map(q => (
                <TableRow key={q.id}>
                  <TableCell className="font-medium text-sm">{processMap[q.process_id] || '—'}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{q.category || '—'}</Badge></TableCell>
                  <TableCell className="text-sm max-w-xs">{q.question}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs">{q.answer}</TableCell>
                  <TableCell className="text-center">
                    <Badge className={`text-[10px] border-0 ${Number(q.confidence) >= 80 ? 'bg-primary/15 text-primary' : Number(q.confidence) >= 50 ? 'bg-yellow-500/15 text-yellow-600' : 'bg-destructive/15 text-destructive'}`}>{q.confidence}%</Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Card className="border bg-muted/20">
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-2">Risk Scenario Template</h3>
          <p className="text-xs text-muted-foreground leading-relaxed italic">
            "During <strong>[business process]</strong>, if <strong>[mainframe data object]</strong> is <strong>[accessed/changed/unavailable/corrupted]</strong> because <strong>[control weakness/threat]</strong>, then <strong>[process outcome fails]</strong>, resulting in <strong>[impact]</strong>."
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="p-3 border rounded-lg bg-card">
              <p className="text-xs font-semibold text-foreground mb-1">Master/Config Data Changes</p>
              <p className="text-[11px] text-muted-foreground">High integrity risk — big downstream impact on billing, payments, and reporting</p>
            </div>
            <div className="p-3 border rounded-lg bg-card">
              <p className="text-xs font-semibold text-foreground mb-1">Transactional Data Exposure</p>
              <p className="text-[11px] text-muted-foreground">Confidentiality + fraud risk — customer PII, financial transactions</p>
            </div>
            <div className="p-3 border rounded-lg bg-card">
              <p className="text-xs font-semibold text-foreground mb-1">Interface Failures</p>
              <p className="text-[11px] text-muted-foreground">Completeness/accuracy risks — MQ messages, batch file exchanges</p>
            </div>
            <div className="p-3 border rounded-lg bg-card">
              <p className="text-xs font-semibold text-foreground mb-1">Batch Job Failures</p>
              <p className="text-[11px] text-muted-foreground">Process interruption — SLA breaches, downstream system starvation</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
