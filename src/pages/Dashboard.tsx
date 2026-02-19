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
import type { EPCDiagram } from '@/types/epc';

export default function Dashboard() {
  const navigate = useNavigate();
  const [diagrams, setDiagrams] = useState<EPCDiagram[]>([]);

  useEffect(() => {
    setDiagrams(loadDiagrams());
  }, []);

  const totalRisks = diagrams.reduce((sum, d) => sum + d.nodes.filter(n => n.type === 'event').length, 0);

  const stats = [
    { label: 'TOTAL CLIENTS', value: 0, icon: Users },
    { label: 'TOTAL PROCESSES', value: diagrams.length, icon: Network },
    { label: 'TOTAL RISKS', value: totalRisks, icon: AlertTriangle },
    { label: 'OPEN INCIDENTS', value: 0, icon: AlertCircle },
  ];

  const quickActions = [
    { label: 'Add Client', icon: UserPlus, onClick: () => {} },
    { label: 'Add Business Process', icon: PlusCircle, onClick: () => navigate('/upload') },
    { label: 'Upload Documents', icon: Upload, onClick: () => navigate('/upload') },
    { label: 'Import Mainframe Data', icon: Database, onClick: () => {} },
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
    <div className="p-6 space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Welcome</h1>
        <p className="text-sm text-muted-foreground">Business Process Analysis & Relationship Platform</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="border-l-4 border-l-[hsl(var(--success))]">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-3xl font-bold text-[hsl(var(--success))]">{s.value}</p>
                <p className="text-xs text-muted-foreground font-medium tracking-wide mt-1">{s.label}</p>
              </div>
              <s.icon className="h-8 w-8 text-muted-foreground/30" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((a) => (
            <Card
              key={a.label}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={a.onClick}
            >
              <CardContent className="flex flex-col items-center justify-center py-8 gap-3">
                <a.icon className="h-8 w-8 text-[hsl(var(--success))]" />
                <span className="text-sm font-medium text-foreground">{a.label}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Activities */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Recent Activities</h2>
        <Card>
          <CardContent className="p-0">
            {recentActivities.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground text-center">No recent activities</p>
            ) : (
              <div className="divide-y">
                {recentActivities.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 px-6 py-4">
                    <div className="h-8 w-8 rounded-full bg-[hsl(var(--success))]/10 flex items-center justify-center">
                      <a.icon className="h-4 w-4 text-[hsl(var(--success))]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{a.text}</p>
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
