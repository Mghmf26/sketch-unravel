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
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { loadDiagrams } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';
import type { EPCDiagram } from '@/types/epc';

export default function Dashboard() {
  const navigate = useNavigate();
  const [diagrams, setDiagrams] = useState<EPCDiagram[]>([]);
  const [clientCount, setClientCount] = useState(0);

  useEffect(() => {
    setDiagrams(loadDiagrams());
    supabase.from('clients').select('id', { count: 'exact', head: true }).then(({ count }) => {
      setClientCount(count || 0);
    });
  }, []);

  const totalRisks = diagrams.reduce(
    (sum, d) => sum + (d.riskScenarios?.length || 0) + d.nodes.filter((n) => n.type === 'event').length,
    0
  );
  const totalIncidents = diagrams.reduce((sum, d) => sum + (d.incidents?.length || 0), 0);

  const stats = [
    { label: 'TOTAL CLIENTS', value: clientCount, icon: Users },
    { label: 'TOTAL PROCESSES', value: diagrams.length, icon: Network },
    { label: 'TOTAL RISKS', value: totalRisks, icon: AlertTriangle },
    { label: 'OPEN INCIDENTS', value: totalIncidents, icon: AlertCircle },
  ];

  const quickActions = [
    { label: 'Add Client', description: 'Register a new client', icon: UserPlus, onClick: () => navigate('/clients') },
    { label: 'Add Business Process', description: 'Create or extract a process', icon: PlusCircle, onClick: () => navigate('/upload') },
    { label: 'Upload Documents', description: 'Upload diagram images', icon: Upload, onClick: () => navigate('/upload') },
    { label: 'Import Mainframe Data', description: 'Import transaction logs', icon: Database, onClick: () => navigate('/imports') },
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
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Welcome, Herwig Thyssens</h1>
        <p className="text-sm text-muted-foreground mt-1">Business Process Analysis &amp; Relationship Platform</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((s) => (
          <Card key={s.label} className="group relative overflow-hidden border border-dashed border-primary/40 bg-card shadow-none hover:shadow-md transition-all duration-300 cursor-default rounded-lg">
            <CardContent className="relative flex items-center justify-between p-5">
              <div>
                <p className="text-3xl font-bold text-primary">{s.value}</p>
                <p className="text-[10px] text-muted-foreground font-semibold tracking-widest mt-1.5 uppercase">{s.label}</p>
              </div>
              <div className="h-11 w-11 flex items-center justify-center">
                <s.icon className="h-6 w-6 text-primary/60" />
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
            <Card key={a.label} className="group cursor-pointer border bg-card shadow-none hover:shadow-md transition-all duration-300 rounded-lg" onClick={a.onClick}>
              <CardContent className="flex flex-col items-center justify-center py-8 gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <a.icon className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">{a.label}</span>
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
