import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  Users,
  Network,
  AlertTriangle,
  AlertCircle,
  UserPlus,
  PlusCircle,
  Upload,
  Database,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { loadDiagrams } from '@/lib/store';
import type { EPCDiagram } from '@/types/epc';

export default function Dashboard() {
  const navigate = useNavigate();
  const [diagrams, setDiagrams] = useState<EPCDiagram[]>([]);

  useEffect(() => {
    setDiagrams(loadDiagrams());
  }, []);

  const totalRisks = diagrams.reduce((sum, d) => sum + d.nodes.filter(n => n.type === 'event').length, 0);

  const stats = [
    { label: 'TOTAL CLIENTS', value: 0, icon: Users, trend: null },
    { label: 'TOTAL PROCESSES', value: diagrams.length, icon: Network, trend: diagrams.length > 0 ? '+' + diagrams.length : null },
    { label: 'TOTAL RISKS', value: totalRisks, icon: AlertTriangle, trend: null },
    { label: 'OPEN INCIDENTS', value: 0, icon: AlertCircle, trend: null },
  ];

  const quickActions = [
    { label: 'Add Client', description: 'Register a new client', icon: UserPlus, onClick: () => {} },
    { label: 'Add Business Process', description: 'Create or extract a process', icon: PlusCircle, onClick: () => navigate('/upload') },
    { label: 'Upload Documents', description: 'Upload diagram images', icon: Upload, onClick: () => navigate('/upload') },
    { label: 'Import Mainframe Data', description: 'Import transaction logs', icon: Database, onClick: () => {} },
  ];

  const recentActivities = diagrams
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)
    .map((d) => ({
      text: `Process updated: ${d.processName}`,
      time: formatTimeAgo(d.updatedAt),
      icon: Network,
    }));

  return (
    <div className="p-8 space-y-8 max-w-7xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground mt-1">Business Process Analysis & Relationship Platform</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((s) => (
          <Card key={s.label} className="group relative overflow-hidden border border-dashed border-primary/40 shadow-sm hover:shadow-lg transition-all duration-300 cursor-default bg-card">
            <CardContent className="relative flex items-center justify-between p-5">
              <div>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-extrabold text-primary">{s.value}</p>
                  {s.trend && (
                    <span className="flex items-center gap-0.5 text-xs font-semibold text-primary">
                      <TrendingUp className="h-3 w-3" /> {s.trend}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground font-semibold tracking-widest mt-1.5 uppercase">{s.label}</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((a) => (
            <Card
              key={a.label}
              className="group cursor-pointer border shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-card"
              onClick={a.onClick}
            >
              <CardContent className="flex flex-col items-center justify-center py-8 gap-3 relative">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                  <a.icon className="h-7 w-7 text-primary" />
                </div>
                <div className="text-center">
                  <span className="text-sm font-semibold text-foreground block">{a.label}</span>
                  <span className="text-[11px] text-muted-foreground mt-0.5 block">{a.description}</span>
                </div>
                <ArrowUpRight className="absolute top-3 right-3 h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground/50 transition-all" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Activities */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-4">Recent Activities</h2>
        <Card className="border shadow-sm overflow-hidden bg-card">
          <CardContent className="p-0">
            {recentActivities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 gap-3">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <Network className="h-5 w-5 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">No recent activities yet</p>
                <p className="text-xs text-muted-foreground/60">Activities will appear here as you work</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {recentActivities.map((a, i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <a.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{a.text}</p>
                      <p className="text-xs text-muted-foreground">{a.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
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
