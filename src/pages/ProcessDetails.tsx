import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ArrowLeft, Layers, GitBranch, Clock, Users, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { loadDiagrams } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';
import type { EPCDiagram } from '@/types/epc';

export default function ProcessDetails() {
  const navigate = useNavigate();
  const [diagrams, setDiagrams] = useState<EPCDiagram[]>([]);
  const [clientMap, setClientMap] = useState<Record<string, string>>({});

  useEffect(() => {
    setDiagrams(loadDiagrams());
    supabase.from('clients').select('id, name').then(({ data }) => {
      const m: Record<string, string> = {};
      (data || []).forEach((c) => (m[c.id] = c.name));
      setClientMap(m);
    });
  }, []);

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Process Details</h1>
          <p className="text-sm text-muted-foreground mt-1">Detailed view of all business process configurations and their components</p>
        </div>
      </div>

      {diagrams.length === 0 ? (
        <Card className="border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <FileText className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No processes created yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5">
          {diagrams.map((d) => (
            <Card key={d.id} className="border bg-card hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{d.processName}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">ID: {d.processId}</p>
                  </div>
                  <Badge className="bg-primary/15 text-primary border-0 text-[10px]">ACTIVE</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Client:</span>
                    <span className="font-medium">{d.clientId ? clientMap[d.clientId] || '—' : '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Owner:</span>
                    <span className="font-medium">{d.owner || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Steps:</span>
                    <span className="font-medium">{d.nodes.length}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Updated:</span>
                    <span className="font-medium">{new Date(d.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px]">{d.nodes.filter(n => n.type === 'event').length} Risks</Badge>
                  <Badge variant="outline" className="text-[10px]">{d.nodes.filter(n => n.type === 'xor').length} Controls</Badge>
                  <Badge variant="outline" className="text-[10px]">{d.riskScenarios?.length || 0} Risk Scenarios</Badge>
                  <Badge variant="outline" className="text-[10px]">{d.incidents?.length || 0} Incidents</Badge>
                  <Badge variant="outline" className="text-[10px]">{d.regulations?.length || 0} Regulations</Badge>
                  <Badge variant="outline" className="text-[10px]">{d.mfQuestions?.length || 0} MF Questions</Badge>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline" onClick={() => navigate(`/view/${d.id}`)}>View Diagram</Button>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/edit/${d.id}`)}>Edit</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
