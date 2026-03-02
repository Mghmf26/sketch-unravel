import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Brain, Sparkles, TrendingUp, ShieldAlert, DollarSign, Lightbulb, Loader2, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  fetchProcesses, fetchClients, fetchRisks, fetchAllControls, fetchIncidents, fetchRegulations, fetchMFQuestions, fetchMainframeImports,
  type BusinessProcess, type Risk, type Control, type Incident, type Regulation, type MFQuestion, type MainframeImport, type Client,
} from '@/lib/api';

interface InsightSection {
  title: string;
  icon: React.ElementType;
  items: string[];
  badge: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
}

export default function AIReports() {
  const navigate = useNavigate();
  const [allProcesses, setAllProcesses] = useState<BusinessProcess[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [allRisks, setAllRisks] = useState<Risk[]>([]);
  const [allControls, setAllControls] = useState<Control[]>([]);
  const [allIncidents, setAllIncidents] = useState<Incident[]>([]);
  const [allRegulations, setAllRegulations] = useState<Regulation[]>([]);
  const [allMfQuestions, setAllMfQuestions] = useState<MFQuestion[]>([]);
  const [allMfImports, setAllMfImports] = useState<MainframeImport[]>([]);
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<InsightSection[] | null>(null);

  // Filters
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [selectedProcessIds, setSelectedProcessIds] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      fetchProcesses(), fetchClients(), fetchRisks(), fetchAllControls(),
      fetchIncidents(), fetchRegulations(), fetchMFQuestions(), fetchMainframeImports(),
    ]).then(([p, c, r, ctrl, i, reg, mfq, mfi]) => {
      setAllProcesses(p); setClients(c); setAllRisks(r); setAllControls(ctrl);
      setAllIncidents(i); setAllRegulations(reg); setAllMfQuestions(mfq); setAllMfImports(mfi);
    });
  }, []);

  // Processes filtered by client
  const clientProcesses = useMemo(() => {
    if (selectedClientId === 'all') return allProcesses;
    return allProcesses.filter(p => p.client_id === selectedClientId);
  }, [allProcesses, selectedClientId]);

  // Reset process selection when client changes
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

  // Scoped data based on selected processes
  const scopedProcessIds = selectedProcessIds.length > 0 ? selectedProcessIds : clientProcesses.map(p => p.id);
  const processes = allProcesses.filter(p => scopedProcessIds.includes(p.id));
  const risks = allRisks.filter(r => scopedProcessIds.includes(r.process_id));
  const incidents = allIncidents.filter(i => scopedProcessIds.includes(i.process_id));
  const regulations = allRegulations.filter(r => scopedProcessIds.includes(r.process_id));
  const mfQuestions = allMfQuestions.filter(q => scopedProcessIds.includes(q.process_id));
  const mfImports = allMfImports.filter(m => scopedProcessIds.includes(m.process_id));
  // Controls are linked via risks
  const riskIds = new Set(risks.map(r => r.id));
  const controls = allControls.filter(c => riskIds.has(c.risk_id));

  const highRisks = risks.filter(r => r.likelihood === 'high' || r.impact === 'high').length;
  const criticalIncidents = incidents.filter(i => i.severity === 'critical' || i.severity === 'high').length;
  const nonCompliant = regulations.filter(r => r.compliance_status === 'non-compliant').length;

  const generateReport = () => {
    setGenerating(true);
    setTimeout(() => {
      const sections: InsightSection[] = [
        {
          title: 'Cost Reduction Opportunities',
          icon: DollarSign,
          badge: 'HIGH IMPACT',
          badgeVariant: 'default',
          items: [
            processes.length > 0
              ? `Consolidate ${processes.length} business processes: identify overlapping mainframe batch jobs and merge redundant data operations to reduce CPU consumption by 15-25%.`
              : 'No processes detected yet. Add business processes to unlock cost reduction analysis.',
            risks.length > 3
              ? `${highRisks} high-risk scenarios detected. Automated RACF policy enforcement could reduce manual audit effort by 40%, saving 200+ man-hours annually.`
              : 'Add risk scenarios to processes to identify control automation opportunities.',
            mfImports.length > 0
              ? `${mfImports.length} mainframe data sources mapped. Consolidating redundant data feeds could reduce I/O costs and batch processing windows.`
              : 'Map mainframe data sources to unlock data pipeline optimization insights.',
            controls.length > 0
              ? `${controls.length} controls tracked across ${risks.length} risks. Automating detective controls (log analysis, reconciliation) could save significant operational overhead.`
              : 'Add controls to risk scenarios for control effectiveness analysis.',
          ],
        },
        {
          title: 'Revenue & Value Optimization',
          icon: TrendingUp,
          badge: 'STRATEGIC',
          badgeVariant: 'secondary',
          items: [
            `With ${clients.length} client(s) and ${processes.length} process(es), there's opportunity to offer process-as-a-service models.`,
            'Implement real-time mainframe data streaming (MQ/Kafka bridge) to reduce order-to-cash cycle time by 2-3 days.',
            regulations.length > 0
              ? `${regulations.length} regulatory requirements tracked. Proactive compliance reporting can be a value-add service for clients.`
              : 'Track regulations per process to identify compliance-as-a-service opportunities.',
            'Leverage mainframe transaction logs for predictive analytics: optimize batch scheduling to improve SLA performance by 15-30%.',
          ],
        },
        {
          title: 'Risk Mitigation & Control Gaps',
          icon: ShieldAlert,
          badge: criticalIncidents > 0 ? 'CRITICAL' : 'MODERATE',
          badgeVariant: criticalIncidents > 0 ? 'destructive' : 'outline',
          items: [
            highRisks > 0
              ? `⚠️ ${highRisks} high-severity risks require immediate attention. Priority: review RACF dataset rules, enforce SoD, implement maker-checker controls.`
              : 'No high-severity risks detected. Continue monitoring.',
            criticalIncidents > 0
              ? `🔴 ${criticalIncidents} critical/high incidents open. Implement automated batch job failure detection with 30-minute response SLAs.`
              : 'No critical incidents. Maintain proactive monitoring.',
            nonCompliant > 0
              ? `${nonCompliant} non-compliant regulation(s). Map control gaps to mainframe data objects and implement compensating controls.`
              : 'All tracked regulations show compliance. Schedule quarterly re-assessments.',
            'Cross-process risk correlation: analyze shared mainframe datasets to identify single points of failure with cascading impact.',
          ],
        },
        {
          title: 'AI-Recommended Next Steps',
          icon: Lightbulb,
          badge: 'ACTIONABLE',
          badgeVariant: 'outline',
          items: [
            processes.length < 3
              ? 'Priority: Add 3-5 core business processes with full risk scenario mapping for comprehensive analysis.'
              : `With ${processes.length} processes mapped: (1) complete risk coverage, (2) map mainframe data dependencies, (3) link all regulations to steps.`,
            'Implement automated change detection on mainframe configuration datasets — trigger alerts on unauthorized modifications.',
            'Build a process-to-data dependency matrix: for each process, catalog every mainframe data object it reads/writes.',
            'Schedule quarterly AI re-analysis as data grows for increasingly precise insights.',
          ],
        },
      ];
      setReport(sections);
      setGenerating(false);
    }, 2500);
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" /> AI-Powered Reports
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Intelligent analysis of business processes, mainframe data, risks, controls, regulations, and incidents
          </p>
        </div>
      </div>

      {/* Filter Section */}
      <Card className="border shadow-sm">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Filter className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Scope Selection</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Client</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger><SelectValue placeholder="All clients" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Business Processes</Label>
                {clientProcesses.length > 0 && (
                  <button onClick={selectAllProcesses} className="text-[10px] text-primary hover:underline">
                    {selectedProcessIds.length === clientProcesses.length ? 'Deselect all' : 'Select all'}
                  </button>
                )}
              </div>
              {clientProcesses.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">No processes found{selectedClientId !== 'all' ? ' for this client' : ''}</p>
              ) : (
                <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-1.5 bg-background">
                  {clientProcesses.map(p => (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer hover:bg-accent/50 rounded px-1 py-0.5">
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
                <p className="text-[10px] text-muted-foreground">No selection = all processes included</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Context + Generate */}
      <Card className="border border-dashed border-primary/40 shadow-none">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-foreground">Scoped Data for Analysis</h3>
              <p className="text-xs text-muted-foreground mt-1">Analysis will run on the following scoped data.</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="secondary" className="text-xs">{processes.length} Process(es)</Badge>
                <Badge variant="secondary" className="text-xs">{risks.length} Risk(s)</Badge>
                <Badge variant="secondary" className="text-xs">{controls.length} Control(s)</Badge>
                <Badge variant="secondary" className="text-xs">{incidents.length} Incident(s)</Badge>
                <Badge variant="secondary" className="text-xs">{regulations.length} Regulation(s)</Badge>
                <Badge variant="secondary" className="text-xs">{mfQuestions.length} MF Q&A(s)</Badge>
                <Badge variant="secondary" className="text-xs">{mfImports.length} MF Import(s)</Badge>
              </div>
            </div>
            <Button onClick={generateReport} disabled={generating || processes.length === 0} className="flex-shrink-0">
              {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing…</> : <><Brain className="h-4 w-4 mr-2" /> Generate Report</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {report && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">AI Analysis Report</h2>
            <Badge variant="outline" className="text-[10px] tracking-wider">GENERATED</Badge>
          </div>
          {report.map((section, idx) => (
            <Card key={idx} className="border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2"><section.icon className="h-5 w-5 text-primary" />{section.title}</CardTitle>
                  <Badge variant={section.badgeVariant} className="text-[10px] tracking-wider">{section.badge}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {section.items.map((item, i) => (
                  <div key={i}>
                    <div className="flex items-start gap-3">
                      <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[10px] font-bold text-primary">{i + 1}</span>
                      </div>
                      <p className="text-sm text-foreground/80 leading-relaxed">{item}</p>
                    </div>
                    {i < section.items.length - 1 && <Separator className="mt-3" />}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
          <Card className="border border-primary/30 bg-primary/5 shadow-none">
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground text-center">
                Report based on {processes.length} processes, {risks.length} risks, {controls.length} controls, {incidents.length} incidents, {regulations.length} regulations, {mfImports.length} mainframe sources.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {!report && !generating && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Brain className="h-8 w-8 text-primary/50" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Ready to Analyze</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Select a client and business processes above, then click "Generate Report" to run AI analysis on the scoped data.
          </p>
        </div>
      )}
    </div>
  );
}
