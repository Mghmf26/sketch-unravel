import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Image as ImageIcon, LayoutGrid, Share2, Upload, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import DiagramCanvasEditor from '@/components/DiagramCanvasEditor';
import ProcessEditTab from '@/components/ProcessEditTab';
import {
  fetchProcesses, fetchSteps, fetchStepConnections,
  fetchRisks, fetchAllControls, fetchRegulations, fetchIncidents,
  fetchStepRaci,
  updateProcess, updateStep, insertStep,
  insertStepConnection,
  type BusinessProcess, type ProcessStep, type StepConnection,
  type Risk, type Control, type Regulation, type Incident, type StepRaci,
} from '@/lib/api';
import type { EPCNode, EPCConnection, NodeType } from '@/types/epc';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

type StatCategory = 'steps' | 'interfaces' | 'connections' | 'risks' | 'controls' | 'regulations' | 'incidents' | 'raci' | null;

const STAT_CONFIG: { key: StatCategory & string; label: string; color: string }[] = [
  { key: 'steps', label: 'Steps', color: 'bg-emerald-500' },
  { key: 'interfaces', label: 'Interfaces', color: 'bg-slate-400' },
  { key: 'connections', label: 'Connections', color: 'bg-foreground' },
  { key: 'risks', label: 'Risks', color: 'bg-orange-500' },
  { key: 'controls', label: 'Controls', color: 'bg-blue-500' },
  { key: 'regulations', label: 'Regulations', color: 'bg-violet-500' },
  { key: 'incidents', label: 'Incidents', color: 'bg-red-500' },
  { key: 'raci', label: 'RACI', color: 'bg-teal-500' },
];

export default function ProcessView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [process, setProcess] = useState<BusinessProcess | null>(null);
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [connections, setConnections] = useState<StepConnection[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [controls, setControls] = useState<Control[]>([]);
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [raci, setRaci] = useState<StepRaci[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [expandedStat, setExpandedStat] = useState<StatCategory>(null);

  const loadData = async () => {
    if (!id) return;
    try {
      const [allP, s, c, r, ctrl, reg, inc, raciData] = await Promise.all([
        fetchProcesses(), fetchSteps(id), fetchStepConnections(id),
        fetchRisks(id), fetchAllControls(), fetchRegulations(id), fetchIncidents(id),
        fetchStepRaci(id),
      ]);
      const p = allP.find(x => x.id === id);
      if (p) {
        setProcess(p); setSteps(s); setConnections(c);
        const riskIds = new Set(r.map(x => x.id));
        setRisks(r); setControls(ctrl.filter(x => riskIds.has(x.risk_id)));
        setRegulations(reg); setIncidents(inc); setRaci(raciData);
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'Error loading process', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [id]);

  // ... keep existing code (handleImageUpload, handleDiagramChange)
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

  const stepNodes = steps.filter(s => s.type === 'in-scope');
  const interfaceNodes = steps.filter(s => s.type === 'interface');
  const stepLabelMap = new Map(steps.map(s => [s.id, s.label]));

  const getStatCount = (key: string) => {
    switch (key) {
      case 'steps': return stepNodes.length;
      case 'interfaces': return interfaceNodes.length;
      case 'connections': return connections.length;
      case 'risks': return risks.length;
      case 'controls': return controls.length;
      case 'regulations': return regulations.length;
      case 'incidents': return incidents.length;
      case 'raci': return raci.length;
      default: return 0;
    }
  };

  const renderExpandedContent = () => {
    if (!expandedStat) return null;

    const tableClass = "w-full text-sm";
    const thClass = "text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b";
    const tdClass = "px-3 py-2 border-b border-muted/50";

    switch (expandedStat) {
      case 'steps':
        return (
          <table className={tableClass}>
            <thead><tr><th className={thClass}>#</th><th className={thClass}>Name</th><th className={thClass}>Description</th></tr></thead>
            <tbody>{stepNodes.map((s, i) => (
              <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                <td className={`${tdClass} text-muted-foreground`}>{i + 1}</td>
                <td className={`${tdClass} font-medium`}>{s.label}</td>
                <td className={`${tdClass} text-muted-foreground`}>{s.description || '—'}</td>
              </tr>
            ))}</tbody>
          </table>
        );
      case 'interfaces':
        return (
          <table className={tableClass}>
            <thead><tr><th className={thClass}>#</th><th className={thClass}>Name</th><th className={thClass}>Description</th></tr></thead>
            <tbody>{interfaceNodes.map((s, i) => (
              <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                <td className={`${tdClass} text-muted-foreground`}>{i + 1}</td>
                <td className={`${tdClass} font-medium`}>{s.label}</td>
                <td className={`${tdClass} text-muted-foreground`}>{s.description || '—'}</td>
              </tr>
            ))}</tbody>
          </table>
        );
      case 'connections':
        return (
          <table className={tableClass}>
            <thead><tr><th className={thClass}>#</th><th className={thClass}>From</th><th className={thClass}>To</th><th className={thClass}>Label</th></tr></thead>
            <tbody>{connections.map((c, i) => (
              <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                <td className={`${tdClass} text-muted-foreground`}>{i + 1}</td>
                <td className={`${tdClass} font-medium`}>{stepLabelMap.get(c.source_step_id) || c.source_step_id}</td>
                <td className={`${tdClass} font-medium`}>{stepLabelMap.get(c.target_step_id) || c.target_step_id}</td>
                <td className={`${tdClass} text-muted-foreground`}>{c.label || '—'}</td>
              </tr>
            ))}</tbody>
          </table>
        );
      case 'risks':
        return (
          <table className={tableClass}>
            <thead><tr><th className={thClass}>#</th><th className={thClass}>Step</th><th className={thClass}>Description</th><th className={thClass}>Likelihood</th><th className={thClass}>Impact</th></tr></thead>
            <tbody>{risks.map((r, i) => (
              <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                <td className={`${tdClass} text-muted-foreground`}>{i + 1}</td>
                <td className={`${tdClass} font-medium`}>{stepLabelMap.get(r.step_id) || '—'}</td>
                <td className={tdClass}>{r.description}</td>
                <td className={tdClass}><Badge variant="outline" className="text-[10px]">{r.likelihood}</Badge></td>
                <td className={tdClass}><Badge variant="outline" className="text-[10px]">{r.impact}</Badge></td>
              </tr>
            ))}</tbody>
          </table>
        );
      case 'controls':
        return (
          <table className={tableClass}>
            <thead><tr><th className={thClass}>#</th><th className={thClass}>Name</th><th className={thClass}>Description</th><th className={thClass}>Type</th><th className={thClass}>Effectiveness</th></tr></thead>
            <tbody>{controls.map((c, i) => (
              <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                <td className={`${tdClass} text-muted-foreground`}>{i + 1}</td>
                <td className={`${tdClass} font-medium`}>{c.name}</td>
                <td className={tdClass}>{c.description || '—'}</td>
                <td className={tdClass}><Badge variant="outline" className="text-[10px]">{c.type || '—'}</Badge></td>
                <td className={tdClass}><Badge variant="outline" className="text-[10px]">{c.effectiveness || '—'}</Badge></td>
              </tr>
            ))}</tbody>
          </table>
        );
      case 'regulations':
        return (
          <table className={tableClass}>
            <thead><tr><th className={thClass}>#</th><th className={thClass}>Step</th><th className={thClass}>Name</th><th className={thClass}>Authority</th><th className={thClass}>Status</th></tr></thead>
            <tbody>{regulations.map((r, i) => (
              <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                <td className={`${tdClass} text-muted-foreground`}>{i + 1}</td>
                <td className={`${tdClass} font-medium`}>{stepLabelMap.get(r.step_id) || '—'}</td>
                <td className={tdClass}>{r.name}</td>
                <td className={tdClass}>{r.authority || '—'}</td>
                <td className={tdClass}><Badge variant="outline" className="text-[10px]">{r.compliance_status || '—'}</Badge></td>
              </tr>
            ))}</tbody>
          </table>
        );
      case 'incidents':
        return (
          <table className={tableClass}>
            <thead><tr><th className={thClass}>#</th><th className={thClass}>Step</th><th className={thClass}>Title</th><th className={thClass}>Severity</th><th className={thClass}>Status</th></tr></thead>
            <tbody>{incidents.map((inc, i) => (
              <tr key={inc.id} className="hover:bg-muted/30 transition-colors">
                <td className={`${tdClass} text-muted-foreground`}>{i + 1}</td>
                <td className={`${tdClass} font-medium`}>{stepLabelMap.get(inc.step_id) || '—'}</td>
                <td className={tdClass}>{inc.title}</td>
                <td className={tdClass}><Badge variant="outline" className="text-[10px]">{inc.severity || '—'}</Badge></td>
                <td className={tdClass}><Badge variant="outline" className="text-[10px]">{inc.status || '—'}</Badge></td>
              </tr>
            ))}</tbody>
          </table>
        );
      case 'raci':
        return (
          <table className={tableClass}>
            <thead><tr><th className={thClass}>#</th><th className={thClass}>Step</th><th className={thClass}>Role</th><th className={thClass}>R</th><th className={thClass}>A</th><th className={thClass}>C</th><th className={thClass}>I</th></tr></thead>
            <tbody>{raci.map((r, i) => (
              <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                <td className={`${tdClass} text-muted-foreground`}>{i + 1}</td>
                <td className={`${tdClass} font-medium`}>{stepLabelMap.get(r.step_id) || '—'}</td>
                <td className={tdClass}>{r.role_name}</td>
                <td className={tdClass}>{r.responsible || '—'}</td>
                <td className={tdClass}>{r.accountable || '—'}</td>
                <td className={tdClass}>{r.consulted || '—'}</td>
                <td className={tdClass}>{r.informed || '—'}</td>
              </tr>
            ))}</tbody>
          </table>
        );
      default: return null;
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!process) return <div className="p-8">Process not found</div>;

  const epcNodes: EPCNode[] = steps.map(s => ({ id: s.id, label: s.label, type: s.type as NodeType, description: s.description || '' }));
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

      <Tabs defaultValue="image" className="space-y-4">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="image" className="gap-2"><ImageIcon className="h-4 w-4" /> Image View</TabsTrigger>
          <TabsTrigger value="edit" className="gap-2"><LayoutGrid className="h-4 w-4" /> Edit Data</TabsTrigger>
          <TabsTrigger value="diagram" className="gap-2"><Share2 className="h-4 w-4" /> Diagram Editor</TabsTrigger>
        </TabsList>

        {/* Stat badges row */}
        <div className="flex flex-wrap gap-2">
          {STAT_CONFIG.map(({ key, label, color }) => {
            const count = getStatCount(key);
            const isActive = expandedStat === key;
            return (
              <button
                key={key}
                onClick={() => setExpandedStat(isActive ? null : key as StatCategory)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all ${
                  isActive
                    ? 'bg-muted border-border shadow-sm'
                    : 'bg-background border-border/50 hover:bg-muted/50 hover:border-border'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                <span className="font-semibold text-foreground">{count}</span>
                <span className="text-muted-foreground">{label}</span>
                {isActive ? <ChevronUp className="h-3 w-3 text-muted-foreground ml-1" /> : <ChevronDown className="h-3 w-3 text-muted-foreground/50 ml-1" />}
              </button>
            );
          })}
        </div>

        {/* Expanded stat content */}
        {expandedStat && (
          <Card className="overflow-hidden animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
              <span className="text-sm font-semibold">{STAT_CONFIG.find(s => s.key === expandedStat)?.label} ({getStatCount(expandedStat)})</span>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setExpandedStat(null)}>Close</Button>
            </div>
            <ScrollArea className="max-h-[300px]">
              {renderExpandedContent()}
            </ScrollArea>
          </Card>
        )}

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
          <DiagramCanvasEditor nodes={epcNodes} connections={epcConns} risks={risks} controls={controls} regulations={regulations} incidents={incidents} onChange={handleDiagramChange} onDataChanged={loadData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}