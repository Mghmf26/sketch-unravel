import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, CheckCircle, Search as SearchIcon, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { loadDiagrams } from '@/lib/store';

export default function Incidents() {
  const navigate = useNavigate();
  const [diagrams] = useState(loadDiagrams());

  const allIncidents = diagrams.flatMap((d) =>
    (d.incidents || []).map((i) => ({ ...i, processName: d.processName }))
  );

  const stats = {
    total: allIncidents.length,
    open: allIncidents.filter((i) => i.status === 'open').length,
    investigating: allIncidents.filter((i) => i.status === 'investigating').length,
    resolved: allIncidents.filter((i) => i.status === 'resolved' || i.status === 'closed').length,
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Incidents</h1>
          <p className="text-sm text-muted-foreground mt-1">Incident tracking and management — operational disruptions, data breaches, processing failures</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'TOTAL INCIDENTS', value: stats.total, icon: AlertCircle },
          { label: 'OPEN', value: stats.open, icon: AlertCircle },
          { label: 'INVESTIGATING', value: stats.investigating, icon: SearchIcon },
          { label: 'RESOLVED', value: stats.resolved, icon: CheckCircle },
        ].map((s) => (
          <Card key={s.label} className="border border-dashed border-primary/40 bg-card">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-2xl font-bold text-primary">{s.value}</p>
                <p className="text-[10px] text-muted-foreground font-semibold tracking-widest uppercase">{s.label}</p>
              </div>
              <s.icon className="h-5 w-5 text-primary/60" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-sm overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">Incident Registry</CardTitle>
          <CardDescription>All incidents reported across business processes with severity and resolution status</CardDescription>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="font-semibold text-xs uppercase">Process</TableHead>
              <TableHead className="font-semibold text-xs uppercase">Title</TableHead>
              <TableHead className="font-semibold text-xs uppercase">Description</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-center">Severity</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-center">Status</TableHead>
              <TableHead className="font-semibold text-xs uppercase">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allIncidents.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No incidents reported yet.</TableCell></TableRow>
            ) : (
              allIncidents.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium text-sm">{i.processName}</TableCell>
                  <TableCell className="font-medium text-sm">{i.title}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs">{i.description}</TableCell>
                  <TableCell className="text-center">
                    <Badge className={`text-[10px] border-0 ${i.severity === 'critical' ? 'bg-destructive/15 text-destructive' : i.severity === 'high' ? 'bg-destructive/15 text-destructive' : i.severity === 'medium' ? 'bg-yellow-500/15 text-yellow-600' : 'bg-primary/15 text-primary'}`}>{i.severity}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-[10px]">{i.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(i.date).toLocaleDateString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
