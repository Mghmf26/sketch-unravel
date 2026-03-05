import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Building2, Layers, Clock, Eye, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  fetchProcesses, fetchClients, fetchSteps, fetchRisks, fetchIncidents,
  type BusinessProcess, type Client,
} from '@/lib/api';

export default function ProcessDetails() {
  const navigate = useNavigate();
  const [processes, setProcesses] = useState<BusinessProcess[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [stepCounts, setStepCounts] = useState<Record<string, number>>({});
  const [riskCounts, setRiskCounts] = useState<Record<string, number>>({});
  const [incidentCounts, setIncidentCounts] = useState<Record<string, number>>({});

  // Filters
  const [searchName, setSearchName] = useState('');
  const [filterClient, setFilterClient] = useState('all');

  useEffect(() => {
    (async () => {
      const [p, c, s, r, i] = await Promise.all([
        fetchProcesses(), fetchClients(), fetchSteps(), fetchRisks(), fetchIncidents(),
      ]);
      setProcesses(p);
      setClients(c);

      const sc: Record<string, number> = {};
      const rc: Record<string, number> = {};
      const ic: Record<string, number> = {};
      p.forEach(proc => {
        sc[proc.id] = s.filter(x => x.process_id === proc.id).length;
        rc[proc.id] = r.filter(x => x.process_id === proc.id).length;
        ic[proc.id] = i.filter(x => x.process_id === proc.id).length;
      });
      setStepCounts(sc);
      setRiskCounts(rc);
      setIncidentCounts(ic);
    })();
  }, []);

  const clientMap: Record<string, string> = {};
  clients.forEach(c => (clientMap[c.id] = c.name));

  const filtered = processes.filter(p => {
    const matchName = !searchName || p.process_name.toLowerCase().includes(searchName.toLowerCase());
    const matchClient = filterClient === 'all' || p.client_id === filterClient;
    return matchName && matchClient;
  });

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Business Process Flows</h1>
          <p className="text-sm text-muted-foreground mt-1">Browse and inspect your business processes</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by process name..."
            value={searchName}
            onChange={e => setSearchName(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clients.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Process Grid */}
      {filtered.length === 0 ? (
        <Card className="border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <Layers className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No processes found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <Card key={p.id} className="border bg-card hover:shadow-md transition-shadow group">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-foreground leading-tight line-clamp-2">{p.process_name}</h3>
                  <Badge className="bg-primary/15 text-primary border-0 text-[10px] shrink-0 ml-2">ACTIVE</Badge>
                </div>

                {p.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    <span>{p.client_id ? clientMap[p.client_id] || '—' : '—'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5" />
                    <span>{stepCounts[p.id] || 0} Steps</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{new Date(p.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex gap-1.5 flex-wrap">
                  <Badge variant="outline" className="text-[10px]">{riskCounts[p.id] || 0} Risks</Badge>
                  <Badge variant="outline" className="text-[10px]">{incidentCounts[p.id] || 0} Incidents</Badge>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="w-full mt-1"
                  onClick={() => navigate(`/process-view/${p.id}`)}
                >
                  <Eye className="mr-1.5 h-3.5 w-3.5" /> View Process
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
