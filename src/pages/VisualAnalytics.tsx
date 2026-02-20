import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, PieChart, BarChart3, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { loadDiagrams } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';
import type { EPCDiagram } from '@/types/epc';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  PieChart as RPieChart, Pie, Cell, Legend,
  LineChart, Line, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';

const COLORS = [
  'hsl(72, 55%, 50%)',
  'hsl(200, 70%, 50%)',
  'hsl(340, 65%, 55%)',
  'hsl(45, 80%, 55%)',
  'hsl(160, 55%, 45%)',
  'hsl(280, 55%, 55%)',
];

export default function VisualAnalytics() {
  const navigate = useNavigate();
  const [diagrams, setDiagrams] = useState<EPCDiagram[]>([]);
  const [clientCount, setClientCount] = useState(0);

  useEffect(() => {
    setDiagrams(loadDiagrams());
    supabase.from('clients').select('id', { count: 'exact', head: true }).then(({ count }) => {
      setClientCount(count || 0);
    });
  }, []);

  // Derived data
  const risksByLikelihood = (() => {
    const map = { low: 0, medium: 0, high: 0 };
    diagrams.forEach(d => d.riskScenarios?.forEach(r => { map[r.likelihood]++; }));
    return [
      { name: 'Low', value: map.low },
      { name: 'Medium', value: map.medium },
      { name: 'High', value: map.high },
    ];
  })();

  const incidentsBySeverity = (() => {
    const map = { low: 0, medium: 0, high: 0, critical: 0 };
    diagrams.forEach(d => d.incidents?.forEach(inc => { map[inc.severity]++; }));
    return [
      { name: 'Low', value: map.low },
      { name: 'Medium', value: map.medium },
      { name: 'High', value: map.high },
      { name: 'Critical', value: map.critical },
    ];
  })();

  const processMetrics = diagrams.slice(0, 8).map(d => ({
    name: d.processName.length > 14 ? d.processName.slice(0, 14) + '…' : d.processName,
    risks: d.riskScenarios?.length || 0,
    incidents: d.incidents?.length || 0,
    regulations: d.regulations?.length || 0,
    nodes: d.nodes.length,
  }));

  const complianceData = (() => {
    const map = { compliant: 0, partial: 0, 'non-compliant': 0 };
    diagrams.forEach(d => d.regulations?.forEach(r => { map[r.complianceStatus]++; }));
    return [
      { name: 'Compliant', value: map.compliant },
      { name: 'Partial', value: map.partial },
      { name: 'Non-Compliant', value: map['non-compliant'] },
    ];
  })();

  const radarData = [
    { metric: 'Processes', value: diagrams.length },
    { metric: 'Clients', value: clientCount },
    { metric: 'Risks', value: diagrams.reduce((s, d) => s + (d.riskScenarios?.length || 0), 0) },
    { metric: 'Incidents', value: diagrams.reduce((s, d) => s + (d.incidents?.length || 0), 0) },
    { metric: 'Regulations', value: diagrams.reduce((s, d) => s + (d.regulations?.length || 0), 0) },
    { metric: 'MF Questions', value: diagrams.reduce((s, d) => s + (d.mfQuestions?.length || 0), 0) },
  ];

  const trendData = diagrams
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((d, i) => ({
      idx: i + 1,
      risks: d.riskScenarios?.length || 0,
      incidents: d.incidents?.length || 0,
    }));

  const chartConfig = {
    risks: { label: 'Risks', color: COLORS[0] },
    incidents: { label: 'Incidents', color: COLORS[2] },
    regulations: { label: 'Regulations', color: COLORS[1] },
    nodes: { label: 'Nodes', color: COLORS[3] },
    value: { label: 'Count', color: COLORS[0] },
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" /> Visual Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Interactive charts and dashboards for process, risk, and compliance insights</p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Processes', value: diagrams.length, icon: Activity },
          { label: 'Risk Scenarios', value: diagrams.reduce((s, d) => s + (d.riskScenarios?.length || 0), 0), icon: TrendingUp },
          { label: 'Compliance Items', value: diagrams.reduce((s, d) => s + (d.regulations?.length || 0), 0), icon: PieChart },
          { label: 'Incidents Tracked', value: diagrams.reduce((s, d) => s + (d.incidents?.length || 0), 0), icon: BarChart3 },
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

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Process Metrics Bar Chart */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Process Breakdown</CardTitle>
            <CardDescription>Risks, incidents & regulations per process</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <BarChart data={processMetrics}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="risks" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="incidents" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="regulations" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Risk Likelihood Pie */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Risk Distribution by Likelihood</CardTitle>
            <CardDescription>Proportion of low, medium, and high risks</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <RPieChart>
                <Pie data={risksByLikelihood} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {risksByLikelihood.map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
              </RPieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Incidents Severity Bar */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Incidents by Severity</CardTitle>
            <CardDescription>Breakdown of incident severity levels</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <BarChart data={incidentsBySeverity} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={70} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {incidentsBySeverity.map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Compliance Pie */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Compliance Status</CardTitle>
            <CardDescription>Regulation compliance across all processes</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <RPieChart>
                <Pie data={complianceData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {complianceData.map((_, i) => (
                    <Cell key={i} fill={[COLORS[4], COLORS[3], COLORS[2]][i]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
              </RPieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Trend Line */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Risk & Incident Trend</CardTitle>
            <CardDescription>Cumulative trend across processes</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="idx" tick={{ fontSize: 10 }} label={{ value: 'Process #', position: 'insideBottom', offset: -2, fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="risks" stroke={COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="incidents" stroke={COLORS[2]} strokeWidth={2} dot={{ r: 3 }} />
                <Legend />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Radar */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Platform Coverage Radar</CardTitle>
            <CardDescription>Overall data distribution across dimensions</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <RadarChart cx="50%" cy="50%" outerRadius={80} data={radarData}>
                <PolarGrid className="stroke-border/40" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
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
