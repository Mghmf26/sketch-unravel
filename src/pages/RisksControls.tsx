import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldAlert, Shield, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { loadDiagrams } from '@/lib/store';
import type { EPCDiagram } from '@/types/epc';

export default function RisksControls() {
  const navigate = useNavigate();
  const [diagrams, setDiagrams] = useState<EPCDiagram[]>([]);

  useEffect(() => { setDiagrams(loadDiagrams()); }, []);

  const allRisks = diagrams.flatMap((d) =>
    (d.riskScenarios || []).map((r) => ({ ...r, processName: d.processName, processId: d.id }))
  );

  const stats = {
    total: allRisks.length,
    high: allRisks.filter((r) => r.impact === 'high' || r.likelihood === 'high').length,
    medium: allRisks.filter((r) => r.impact === 'medium' && r.likelihood !== 'high').length,
    low: allRisks.filter((r) => r.impact === 'low' && r.likelihood === 'low').length,
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Risks & Controls</h1>
          <p className="text-sm text-muted-foreground mt-1">Consolidated risk landscape across all business processes</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'TOTAL RISKS', value: stats.total, icon: ShieldAlert },
          { label: 'HIGH SEVERITY', value: stats.high, icon: AlertTriangle },
          { label: 'MEDIUM', value: stats.medium, icon: Shield },
          { label: 'LOW', value: stats.low, icon: Shield },
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

      {/* Risk table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">Risk Scenarios Registry</CardTitle>
          <CardDescription>All risk scenarios mapped across business processes with likelihood and impact assessments</CardDescription>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="font-semibold text-xs uppercase">Process</TableHead>
              <TableHead className="font-semibold text-xs uppercase">Description</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-center">Likelihood</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-center">Impact</TableHead>
              <TableHead className="font-semibold text-xs uppercase">Mitigation / Controls</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allRisks.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No risk scenarios defined yet. Add them from Business Processes.</TableCell></TableRow>
            ) : (
              allRisks.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-sm">{r.processName}</TableCell>
                  <TableCell className="text-sm max-w-xs">{r.description}</TableCell>
                  <TableCell className="text-center"><Badge className={`text-[10px] border-0 ${r.likelihood === 'high' ? 'bg-destructive/15 text-destructive' : r.likelihood === 'medium' ? 'bg-yellow-500/15 text-yellow-600' : 'bg-primary/15 text-primary'}`}>{r.likelihood}</Badge></TableCell>
                  <TableCell className="text-center"><Badge className={`text-[10px] border-0 ${r.impact === 'high' ? 'bg-destructive/15 text-destructive' : r.impact === 'medium' ? 'bg-yellow-500/15 text-yellow-600' : 'bg-primary/15 text-primary'}`}>{r.impact}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs">{r.mitigation}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
