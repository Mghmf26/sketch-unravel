import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Cpu, Network, Layers, Eye, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { fetchProcesses, fetchSteps, type BusinessProcess, type ProcessStep } from '@/lib/api';
import { fetchMainframeFlows, upsertMainframeFlow, type MainframeFlow } from '@/lib/api-mainframe-flows';
import { toast } from '@/hooks/use-toast';

export default function MainframeFlowHub() {
  const navigate = useNavigate();
  const [processes, setProcesses] = useState<BusinessProcess[]>([]);
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [flows, setFlows] = useState<MainframeFlow[]>([]);
  const [expandedProcesses, setExpandedProcesses] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    const [p, s, f] = await Promise.all([fetchProcesses(), fetchSteps(), fetchMainframeFlows()]);
    setProcesses(p);
    setSteps(s.filter(st => st.type === 'in-scope'));
    setFlows(f);
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  const toggleProcess = (id: string) => {
    setExpandedProcesses(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const createFlow = async (processId: string, stepId: string) => {
    try {
      const flow = await upsertMainframeFlow({ process_id: processId, step_id: stepId });
      toast({ title: 'Mainframe Flow created' });
      navigate(`/process-view/${processId}?tab=mainframe-flows&stepId=${stepId}&flowId=${flow.id}`);
    } catch (err) {
      console.error(err);
      toast({ title: 'Failed', variant: 'destructive' });
    }
  };

  const totalFlows = flows.length;
  const stepsWithFlows = new Set(flows.map(f => f.step_id)).size;

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Mainframe Flows</h1>
          <p className="text-sm text-muted-foreground mt-1">Business Process → Step → Mainframe Flow mapping</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { title: 'BUSINESS PROCESSES', value: processes.length, icon: Network },
          { title: 'MAINFRAME FLOWS', value: totalFlows, icon: Cpu },
          { title: 'STEPS WITH FLOWS', value: stepsWithFlows, icon: Layers },
        ].map(s => (
          <Card key={s.title} className="border border-dashed border-primary/40 bg-card">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-2xl font-bold text-primary">{s.value}</p>
                <p className="text-[10px] text-muted-foreground font-semibold tracking-widest uppercase">{s.title}</p>
              </div>
              <s.icon className="h-6 w-6 text-primary/60" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-sm overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">Business Process → Steps → Mainframe Flows</CardTitle>
          <CardDescription>Expand a business process to see its steps and linked mainframe flows</CardDescription>
        </CardHeader>
        {loading ? (
          <CardContent><p className="text-sm text-muted-foreground">Loading...</p></CardContent>
        ) : processes.length === 0 ? (
          <CardContent className="py-12 text-center text-muted-foreground">No business processes found.</CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="font-semibold text-xs uppercase w-8"></TableHead>
                <TableHead className="font-semibold text-xs uppercase">Name</TableHead>
                <TableHead className="font-semibold text-xs uppercase text-center">Steps</TableHead>
                <TableHead className="font-semibold text-xs uppercase text-center">MF Flows</TableHead>
                <TableHead className="font-semibold text-xs uppercase text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processes.map(p => {
                const pSteps = steps.filter(s => s.process_id === p.id);
                const pFlows = flows.filter(f => f.process_id === p.id);
                const isExpanded = expandedProcesses.has(p.id);

                return (
                  <> 
                    <TableRow key={p.id} className="cursor-pointer hover:bg-muted/30" onClick={() => toggleProcess(p.id)}>
                      <TableCell className="w-8">
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </TableCell>
                      <TableCell className="font-medium">{p.process_name}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-[10px]">{pSteps.length}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="text-[10px] bg-primary/15 text-primary border-0">{pFlows.length}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); navigate(`/process-view/${p.id}?tab=mainframe-flows`); }}>
                          <Eye className="h-3.5 w-3.5 mr-1" /> View
                        </Button>
                      </TableCell>
                    </TableRow>
                    {isExpanded && pSteps.map(step => {
                      const stepFlows = pFlows.filter(f => f.step_id === step.id);
                      return (
                        <TableRow key={step.id} className="bg-muted/10">
                          <TableCell></TableCell>
                          <TableCell className="pl-10">
                            <div className="flex items-center gap-2">
                              <Badge className="text-[9px] bg-emerald-500/15 text-emerald-700 border-0">Step</Badge>
                              <span className="text-sm">{step.label}</span>
                            </div>
                          </TableCell>
                          <TableCell></TableCell>
                          <TableCell className="text-center">
                            {stepFlows.length > 0 ? (
                              <div className="flex flex-col gap-1 items-center">
                                {stepFlows.map(f => (
                                  <button key={f.id} onClick={() => navigate(`/process-view/${p.id}?tab=mainframe-flows&stepId=${step.id}&flowId=${f.id}`)}
                                    className="text-xs text-primary hover:underline cursor-pointer">{f.name}</button>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              {stepFlows.length > 0 && (
                                <Button size="sm" variant="ghost" onClick={() => navigate(`/process-view/${p.id}?tab=mainframe-flows&stepId=${step.id}&flowId=${stepFlows[0].id}`)}>
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button size="sm" variant="outline" onClick={() => createFlow(p.id, step.id)}>
                                <Plus className="h-3.5 w-3.5 mr-1" /> New
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
