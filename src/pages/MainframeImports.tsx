import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Database, Upload, FileText, HardDrive, Server, Table2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const sampleDataSources = [
  { name: 'DB2 Customer Master', type: 'DB2', records: '2.4M', status: 'Connected', lastSync: '2026-02-20' },
  { name: 'VSAM Payment Files', type: 'VSAM', records: '890K', status: 'Connected', lastSync: '2026-02-19' },
  { name: 'CICS Transaction Logs', type: 'Log', records: '5.1M', status: 'Pending', lastSync: '—' },
  { name: 'IMS Inventory Database', type: 'IMS', records: '1.2M', status: 'Connected', lastSync: '2026-02-18' },
  { name: 'MQ Message Queues', type: 'MQ', records: '340K', status: 'Disconnected', lastSync: '2026-02-10' },
];

export default function MainframeImports() {
  const navigate = useNavigate();

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Mainframe Imports</h1>
          <p className="text-sm text-muted-foreground mt-1">Connect and import data from mainframe systems — DB2, VSAM, IMS, CICS, MQ Series</p>
        </div>
      </div>

      {/* Concept cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { title: 'Data Sources', desc: 'DB2, VSAM, IMS databases and flat files', icon: Database, value: sampleDataSources.length },
          { title: 'Records Imported', desc: 'Total mainframe records processed', icon: HardDrive, value: '9.8M' },
          { title: 'Active Connections', desc: 'Live mainframe data feeds', icon: Server, value: sampleDataSources.filter(d => d.status === 'Connected').length },
        ].map((s) => (
          <Card key={s.title} className="border border-dashed border-primary/40 bg-card">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-2xl font-bold text-primary">{s.value}</p>
                <p className="text-[10px] text-muted-foreground font-semibold tracking-widest uppercase">{s.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
              </div>
              <s.icon className="h-6 w-6 text-primary/60" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Import Actions */}
      <div className="flex gap-3">
        <Button className="bg-primary hover:bg-primary/90"><Upload className="mr-2 h-4 w-4" /> Import Dataset</Button>
        <Button variant="outline"><FileText className="mr-2 h-4 w-4" /> Import JCL/Job Logs</Button>
      </div>

      {/* Data Sources Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">Mainframe Data Sources</CardTitle>
          <CardDescription>Connected mainframe systems and their data pipelines. Business processes depend on these datasets as their system of record.</CardDescription>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="font-semibold text-xs uppercase">Data Source</TableHead>
              <TableHead className="font-semibold text-xs uppercase">Type</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-center">Records</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-center">Status</TableHead>
              <TableHead className="font-semibold text-xs uppercase">Last Sync</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sampleDataSources.map((ds) => (
              <TableRow key={ds.name}>
                <TableCell className="font-medium text-sm">{ds.name}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px]">{ds.type}</Badge></TableCell>
                <TableCell className="text-center text-sm font-medium">{ds.records}</TableCell>
                <TableCell className="text-center">
                  <Badge className={`text-[10px] border-0 ${ds.status === 'Connected' ? 'bg-primary/15 text-primary' : ds.status === 'Pending' ? 'bg-yellow-500/15 text-yellow-600' : 'bg-destructive/15 text-destructive'}`}>{ds.status}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{ds.lastSync}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Info card */}
      <Card className="border bg-muted/20">
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-2">How Mainframe Data Connects to Business Processes</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Business processes sit on top of mainframe data. Each process step reads data (inputs), transforms it (processing), and writes data (outputs).
            The mainframe data is the evidence and fuel of each process. Risk scenarios materialize when mainframe data is compromised — 
            incorrect data leads to incorrect process results, unavailable data stops processes, exposed data causes breaches, and tampered data enables fraud.
          </p>
          <div className="mt-3 flex gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px]">Process → Application → Data Objects</Badge>
            <Badge variant="outline" className="text-[10px]">Access Paths → Controls → Risk Scenarios</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
