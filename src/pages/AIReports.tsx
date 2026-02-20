import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Brain, Sparkles, TrendingUp, ShieldAlert, DollarSign, Lightbulb, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { loadDiagrams } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';
import type { EPCDiagram } from '@/types/epc';

interface InsightSection {
  title: string;
  icon: React.ElementType;
  items: string[];
  badge: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
}

export default function AIReports() {
  const navigate = useNavigate();
  const [diagrams, setDiagrams] = useState<EPCDiagram[]>([]);
  const [clientCount, setClientCount] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<InsightSection[] | null>(null);

  useEffect(() => {
    setDiagrams(loadDiagrams());
    supabase.from('clients').select('id', { count: 'exact', head: true }).then(({ count }) => {
      setClientCount(count || 0);
    });
  }, []);

  const totalRisks = diagrams.reduce((s, d) => s + (d.riskScenarios?.length || 0), 0);
  const totalIncidents = diagrams.reduce((s, d) => s + (d.incidents?.length || 0), 0);
  const totalRegs = diagrams.reduce((s, d) => s + (d.regulations?.length || 0), 0);
  const totalMFQ = diagrams.reduce((s, d) => s + (d.mfQuestions?.length || 0), 0);
  const highRisks = diagrams.reduce((s, d) => s + (d.riskScenarios?.filter(r => r.likelihood === 'high' || r.impact === 'high').length || 0), 0);
  const criticalIncidents = diagrams.reduce((s, d) => s + (d.incidents?.filter(i => i.severity === 'critical' || i.severity === 'high').length || 0), 0);
  const nonCompliant = diagrams.reduce((s, d) => s + (d.regulations?.filter(r => r.complianceStatus === 'non-compliant').length || 0), 0);

  const generateReport = () => {
    setGenerating(true);
    // Simulate AI analysis with context-aware insights
    setTimeout(() => {
      const sections: InsightSection[] = [
        {
          title: 'Cost Reduction Opportunities',
          icon: DollarSign,
          badge: 'HIGH IMPACT',
          badgeVariant: 'default',
          items: [
            diagrams.length > 0
              ? `Consolidate ${diagrams.length} business processes: identify overlapping mainframe batch jobs and merge redundant VSAM file operations to reduce CPU consumption by an estimated 15-25%.`
              : 'No processes detected yet. Add business processes to unlock cost reduction analysis.',
            totalRisks > 3
              ? `${highRisks} high-risk scenarios detected across processes. Implementing automated RACF policy enforcement could reduce manual audit effort by 40%, saving approximately 200+ man-hours annually.`
              : 'Add risk scenarios to processes to identify control automation opportunities.',
            'Migrate low-complexity batch jobs from mainframe to distributed processing. Based on typical industry benchmarks, this could reduce MIPS costs by 10-20% for qualifying workloads.',
            totalMFQ > 0
              ? `${totalMFQ} mainframe data questions identified. Automating data quality checks at the DB2/VSAM layer could prevent downstream reconciliation failures and reduce manual intervention costs.`
              : 'Add mainframe AI questions to processes to identify data quality improvement areas.',
          ],
        },
        {
          title: 'Revenue & Value Optimization',
          icon: TrendingUp,
          badge: 'STRATEGIC',
          badgeVariant: 'secondary',
          items: [
            `With ${clientCount} client(s) and ${diagrams.length} process(es), there's an opportunity to offer process-as-a-service models. Standardized mainframe processing pipelines can be monetized across client engagements.`,
            'Implement real-time mainframe data streaming (via MQ/Kafka bridge) to enable faster decision-making — reducing order-to-cash cycle time by 2-3 days based on industry benchmarks.',
            totalRegs > 0
              ? `${totalRegs} regulatory requirements tracked. Proactive compliance reporting can be packaged as a value-add service for clients, creating a new revenue stream.`
              : 'Track regulations per process to identify compliance-as-a-service opportunities.',
            'Leverage mainframe transaction logs for predictive analytics: identify peak processing windows and optimize batch scheduling to improve SLA performance by 15-30%.',
          ],
        },
        {
          title: 'Risk Mitigation & Control Gaps',
          icon: ShieldAlert,
          badge: criticalIncidents > 0 ? 'CRITICAL' : 'MODERATE',
          badgeVariant: criticalIncidents > 0 ? 'destructive' : 'outline',
          items: [
            highRisks > 0
              ? `⚠️ ${highRisks} high-likelihood/high-impact risk scenarios require immediate attention. Priority: review RACF dataset rules, enforce separation of duties (SoD), and implement maker-checker controls on master data changes.`
              : 'No high-severity risks detected. Continue monitoring and add risk scenarios as processes evolve.',
            criticalIncidents > 0
              ? `🔴 ${criticalIncidents} critical/high incidents open. Recommended: implement automated batch job failure detection with SNMP/webhook alerting, and establish 30-minute response SLAs for production mainframe issues.`
              : 'No critical incidents. Maintain proactive monitoring of batch job completion and dataset integrity.',
            nonCompliant > 0
              ? `${nonCompliant} non-compliant regulation(s) flagged. Immediate action required: map control gaps to specific mainframe data objects and implement compensating controls (logging, access reviews, encryption at rest).`
              : 'All tracked regulations show compliance. Schedule quarterly re-assessments to maintain status.',
            'Cross-process risk correlation: analyze shared mainframe datasets across processes to identify single points of failure. If one DB2 table serves multiple critical processes, its unavailability creates cascading business impact.',
          ],
        },
        {
          title: 'AI-Recommended Next Steps',
          icon: Lightbulb,
          badge: 'ACTIONABLE',
          badgeVariant: 'outline',
          items: [
            diagrams.length < 3
              ? 'Priority: Add at least 3-5 core business processes with full risk scenario mapping to enable comprehensive cross-process analysis.'
              : `With ${diagrams.length} processes mapped, proceed to: (1) link all processes to clients, (2) complete risk scenario coverage, (3) map mainframe data dependencies per process.`,
            'Implement automated change detection on mainframe configuration datasets. Any unauthorized modification to tariff tables, salary files, or access control lists should trigger immediate alerts.',
            'Build a process-to-data dependency matrix: for each business process, catalog every mainframe data object (DB2 table, VSAM file, MQ queue) it reads or writes. This enables impact analysis when planning changes or responding to incidents.',
            'Schedule quarterly AI-driven re-analysis as your process and risk data grows. The insights become increasingly accurate and actionable with more data points.',
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
        <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" /> AI-Powered Reports
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Intelligent analysis of business processes, mainframe data, and risk scenarios to optimize operations and maximize value
          </p>
        </div>
      </div>

      {/* Context Summary */}
      <Card className="border border-dashed border-primary/40 shadow-none">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-foreground">Data Context for Analysis</h3>
              <p className="text-xs text-muted-foreground mt-1">
                The AI engine analyzes all your platform data to generate actionable insights for cost reduction, revenue optimization, and risk mitigation.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="secondary" className="text-xs">{clientCount} Client(s)</Badge>
                <Badge variant="secondary" className="text-xs">{diagrams.length} Process(es)</Badge>
                <Badge variant="secondary" className="text-xs">{totalRisks} Risk Scenario(s)</Badge>
                <Badge variant="secondary" className="text-xs">{totalIncidents} Incident(s)</Badge>
                <Badge variant="secondary" className="text-xs">{totalRegs} Regulation(s)</Badge>
                <Badge variant="secondary" className="text-xs">{totalMFQ} MF AI Q&A(s)</Badge>
              </div>
            </div>
            <Button onClick={generateReport} disabled={generating} className="flex-shrink-0">
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing…
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" /> Generate Report
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report */}
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
                  <CardTitle className="text-base flex items-center gap-2">
                    <section.icon className="h-5 w-5 text-primary" />
                    {section.title}
                  </CardTitle>
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
                This report was generated by analyzing {diagrams.length} business process(es), {totalRisks} risk scenario(s), {totalIncidents} incident(s), and {totalRegs} regulation(s).
                Re-generate after adding more data for increasingly precise and actionable insights.
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
            Click "Generate Report" to run an AI-powered analysis of all your business processes, mainframe data dependencies, risk scenarios, and compliance status.
          </p>
        </div>
      )}
    </div>
  );
}
