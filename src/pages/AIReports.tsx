import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain, Sparkles, TrendingUp, ShieldAlert, DollarSign, Lightbulb,
  Loader2, Filter, Download, ChevronRight, BarChart3, AlertTriangle,
  ShieldCheck, Scale, Database, Monitor, Cpu, FileText, Clock,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  fetchProcesses, fetchClients, fetchSteps, fetchRisks, fetchAllControls, fetchIncidents, fetchRegulations, fetchMFQuestions, fetchMainframeImports,
  type BusinessProcess, type ProcessStep, type Risk, type Control, type Incident, type Regulation, type MFQuestion, type MainframeImport, type Client,
} from '@/lib/api';
import { fetchStepApplications, type StepApplication } from '@/lib/api-applications';
import { fetchMainframeFlows, fetchMFFlowNodes, type MainframeFlow, type MFFlowNode } from '@/lib/api-mainframe-flows';
import { exportReportToPDF } from '@/lib/pdf-export';

interface InsightSection {
  title: string;
  icon: React.ElementType;
  items: string[];
  badge: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
}

const SECTION_COLORS: Record<string, { gradient: string; iconBg: string; border: string; accent: string }> = {
  'Cost Reduction Opportunities': {
    gradient: 'from-emerald-500/10 to-emerald-500/5',
    iconBg: 'bg-emerald-500/15 text-emerald-600',
    border: 'border-l-emerald-500',
    accent: 'text-emerald-600',
  },
  'Revenue & Value Optimization': {
    gradient: 'from-blue-500/10 to-blue-500/5',
    iconBg: 'bg-blue-500/15 text-blue-600',
    border: 'border-l-blue-500',
    accent: 'text-blue-600',
  },
  'Risk Mitigation & Control Gaps': {
    gradient: 'from-amber-500/10 to-amber-500/5',
    iconBg: 'bg-amber-500/15 text-amber-600',
    border: 'border-l-amber-500',
    accent: 'text-amber-600',
  },
  'AI-Recommended Next Steps': {
    gradient: 'from-violet-500/10 to-violet-500/5',
    iconBg: 'bg-violet-500/15 text-violet-600',
    border: 'border-l-violet-500',
    accent: 'text-violet-600',
  },
};

function ScopeStatCard({ icon: Icon, label, count, color }: { icon: React.ElementType; label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-card border transition-all hover:shadow-sm">
      <div className={`h-7 w-7 rounded-md flex items-center justify-center ${color}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div>
        <p className="text-sm font-bold text-foreground leading-none">{count}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export default function AIReports() {
  const navigate = useNavigate();
  const [allProcesses, setAllProcesses] = useState<BusinessProcess[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [allSteps, setAllSteps] = useState<ProcessStep[]>([]);
  const [allRisks, setAllRisks] = useState<Risk[]>([]);
  const [allControls, setAllControls] = useState<Control[]>([]);
  const [allIncidents, setAllIncidents] = useState<Incident[]>([]);
  const [allRegulations, setAllRegulations] = useState<Regulation[]>([]);
  const [allMfQuestions, setAllMfQuestions] = useState<MFQuestion[]>([]);
  const [allMfImports, setAllMfImports] = useState<MainframeImport[]>([]);
  const [allApplications, setAllApplications] = useState<StepApplication[]>([]);
  const [allMfFlows, setAllMfFlows] = useState<MainframeFlow[]>([]);
  const [allMfFlowNodes, setAllMfFlowNodes] = useState<MFFlowNode[]>([]);
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<InsightSection[] | null>(null);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);

  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [selectedProcessIds, setSelectedProcessIds] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      fetchProcesses(), fetchClients(), fetchSteps(), fetchRisks(), fetchAllControls(),
      fetchIncidents(), fetchRegulations(), fetchMFQuestions(), fetchMainframeImports(),
      fetchStepApplications(), fetchMainframeFlows(),
    ]).then(async ([p, c, s, r, ctrl, i, reg, mfq, mfi, apps, flows]) => {
      setAllProcesses(p); setClients(c); setAllSteps(s); setAllRisks(r); setAllControls(ctrl);
      setAllIncidents(i); setAllRegulations(reg); setAllMfQuestions(mfq); setAllMfImports(mfi);
      setAllApplications(apps); setAllMfFlows(flows);
      const allNodes = await Promise.all(flows.map(f => fetchMFFlowNodes(f.id)));
      setAllMfFlowNodes(allNodes.flat());
    });
  }, []);

  const clientProcesses = useMemo(() => {
    if (selectedClientId === 'all') return allProcesses;
    return allProcesses.filter(p => p.client_id === selectedClientId);
  }, [allProcesses, selectedClientId]);

  useEffect(() => {
    setSelectedProcessIds([]);
    setReport(null);
  }, [selectedClientId]);

  const toggleProcess = (id: string) => {
    setSelectedProcessIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAllProcesses = () => {
    if (selectedProcessIds.length === clientProcesses.length) {
      setSelectedProcessIds([]);
    } else {
      setSelectedProcessIds(clientProcesses.map(p => p.id));
    }
  };

  const scopedProcessIds = selectedProcessIds.length > 0 ? selectedProcessIds : clientProcesses.map(p => p.id);
  const processes = allProcesses.filter(p => scopedProcessIds.includes(p.id));
  const steps = allSteps.filter(s => scopedProcessIds.includes(s.process_id));
  const risks = allRisks.filter(r => scopedProcessIds.includes(r.process_id));
  const incidents = allIncidents.filter(i => scopedProcessIds.includes(i.process_id));
  const regulations = allRegulations.filter(r => scopedProcessIds.includes(r.process_id));
  const mfQuestions = allMfQuestions.filter(q => scopedProcessIds.includes(q.process_id));
  const mfImports = allMfImports.filter(m => scopedProcessIds.includes(m.process_id));
  const applications = allApplications.filter(a => scopedProcessIds.includes(a.process_id));
  const mfFlows = allMfFlows.filter(f => scopedProcessIds.includes(f.process_id));
  const mfFlowNodeIds = new Set(mfFlows.map(f => f.id));
  const mfFlowNodes = allMfFlowNodes.filter(n => mfFlowNodeIds.has(n.flow_id));
  const riskIds = new Set(risks.map(r => r.id));
  const controls = allControls.filter(c => riskIds.has(c.risk_id));

  const highRisks = risks.filter(r => r.likelihood === 'high' || r.impact === 'high').length;
  const criticalIncidents = incidents.filter(i => i.severity === 'critical' || i.severity === 'high').length;
  const nonCompliant = regulations.filter(r => r.compliance_status === 'non-compliant').length;
  const effectiveControls = controls.filter(c => c.effectiveness === 'effective').length;
  const controlCoverage = risks.length > 0 ? Math.round((controls.length / risks.length) * 100) : 0;

  const generateReport = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-ai-report', {
        body: { processes, steps, risks, controls, incidents, regulations, mfImports, mfQuestions, applications, mfFlows, mfFlowNodes },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const iconMap: Record<string, React.ElementType> = {
        'Cost Reduction Opportunities': DollarSign,
        'Revenue & Value Optimization': TrendingUp,
        'Risk Mitigation & Control Gaps': ShieldAlert,
        'AI-Recommended Next Steps': Lightbulb,
      };

      const sections: InsightSection[] = (data.sections || []).map((s: any) => ({
        ...s,
        icon: iconMap[s.title] || Brain,
      }));

      setReport(sections);
      setGeneratedAt(new Date());
    } catch (err: any) {
      console.error('AI report error:', err);
      toast({ title: 'Report generation failed', description: err.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const clientName = selectedClientId !== 'all'
    ? clients.find(c => c.id === selectedClientId)?.name
    : undefined;

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <PageHeader
        title="AI-Powered Reports"
        description="Intelligent analysis across business processes, technology ecosystem, risks, controls, and compliance"
        breadcrumbs={[
          { label: 'Portfolio', to: '/' },
          { label: 'Reporting' },
          { label: 'AI Reports' },
        ]}
      />

      {/* ── Two-Column Layout: Scope + Data Overview ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Scope Selection */}
        <Card className="lg:col-span-1 border shadow-sm">
          <CardHeader className="pb-3 pt-4 px-5">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
                <Filter className="h-3.5 w-3.5 text-primary" />
              </div>
              <CardTitle className="text-sm">Analysis Scope</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Client</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="All clients" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Processes</Label>
                {clientProcesses.length > 0 && (
                  <button onClick={selectAllProcesses} className="text-[10px] text-primary hover:underline font-medium">
                    {selectedProcessIds.length === clientProcesses.length ? 'Clear' : 'Select all'}
                  </button>
                )}
              </div>
              {clientProcesses.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-3">No processes found</p>
              ) : (
                <div className="max-h-48 overflow-y-auto border rounded-lg p-1.5 space-y-0.5 bg-muted/30">
                  {clientProcesses.map(p => (
                    <label key={p.id} className="flex items-center gap-2.5 cursor-pointer hover:bg-accent/60 rounded-md px-2 py-1.5 transition-colors">
                      <Checkbox
                        checked={selectedProcessIds.includes(p.id)}
                        onCheckedChange={() => toggleProcess(p.id)}
                      />
                      <span className="text-xs text-foreground truncate">{p.process_name}</span>
                    </label>
                  ))}
                </div>
              )}
              {selectedProcessIds.length === 0 && clientProcesses.length > 0 && (
                <p className="text-[10px] text-muted-foreground italic">All processes included by default</p>
              )}
            </div>

            <Separator />

            <Button
              onClick={generateReport}
              disabled={generating || processes.length === 0}
              className="w-full gap-2"
              size="lg"
            >
              {generating ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
              ) : (
                <><Brain className="h-4 w-4" /> Generate AI Report</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Right: Data Overview Grid */}
        <Card className="lg:col-span-2 border shadow-sm">
          <CardHeader className="pb-3 pt-4 px-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="h-3.5 w-3.5 text-primary" />
                </div>
                <CardTitle className="text-sm">Scoped Data Overview</CardTitle>
              </div>
              {clientName && (
                <Badge variant="outline" className="text-[10px] font-semibold">{clientName}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
              <ScopeStatCard icon={FileText} label="Processes" count={processes.length} color="bg-primary/10 text-primary" />
              <ScopeStatCard icon={ChevronRight} label="Steps" count={steps.length} color="bg-emerald-500/10 text-emerald-600" />
              <ScopeStatCard icon={AlertTriangle} label="Risks" count={risks.length} color="bg-amber-500/10 text-amber-600" />
              <ScopeStatCard icon={ShieldCheck} label="Controls" count={controls.length} color="bg-blue-500/10 text-blue-600" />
              <ScopeStatCard icon={Scale} label="Regulations" count={regulations.length} color="bg-violet-500/10 text-violet-600" />
              <ScopeStatCard icon={AlertTriangle} label="Incidents" count={incidents.length} color="bg-red-500/10 text-red-600" />
              <ScopeStatCard icon={Monitor} label="Scr. / App." count={applications.length} color="bg-sky-500/10 text-sky-600" />
              <ScopeStatCard icon={Cpu} label="MF Flows" count={mfFlows.length} color="bg-indigo-500/10 text-indigo-600" />
              <ScopeStatCard icon={Database} label="MF Sources" count={mfImports.length} color="bg-orange-500/10 text-orange-600" />
              <ScopeStatCard icon={Brain} label="MF Q&A" count={mfQuestions.length} color="bg-pink-500/10 text-pink-600" />
            </div>

            {/* Risk health mini-indicators */}
            {risks.length > 0 && (
              <div className="mt-4 pt-4 border-t space-y-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Risk Health Indicators</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Control Coverage</span>
                      <span className="font-semibold">{Math.min(controlCoverage, 100)}%</span>
                    </div>
                    <Progress value={Math.min(controlCoverage, 100)} className="h-1.5" />
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                    <span className="text-xs"><span className="font-bold text-amber-700">{highRisks}</span> <span className="text-amber-600">High Risks</span></span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
                    <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
                    <span className="text-xs"><span className="font-bold text-red-700">{criticalIncidents}</span> <span className="text-red-600">Critical</span></span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Generating State ── */}
      {generating && (
        <Card className="border-2 border-primary/20 shadow-lg overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 p-8 flex flex-col items-center gap-4">
              <div className="relative">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse">
                  <Brain className="h-8 w-8 text-primary" />
                </div>
                <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                  <Loader2 className="h-3 w-3 text-primary-foreground animate-spin" />
                </div>
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-base font-semibold text-foreground">Analyzing Your Data</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  AI is processing {processes.length} processes, {risks.length} risks, {controls.length} controls,
                  and {mfImports.length} mainframe sources…
                </p>
              </div>
              <div className="w-64">
                <Progress value={66} className="h-1" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Report Results ── */}
      {report && !generating && (
        <div className="space-y-5 animate-slide-up">
          {/* Report Header Bar */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <Sparkles className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground tracking-tight">AI Analysis Report</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-[9px] tracking-wider font-semibold">AI GENERATED</Badge>
                  {generatedAt && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {generatedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-xs"
                onClick={generateReport}
              >
                <Brain className="h-3.5 w-3.5" /> Regenerate
              </Button>
              <Button
                size="sm"
                className="gap-2 text-xs"
                onClick={() => {
                  exportReportToPDF({
                    title: 'AI-Powered Analysis Report',
                    subtitle: 'Intelligent analysis of business processes, mainframe data, risks, controls, regulations, and incidents',
                    generatedAt: generatedAt || new Date(),
                    clientName,
                    scopeSummary: `${processes.length} Processes · ${steps.length} Steps · ${risks.length} Risks · ${controls.length} Controls · ${incidents.length} Incidents · ${regulations.length} Regulations · ${applications.length} Scr./App. · ${mfImports.length} MF Sources`,
                    sections: report.map(s => ({ title: s.title, badge: s.badge, items: s.items })),
                  });
                  toast({ title: 'PDF exported', description: 'Report downloaded successfully.' });
                }}
              >
                <Download className="h-3.5 w-3.5" /> Export PDF
              </Button>
            </div>
          </div>

          {/* Section Cards */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {report.map((section, idx) => {
              const colors = SECTION_COLORS[section.title] || SECTION_COLORS['AI-Recommended Next Steps'];
              return (
                <Card key={idx} className={`border shadow-sm overflow-hidden border-l-4 ${colors.border}`}>
                  <CardHeader className={`pb-2 pt-4 px-5 bg-gradient-to-r ${colors.gradient}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${colors.iconBg}`}>
                          <section.icon className="h-4 w-4" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-bold">{section.title}</CardTitle>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{section.items.length} insights</p>
                        </div>
                      </div>
                      <Badge variant={section.badgeVariant} className="text-[9px] tracking-wider font-bold">
                        {section.badge}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="px-5 pt-3 pb-4 space-y-0">
                    {section.items.map((item, i) => (
                      <div key={i}>
                        <div className="flex items-start gap-3 py-2.5">
                          <div className={`h-5 w-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${colors.iconBg}`}>
                            <span className="text-[9px] font-bold">{i + 1}</span>
                          </div>
                          <p className="text-[13px] text-foreground/85 leading-relaxed">{item}</p>
                        </div>
                        {i < section.items.length - 1 && <Separator className="opacity-50" />}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Report Footer */}
          <Card className="border bg-muted/30 shadow-none">
            <CardContent className="py-3 px-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground/70">Data Coverage:</span>
                  <span>{processes.length} processes</span>
                  <span className="text-muted-foreground/40">·</span>
                  <span>{risks.length} risks</span>
                  <span className="text-muted-foreground/40">·</span>
                  <span>{controls.length} controls</span>
                  <span className="text-muted-foreground/40">·</span>
                  <span>{incidents.length} incidents</span>
                  <span className="text-muted-foreground/40">·</span>
                  <span>{regulations.length} regulations</span>
                  <span className="text-muted-foreground/40">·</span>
                  <span>{mfImports.length} MF sources</span>
                </div>
                <Badge variant="outline" className="text-[9px] text-muted-foreground">Powered by MF AI</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Empty State ── */}
      {!report && !generating && (
        <Card className="border-2 border-dashed border-muted-foreground/20 shadow-none bg-muted/10">
          <CardContent className="p-0">
            <div className="flex flex-col items-center justify-center py-20 gap-5">
              <div className="relative">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
                  <Brain className="h-10 w-10 text-primary/40" />
                </div>
                <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-lg bg-muted flex items-center justify-center border">
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-bold text-foreground">Ready to Analyze</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm leading-relaxed">
                  Select your analysis scope on the left, then generate an AI-powered report covering costs, risks, compliance, and actionable recommendations.
                </p>
              </div>
              <div className="flex items-center gap-6 text-xs text-muted-foreground mt-2">
                {[
                  { icon: DollarSign, label: 'Cost Analysis' },
                  { icon: ShieldAlert, label: 'Risk Gaps' },
                  { icon: TrendingUp, label: 'Optimization' },
                  { icon: Lightbulb, label: 'Next Steps' },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-primary/50" />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
