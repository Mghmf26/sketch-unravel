import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Scale, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { loadDiagrams } from '@/lib/store';

export default function Regulations() {
  const navigate = useNavigate();
  const [diagrams, setDiagrams] = useState(loadDiagrams());

  useEffect(() => { setDiagrams(loadDiagrams()); }, []);

  const allRegs = diagrams.flatMap((d) =>
    (d.regulations || []).map((r) => ({ ...r, processName: d.processName }))
  );

  const stats = {
    total: allRegs.length,
    compliant: allRegs.filter((r) => r.complianceStatus === 'compliant').length,
    partial: allRegs.filter((r) => r.complianceStatus === 'partial').length,
    nonCompliant: allRegs.filter((r) => r.complianceStatus === 'non-compliant').length,
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Regulations</h1>
          <p className="text-sm text-muted-foreground mt-1">Regulatory compliance tracking across all processes — SOX, GDPR, Basel III, PCI-DSS and more</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'TOTAL REGULATIONS', value: stats.total, icon: Scale },
          { label: 'COMPLIANT', value: stats.compliant, icon: CheckCircle },
          { label: 'PARTIAL', value: stats.partial, icon: AlertTriangle },
          { label: 'NON-COMPLIANT', value: stats.nonCompliant, icon: XCircle },
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
          <CardTitle className="text-base">Regulatory Framework Registry</CardTitle>
          <CardDescription>Mapping of regulatory requirements to business processes with compliance status</CardDescription>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="font-semibold text-xs uppercase">Process</TableHead>
              <TableHead className="font-semibold text-xs uppercase">Regulation</TableHead>
              <TableHead className="font-semibold text-xs uppercase">Authority</TableHead>
              <TableHead className="font-semibold text-xs uppercase">Description</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allRegs.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No regulations linked yet.</TableCell></TableRow>
            ) : (
              allRegs.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-sm">{r.processName}</TableCell>
                  <TableCell className="font-medium text-sm">{r.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.authority}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs">{r.description}</TableCell>
                  <TableCell className="text-center">
                    <Badge className={`text-[10px] border-0 ${r.complianceStatus === 'compliant' ? 'bg-primary/15 text-primary' : r.complianceStatus === 'partial' ? 'bg-yellow-500/15 text-yellow-600' : 'bg-destructive/15 text-destructive'}`}>{r.complianceStatus}</Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
