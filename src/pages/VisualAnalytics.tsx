import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, PieChart, BarChart3, Activity } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import {
  fetchProcesses, fetchClients, fetchRisks, fetchAllControls, fetchIncidents, fetchRegulations, fetchMFQuestions,
  type BusinessProcess, type Risk, type Incident, type Regulation, type MFQuestion,
} from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  PieChart as RPieChart, Pie, Cell, Legend,
  LineChart, Line,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';

const COLORS = [
  'hsl(72, 55%, 50%)', 'hsl(200, 70%, 50%)', 'hsl(340, 65%, 55%)',
  'hsl(45, 80%, 55%)', 'hsl(160, 55%, 45%)', 'hsl(280, 55%, 55%)',
];

export default function VisualAnalytics() {
  const navigate = useNavigate();
  const [processes, setProcesses] = useState<BusinessProcess[]>([]);
  const [clientCount, setClientCount] = useState(0);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [mfQuestions, setMfQuestions] = useState<MFQuestion[]>([]);

  useEffect(() => {
    Promise.all([fetchProcesses(), fetchClients(), fetchRisks(), fetchAllControls(), fetchIncidents(), fetchRegulations(), fetchMFQuestions()])
      .then(([p, c, r, _ctrl, i, reg, mfq]) => {
        setProcesses(p); setClientCount(c.length); setRisks(r); setIncidents(i); setRegulations(reg); setMfQuestions(mfq);
      });
  }, []);

  const risksByLikelihood = [
    { name: 'Low', value: risks.filter(r => r.likelihood === 'low').length },
    { name: 'Medium', value: risks.filter(r => r.likelihood === 'medium').length },
    { name: 'High', value: risks.filter(r => r.likelihood === 'high').length },
  ];

  const incidentsBySeverity = [
    { name: 'Low', value: incidents.filter(i => i.severity === 'low').length },
    { name: 'Medium', value: incidents.filter(i => i.severity === 'medium').length },
    { name: 'High', value: incidents.filter(i => i.severity === 'high').length },
    { name: 'Critical', value: incidents.filter(i => i.severity === 'critical').length },
  ];

  const processMetrics = processes.slice(0, 8).map(p => ({
    name: p.process_name.length > 14 ? p.process_name.slice(0, 14) + '…' : p.process_name,
    risks: risks.filter(r => r.process_id === p.id).length,
    incidents: incidents.filter(i => i.process_id === p.id).length,
    regulations: regulations.filter(r => r.process_id === p.id).length,
  }));

  const complianceData = [
    { name: 'Compliant', value: regulations.filter(r => r.compliance_status === 'compliant').length },
    { name: 'Partial', value: regulations.filter(r => r.compliance_status === 'partial').length },
    { name: 'Non-Compliant', value: regulations.filter(r => r.compliance_status === 'non-compliant').length },
  ];

  const radarData = [
    { metric: 'Processes', value: processes.length },
    { metric: 'Clients', value: clientCount },
    { metric: 'Risks', value: risks.length },
    { metric: 'Incidents', value: incidents.length },
    { metric: 'Regulations', value: regulations.length },
    { metric: 'MF Questions', value: mfQuestions.length },
  ];

  const chartConfig = {
    risks: { label: 'Risks', color: COLORS[0] },
    incidents: { label: 'Incidents', color: COLORS[2] },
    regulations: { label: 'Regulations', color: COLORS[1] },
    value: { label: 'Count', color: COLORS[0] },
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl">
      <PageHeader
        title="Visual Analytics"
        description="Interactive charts for process, risk, and compliance insights"
        breadcrumbs={[
          { label: 'Portfolio', to: '/' },
          { label: 'Reporting' },
          { label: 'Visual Analytics' },
        ]}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Processes', value: processes.length, icon: Activity },
          { label: 'Risk Scenarios', value: risks.length, icon: TrendingUp },
          { label: 'Compliance Items', value: regulations.length, icon: PieChart },
          { label: 'Incidents Tracked', value: incidents.length, icon: BarChart3 },
        ].map(s => (
          <Card key={s.label} className="border border-dashed border-primary/40 shadow-none">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-2xl font-bold text-primary">{s.value}</p>
                <p className="text-[10px] text-muted-foreground font-semibold tracking-widest uppercase mt-1">{s.label}</p>
              </div>
              <s.icon className="h-5 w-5 text-primary/50" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base">Process Breakdown</CardTitle><CardDescription>Risks, incidents & regulations per process</CardDescription></CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <BarChart data={processMetrics}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="risks" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="incidents" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="regulations" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base">Risk Distribution by Likelihood</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-center">
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <RPieChart>
                <Pie data={risksByLikelihood} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {risksByLikelihood.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
              </RPieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base">Incidents by Severity</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <BarChart data={incidentsBySeverity} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={70} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {incidentsBySeverity.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base">Compliance Status</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-center">
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <RPieChart>
                <Pie data={complianceData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {complianceData.map((_, i) => <Cell key={i} fill={[COLORS[4], COLORS[3], COLORS[2]][i]} />)}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
              </RPieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border shadow-sm lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-base">Platform Coverage Radar</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-center">
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <RadarChart cx="50%" cy="50%" outerRadius={80} data={radarData}>
                <PolarGrid className="stroke-border/40" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis tick={{ fontSize: 9 }} />
                <Radar name="Coverage" dataKey="value" stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.3} />
                <ChartTooltip content={<ChartTooltipContent />} />
              </RadarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
