import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Image as ImageIcon, LayoutGrid, Share2, Upload, Grid3x3, Cpu, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import DiagramCanvasEditor from '@/components/DiagramCanvasEditor';
import ProcessEditTab from '@/components/ProcessEditTab';
import RiskMatrixEditor from '@/components/RiskMatrixEditor';
import MainframeFlowEditor from '@/components/MainframeFlowEditor';
import ProcessQuestionnaire from '@/components/ProcessQuestionnaire';
import {
  fetchProcesses, fetchSteps, fetchStepConnections,
  fetchRisks, fetchAllControls, fetchRegulations, fetchIncidents,
  updateProcess, updateStep, insertStep,
  insertStepConnection,
  type BusinessProcess, type ProcessStep, type StepConnection,
  type Risk, type Control, type Regulation, type Incident,
} from '@/lib/api';
import { fetchStepApplications, type StepApplication } from '@/lib/api-applications';
import type { EPCNode, EPCConnection, NodeType } from '@/types/epc';

export default function ProcessView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Determine default tab from URL
  const tabParam = searchParams.get('tab');
  const defaultTab = tabParam === 'edit' ? 'edit' 
    : tabParam === 'mainframe-flows' ? 'mainframe-flows'
    : tabParam === 'diagram' ? 'diagram'
    : tabParam === 'risk-matrix' ? 'risk-matrix'
    : 'image';

  const initialStepId = searchParams.get('stepId') || undefined;
  const initialFlowId = searchParams.get('flowId') || undefined;

  const [process, setProcess] = useState<BusinessProcess | null>(null);
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [connections, setConnections] = useState<StepConnection[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [controls, setControls] = useState<Control[]>([]);
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [applications, setApplications] = useState<StepApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const loadData = async () => {
    if (!id) return;
    try {
      const [allP, s, c, r, ctrl, reg, inc, apps] = await Promise.all([
        fetchProcesses(), fetchSteps(id), fetchStepConnections(id),
        fetchRisks(id), fetchAllControls(), fetchRegulations(id), fetchIncidents(id),
        fetchStepApplications(id),
      ]);
      const p = allP.find(x => x.id === id);
      if (p) {
        setProcess(p); setSteps(s); setConnections(c);
        const riskIds = new Set(r.map(x => x.id));
        setRisks(r); setControls(ctrl.filter(x => riskIds.has(x.risk_id)));
        setRegulations(reg); setIncidents(inc); setApplications(apps);
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'Error loading process', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [id]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id || !process) return;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${id}/${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('process-images').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('process-images').getPublicUrl(filePath);
      await updateProcess(id, { image_url: publicUrl } as any);
      setProcess({ ...process, image_url: publicUrl } as any);
      toast({ title: 'Image updated' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally { setUploading(false); }
  };

  const handleDiagramChange = async (newNodes: EPCNode[], newConns: EPCConnection[]) => {
    if (!id) return;
    toast({ title: 'Saving changes...' });
    try {
      for (const node of newNodes) {
        const existing = steps.find(s => s.id === node.id);
        if (existing) {
          if (existing.label !== node.label || existing.type !== node.type) {
            await updateStep(node.id, { label: node.label, type: node.type });
          }
        } else {
          await insertStep({ id: node.id, process_id: id, label: node.label, type: node.type });
        }
      }
      await supabase.from('step_connections').delete().eq('process_id', id);
      for (const conn of newConns) {
        await insertStepConnection({ process_id: id, source_step_id: conn.source, target_step_id: conn.target, label: conn.label || null });
      }
      loadData();
      toast({ title: 'Diagram saved' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Save failed', variant: 'destructive' });
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!process) return <div className="p-8">Process not found</div>;

  const epcNodes: EPCNode[] = steps.map(s => ({ id: s.id, label: s.label, type: s.type as NodeType, description: s.description || '', interfaceSubtype: (s as any).interface_subtype || undefined, stepType: (s as any).step_type || null }));
  const epcConns: EPCConnection[] = connections.map(c => ({ id: c.id, source: c.source_step_id, target: c.target_step_id, label: c.label || undefined }));

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/process-details')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{process.process_name}</h1>
          <p className="text-sm text-muted-foreground">{process.description || 'Business Process'}</p>
        </div>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="image" className="gap-2"><ImageIcon className="h-4 w-4" /> Image View</TabsTrigger>
          <TabsTrigger value="edit" className="gap-2"><LayoutGrid className="h-4 w-4" /> Edit Data</TabsTrigger>
          <TabsTrigger value="diagram" className="gap-2"><Share2 className="h-4 w-4" /> Business Process Flows</TabsTrigger>
          <TabsTrigger value="mainframe-flows" className="gap-2"><Cpu className="h-4 w-4" /> Mainframe Flows</TabsTrigger>
          <TabsTrigger value="risk-matrix" className="gap-2"><Grid3x3 className="h-4 w-4" /> Risk Matrix</TabsTrigger>
        </TabsList>

        <TabsContent value="image" className="mt-0">
          <Card className="overflow-hidden border-2 border-dashed border-muted">
            <CardContent className="p-0 min-h-[400px] flex flex-col items-center justify-center bg-muted/10">
              {(process as any).image_url ? (
                <div className="relative group w-full h-full">
                  <img src={(process as any).image_url} alt="Process Diagram" className="w-full h-auto max-h-[70vh] object-contain shadow-sm" />
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <label className="cursor-pointer">
                      <Button variant="secondary" size="sm" asChild><span><Upload className="h-4 w-4 mr-2" /> Replace</span></Button>
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="text-center p-12 space-y-4">
                  <div className="bg-muted rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-medium">No process image uploaded</h3>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-1">Upload the original diagram image for reference.</p>
                  </div>
                  <label className="cursor-pointer block">
                    <Button variant="outline" asChild disabled={uploading}><span>{uploading ? 'Uploading...' : 'Upload Image'}</span></Button>
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                  </label>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="edit" className="mt-0">
          <ProcessEditTab processId={id!} />
        </TabsContent>

        <TabsContent value="diagram" className="mt-0">
          <DiagramCanvasEditor nodes={epcNodes} connections={epcConns} risks={risks} controls={controls} regulations={regulations} incidents={incidents} applications={applications} processId={id} onChange={handleDiagramChange} onDataChanged={loadData} />
        </TabsContent>

        <TabsContent value="mainframe-flows" className="mt-0">
          <MainframeFlowEditor processId={id!} initialStepId={initialStepId} initialFlowId={initialFlowId} />
        </TabsContent>

        <TabsContent value="risk-matrix" className="mt-0">
          <RiskMatrixEditor processId={id!} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
