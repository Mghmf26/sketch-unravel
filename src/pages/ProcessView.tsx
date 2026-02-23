import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Image as ImageIcon, LayoutGrid, Share2, Save, Plus, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import DiagramCanvasEditor from '@/components/DiagramCanvasEditor';
import {
  fetchProcesses, fetchSteps, fetchStepConnections,
  updateProcess, updateStep, insertStep, deleteStep,
  insertStepConnection, deleteStepConnection,
  type BusinessProcess, type ProcessStep, type StepConnection
} from '@/lib/api';
import type { EPCNode, EPCConnection, NodeType } from '@/types/epc';

export default function ProcessView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [process, setProcess] = useState<BusinessProcess | null>(null);
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [connections, setConnections] = useState<StepConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const loadData = async () => {
    if (!id) return;
    try {
      const [allP, s, c] = await Promise.all([
        fetchProcesses(),
        fetchSteps(id),
        fetchStepConnections(id)
      ]);
      const p = allP.find(x => x.id === id);
      if (p) {
        setProcess(p);
        setSteps(s);
        setConnections(c);
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'Error loading process', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [id]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id || !process) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('process-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('process-images')
        .getPublicUrl(filePath);

      await updateProcess(id, { image_url: publicUrl } as any);
      setProcess({ ...process, image_url: publicUrl } as any);
      toast({ title: 'Image updated' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  // Diagram Sync
  const handleDiagramChange = async (newNodes: EPCNode[], newConns: EPCConnection[]) => {
    if (!id) return;
    // This is a simplified sync logic for the demo
    // In a real app, you'd diff and update DB precisely
    toast({ title: 'Saving changes...' });
    try {
      // 1. Update/Add Steps
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
      // 2. Delete missing steps (optional, dangerous)
      
      // 3. Update Connections
      // Clear and re-insert for simplicity in this view
      await supabase.from('step_connections').delete().eq('process_id', id);
      for (const conn of newConns) {
        await insertStepConnection({
          process_id: id,
          source_step_id: conn.source,
          target_step_id: conn.target,
          label: conn.label || null
        });
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

  const epcNodes: EPCNode[] = steps.map(s => ({
    id: s.id,
    label: s.label,
    type: s.type as NodeType,
    description: s.description || ''
  }));

  const epcConns: EPCConnection[] = connections.map(c => ({
    id: c.id,
    source: c.source_step_id,
    target: c.target_step_id,
    label: c.label || undefined
  }));

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/process-details')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{process.process_name}</h1>
            <p className="text-sm text-muted-foreground">{process.description || 'Business Process'}</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="image" className="space-y-4">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="image" className="gap-2">
            <ImageIcon className="h-4 w-4" /> Image View
          </TabsTrigger>
          <TabsTrigger value="edit" className="gap-2">
            <LayoutGrid className="h-4 w-4" /> Edit Data
          </TabsTrigger>
          <TabsTrigger value="diagram" className="gap-2">
            <Share2 className="h-4 w-4" /> Diagram Editor
          </TabsTrigger>
        </TabsList>

        <TabsContent value="image" className="mt-0">
          <Card className="overflow-hidden border-2 border-dashed border-muted">
            <CardContent className="p-0 min-h-[400px] flex flex-col items-center justify-center bg-muted/10">
              {(process as any).image_url ? (
                <div className="relative group w-full h-full">
                  <img 
                    src={(process as any).image_url} 
                    alt="Process Diagram" 
                    className="w-full h-auto max-h-[70vh] object-contain shadow-sm"
                  />
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <label className="cursor-pointer">
                      <Button variant="secondary" size="sm" asChild>
                        <span><Upload className="h-4 w-4 mr-2" /> Replace</span>
                      </Button>
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
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-1">
                      Upload the original diagram image for reference.
                    </p>
                  </div>
                  <label className="cursor-pointer block">
                    <Button variant="outline" asChild disabled={uploading}>
                      <span>{uploading ? 'Uploading...' : 'Upload Image'}</span>
                    </Button>
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                  </label>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="edit" className="mt-0 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Process Steps</CardTitle>
                  <Button size="sm" variant="ghost" onClick={() => insertStep({ process_id: id!, label: 'New Step', type: 'in-scope' }).then(loadData)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Step
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y max-h-[500px] overflow-y-auto">
                  {steps.map(step => (
                    <div key={step.id} className="p-3 flex items-center gap-3 group hover:bg-muted/30">
                      <Input 
                        value={step.label} 
                        onChange={(e) => updateStep(step.id, { label: e.target.value }).then(loadData)}
                        className="h-8 text-sm flex-1 border-transparent hover:border-input focus:border-input bg-transparent"
                      />
                      <Select value={step.type} onValueChange={(v) => updateStep(step.id, { type: v }).then(loadData)}>
                        <SelectTrigger className="w-32 h-8 text-[10px] uppercase font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in-scope">Process Step</SelectItem>
                          <SelectItem value="interface">Interface</SelectItem>
                          <SelectItem value="event">Event</SelectItem>
                          <SelectItem value="xor">XOR</SelectItem>
                          <SelectItem value="start-end">Start/End</SelectItem>
                          <SelectItem value="decision">Decision</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteStep(step.id).then(loadData)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Step Connections</CardTitle>
                  <Button size="sm" variant="ghost" onClick={() => {
                    if (steps.length < 2) return;
                    insertStepConnection({ process_id: id!, source_step_id: steps[0].id, target_step_id: steps[1].id }).then(loadData);
                  }}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Connection
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y max-h-[500px] overflow-y-auto">
                  {connections.map(conn => (
                    <div key={conn.id} className="p-3 flex items-center gap-2 group hover:bg-muted/30">
                      <Select value={conn.source_step_id} onValueChange={(v) => supabase.from('step_connections').update({ source_step_id: v }).eq('id', conn.id).then(loadData)}>
                        <SelectTrigger className="h-8 text-[10px] flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {steps.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <span className="text-muted-foreground">→</span>
                      <Select value={conn.target_step_id} onValueChange={(v) => supabase.from('step_connections').update({ target_step_id: v }).eq('id', conn.id).then(loadData)}>
                        <SelectTrigger className="h-8 text-[10px] flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {steps.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteStepConnection(conn.id).then(loadData)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="diagram" className="mt-0">
          <DiagramCanvasEditor 
            nodes={epcNodes} 
            connections={epcConns} 
            onChange={handleDiagramChange}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
