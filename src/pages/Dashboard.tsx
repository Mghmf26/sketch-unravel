import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  Users, Network, AlertTriangle, AlertCircle, UserPlus, PlusCircle, Database, Scale,
  ShieldAlert, Shield, TrendingUp, ArrowUpRight, Activity, BarChart3, Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchProcesses, fetchClients, fetchRisks, fetchIncidents, fetchRegulations,
  fetchAllControls, fetchMainframeImports,
  type BusinessProcess, type Client, type Risk, type Control, type Incident, type Regulation,
} from '@/lib/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [processes, setProcesses] = useState<BusinessProcess[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [controls, setControls] = useState<Control[]>([]);
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [importCount, setImportCount] = useState(0);

  useEffect(() => {
    Promise.all([
      fetchProcesses(), fetchClients(), fetchRisks(), fetchIncidents(),
      fetchAllControls(), fetchRegulations(), fetchMainframeImports(),
    ]).then(([p, c, r, i, ctrl, reg, imp]) => {
      setProcesses(p); setClients(c); setRisks(r); setIncidents(i);
      setControls(ctrl); setRegulations(reg); setImportCount(imp.length);
    });
  }, []);

  const displayName = profile?.display_name || 'User';
  const openIncidents = incidents.filter(inc => inc.status === 'open' || inc.status === 'investigating');
  const highRisks = risks.filter(r => r.impact === 'high' || r.likelihood === 'high');
  const compliantRegs = regulations.filter(r => r.compliance_status === 'compliant');
  const complianceRate = regulations.length > 0 ? Math.round((compliantRegs.length / regulations.length) * 100) : 0;
  const controlCoverage = risks.length > 0 ? Math.round((risks.filter(r => controls.some(c => c.risk_id === r.id)).length / risks.length) * 100) : 0;

  const greeting = getGreeting();

  return (
    <div className="p-8 space-y-8 max-w-7xl">
      {/* Hero Welcome */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[hsl(var(--sidebar-background))] to-[hsl(70,12%,22%)] p-8 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[hsl(var(--sidebar-primary)/0.08)] rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-1/2 w-96 h-48 bg-[hsl(var(--sidebar-primary)/0.05)] rounded-full translate-y-1/2" />
        <div className="relative z-10">
          <p className="text-[hsl(var(--sidebar-primary))] text-xs font-semibold tracking-[0.2em] uppercase mb-2">{greeting}</p>
          <h1 className="text-3xl font-bold tracking-tight">{displayName}</h1>
          <p className="text-white/60 text-sm mt-2 max-w-xl">
            Your process intelligence dashboard — monitor risks, controls, compliance, and mainframe health across all engagements.
          </p>
          <div className="flex gap-3 mt-5">
            <Badge className="bg-[hsl(var(--sidebar-primary)/0.15)] text-[hsl(var(--sidebar-primary))] border-0 px-3 py-1 text-xs font-medium">
              {processes.length} Processes
            </Badge>
            <Badge className="bg-white/10 text-white/80 border-0 px-3 py-1 text-xs font-medium">
              {clients.length} Clients
            </Badge>
            <Badge className="bg-white/10 text-white/80 border-0 px-3 py-1 text-xs font-medium">
              {importCount} Data Sources
            </Badge>
          </div>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Risks"
          value={risks.length}
          subValue={`${highRisks.length} high severity`}
          icon={ShieldAlert}
          trend={highRisks.length > 0 ? 'warning' : 'good'}
          onClick={() => navigate('/risks')}
        />
        <MetricCard
          label="Controls"
          value={controls.length}
          subValue={`${controlCoverage}% coverage`}
          icon={Shield}
          trend={controlCoverage >= 80 ? 'good' : controlCoverage >= 50 ? 'neutral' : 'warning'}
          onClick={() => navigate('/controls')}
        />
        <MetricCard
          label="Compliance"
          value={`${complianceRate}%`}
          subValue={`${compliantRegs.length}/${regulations.length} compliant`}
          icon={Scale}
          trend={complianceRate >= 80 ? 'good' : complianceRate >= 50 ? 'neutral' : 'warning'}
          onClick={() => navigate('/regulations')}
        />
        <MetricCard
          label="Open Incidents"
          value={openIncidents.length}
          subValue={`${incidents.length} total`}
          icon={AlertCircle}
          trend={openIncidents.length === 0 ? 'good' : openIncidents.length <= 3 ? 'neutral' : 'warning'}
          onClick={() => navigate('/incidents')}
        />
      </div>

      {/* Middle Row: Quick Actions + Risk Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-sm font-semibold text-foreground tracking-wide uppercase">Quick Actions</h2>
          <div className="space-y-2">
            {[
              { label: 'Add Risk', desc: 'Register a new risk scenario', icon: ShieldAlert, path: '/risks', color: 'text-destructive' },
              { label: 'Add Client', desc: 'Register a new engagement', icon: UserPlus, path: '/clients', color: 'text-primary' },
              { label: 'Add Process', desc: 'Create or extract a process', icon: PlusCircle, path: '/upload', color: 'text-primary' },
              { label: 'Import Data', desc: 'Connect mainframe sources', icon: Database, path: '/imports', color: 'text-primary' },
              { label: 'View Analytics', desc: 'Visual insights & charts', icon: BarChart3, path: '/analytics', color: 'text-primary' },
            ].map(a => (
              <Card key={a.label} className="group cursor-pointer border bg-card hover:bg-muted/50 shadow-none hover:shadow-sm transition-all duration-200" onClick={() => navigate(a.path)}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/15 transition-colors`}>
                    <a.icon className={`h-5 w-5 ${a.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{a.label}</p>
                    <p className="text-xs text-muted-foreground">{a.desc}</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Risk & Compliance Breakdown */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-semibold text-foreground tracking-wide uppercase">Risk & Compliance Overview</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Risk Severity Distribution */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Risk Severity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <SeverityBar label="High" count={risks.filter(r => r.impact === 'high' || r.likelihood === 'high').length} total={risks.length} color="bg-destructive" />
                <SeverityBar label="Medium" count={risks.filter(r => r.impact === 'medium' && r.likelihood !== 'high').length} total={risks.length} color="bg-yellow-500" />
                <SeverityBar label="Low" count={risks.filter(r => r.impact === 'low' && r.likelihood === 'low').length} total={risks.length} color="bg-primary" />
              </CardContent>
            </Card>

            {/* Control Types */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Control Types
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <SeverityBar label="Preventive" count={controls.filter(c => c.type === 'preventive').length} total={controls.length} color="bg-primary" />
                <SeverityBar label="Detective" count={controls.filter(c => c.type === 'detective').length} total={controls.length} color="bg-yellow-500" />
                <SeverityBar label="Corrective" count={controls.filter(c => c.type === 'corrective').length} total={controls.length} color="bg-blue-500" />
              </CardContent>
            </Card>

            {/* Compliance Gauge */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Scale className="h-4 w-4 text-primary" />
                  Compliance Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-3">
                  <span className={`text-4xl font-bold ${complianceRate >= 80 ? 'text-primary' : complianceRate >= 50 ? 'text-yellow-600' : 'text-destructive'}`}>{complianceRate}%</span>
                  <span className="text-xs text-muted-foreground mb-1">{compliantRegs.length} of {regulations.length}</span>
                </div>
                <Progress value={complianceRate} className="mt-3 h-2" />
                <div className="flex justify-between mt-2">
                  <span className="text-[10px] text-muted-foreground">{regulations.filter(r => r.compliance_status === 'non-compliant').length} non-compliant</span>
                  <span className="text-[10px] text-muted-foreground">{regulations.filter(r => r.compliance_status === 'partial').length} partial</span>
                </div>
              </CardContent>
            </Card>

            {/* Control Coverage */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Control Coverage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-3">
                  <span className={`text-4xl font-bold ${controlCoverage >= 80 ? 'text-primary' : controlCoverage >= 50 ? 'text-yellow-600' : 'text-destructive'}`}>{controlCoverage}%</span>
                  <span className="text-xs text-muted-foreground mb-1">risks mitigated</span>
                </div>
                <Progress value={controlCoverage} className="mt-3 h-2" />
                <div className="flex justify-between mt-2">
                  <span className="text-[10px] text-muted-foreground">{risks.filter(r => !controls.some(c => c.risk_id === r.id)).length} unmitigated</span>
                  <span className="text-[10px] text-muted-foreground">{controls.length} controls total</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Recent Processes */}
      <div>
        <h2 className="text-sm font-semibold text-foreground tracking-wide uppercase mb-3">Recent Processes</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {processes.slice(0, 6).map(p => {
            const pRisks = risks.filter(r => r.process_id === p.id);
            const pControls = controls.filter(c => pRisks.some(r => r.id === c.risk_id));
            const pRegs = regulations.filter(r => r.process_id === p.id);
            return (
              <Card key={p.id} className="group cursor-pointer border hover:border-primary/40 shadow-none hover:shadow-md transition-all duration-300" onClick={() => navigate(`/process-view/${p.id}`)}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{p.process_name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{p.department || 'No dept'} · {formatTimeAgo(p.updated_at)}</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors flex-shrink-0 mt-0.5" />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[9px] px-2 py-0.5">{pRisks.length} risks</Badge>
                    <Badge variant="outline" className="text-[9px] px-2 py-0.5">{pControls.length} controls</Badge>
                    <Badge variant="outline" className="text-[9px] px-2 py-0.5">{pRegs.length} regs</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        {processes.length > 6 && (
          <div className="mt-3 text-center">
            <Button variant="ghost" size="sm" onClick={() => navigate('/processes')} className="text-xs text-muted-foreground">
              View all {processes.length} processes <ArrowUpRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, subValue, icon: Icon, trend, onClick }: {
  label: string; value: string | number; subValue: string; icon: any; trend: 'good' | 'neutral' | 'warning'; onClick: () => void;
}) {
  const trendColor = trend === 'good' ? 'text-primary' : trend === 'neutral' ? 'text-yellow-600' : 'text-destructive';
  const trendBg = trend === 'good' ? 'bg-primary/10' : trend === 'neutral' ? 'bg-yellow-500/10' : 'bg-destructive/10';
  return (
    <Card className="group cursor-pointer border hover:border-primary/40 shadow-none hover:shadow-md transition-all duration-300" onClick={onClick}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className={`h-10 w-10 rounded-xl ${trendBg} flex items-center justify-center`}>
            <Icon className={`h-5 w-5 ${trendColor}`} />
          </div>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
        </div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-[10px] text-muted-foreground font-semibold tracking-widest uppercase mt-1">{label}</p>
        <p className={`text-xs mt-1 ${trendColor}`}>{subValue}</p>
      </CardContent>
    </Card>
  );
}

function SeverityBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-semibold text-foreground">{count}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
