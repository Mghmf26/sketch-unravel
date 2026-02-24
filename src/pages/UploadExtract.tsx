import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Sparkles, ScanText, Loader2, Check, AlertCircle, ArrowLeft, Image, Eye, ChevronRight, Table2, LayoutGrid, PenLine } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { extractWithOCR } from '@/lib/ocr-extract';
import { insertProcess, insertStep, fetchClients, type Client } from '@/lib/api';
import ExtractionResultsEditor from '@/components/ExtractionResultsEditor';
import DiagramCanvasEditor from '@/components/DiagramCanvasEditor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { EPCNode, EPCConnection } from '@/types/epc';
import { useEffect } from 'react';

interface ExtractionData {
  processId: string;
  processName: string;
  nodes: EPCNode[];
  connections: EPCConnection[];
}

type MethodChoice = 'ai' | 'ocr' | 'manual' | null;

export default function UploadExtract() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [methodChoice, setMethodChoice] = useState<MethodChoice>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [extractedData, setExtractedData] = useState<ExtractionData | null>(null);
  const [clients, setClients] = useState<Client[]>([]);

  // Manual build form state
  const [manualName, setManualName] = useState('');
  const [manualClient, setManualClient] = useState('');
  const [manualOwner, setManualOwner] = useState('');
  const [manualDept, setManualDept] = useState('');
  const [manualDesc, setManualDesc] = useState('');

  useEffect(() => {
    fetchClients().then(setClients);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please upload an image file.', variant: 'destructive' });
      return;
    }
    setSelectedFile(file);
    setExtractedData(null);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveAndView = async () => {
    if (!extractedData) return;
    setLoading(true);
    try {
      // 0. Upload the source image to storage if available
      let imageUrl: string | null = null;
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const filePath = `upload-${Date.now()}/${Math.random().toString(36).slice(2)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('process-images').upload(filePath, selectedFile);
        if (uploadError) console.error('Image upload failed:', uploadError);
        else {
          const { data: { publicUrl } } = supabase.storage.from('process-images').getPublicUrl(filePath);
          imageUrl = publicUrl;
        }
      }

      // 1. Create the business process in the DB
      const process = await insertProcess({
        process_name: extractedData.processName || 'Extracted Process',
        ...(imageUrl ? { image_url: imageUrl } : {}),
      } as any);

      // 2. Insert each node as a process_step
      const stepIdMap: Record<string, string> = {};
      for (let i = 0; i < extractedData.nodes.length; i++) {
        const n = extractedData.nodes[i];
        const step = await insertStep({
          process_id: process.id,
          label: n.label,
          type: n.type,
          description: n.description || null,
          position_index: i,
        });
        stepIdMap[n.id] = step.id;
      }

      // 3. Insert connections as step_connections
      for (const c of extractedData.connections) {
        const sourceId = stepIdMap[c.source];
        const targetId = stepIdMap[c.target];
        if (sourceId && targetId) {
          await supabase.from('step_connections').insert({
            process_id: process.id,
            source_step_id: sourceId,
            target_step_id: targetId,
            label: c.label || null,
          });
        }
      }

      toast({ title: 'Process saved!', description: `${extractedData.nodes.length} steps, ${extractedData.connections.length} connections.` });
      navigate(`/process-view/${process.id}`);
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleExtractAI = async () => {
    if (!imagePreview) return;
    setLoading(true);
    setExtractedData(null);
    setProgress('Sending image to AI for analysis...');
    try {
      const { data, error } = await supabase.functions.invoke('extract-diagram', {
        body: { imageBase64: imagePreview },
      });
      if (error) throw new Error(error.message || 'AI extraction failed');
      setProgress('Extraction complete!');
      setExtractedData({
        processId: data.processId || '',
        processName: data.processName || '',
        nodes: (data.nodes || []).map((n: any) => ({ ...n, description: '' })),
        connections: (data.connections || []).map((c: any) => ({ ...c, id: c.id || crypto.randomUUID() })),
      });
    } catch (err: any) {
      console.error(err);
      setProgress('');
      toast({ title: 'Extraction failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleExtractOCR = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setExtractedData(null);
    try {
      const result = await extractWithOCR(selectedFile, setProgress);
      setProgress('Extraction complete!');
      setExtractedData(result);
    } catch (err: any) {
      console.error(err);
      setProgress('');
      toast({ title: 'OCR extraction failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setSelectedFile(file);
    setExtractedData(null);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleMethodSelect = (m: MethodChoice) => {
    if (m === 'manual') {
      navigate('/data-entry');
      return;
    }
    setMethodChoice(m);
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="max-w-4xl mx-auto flex items-center gap-3 px-6 py-3">
          <Button variant="ghost" size="icon" onClick={() => methodChoice ? setMethodChoice(null) : navigate('/processes')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-foreground">
              {!methodChoice ? 'Add New Business Process' : 'Upload & Extract Diagram'}
            </h1>
            <p className="text-xs text-muted-foreground">
              {!methodChoice
                ? 'Choose how you want to create your business process'
                : methodChoice === 'ai'
                  ? 'Upload a diagram image for AI-powered extraction'
                  : 'Upload a diagram image for OCR-based extraction'}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Step 1: Method selection */}
        {!methodChoice && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* AI Vision */}
            <Card className="hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer group" onClick={() => handleMethodSelect('ai')}>
              <CardHeader className="pb-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-base">AI Vision Extraction</CardTitle>
                <CardDescription className="text-xs">
                  Upload a diagram image and let AI analyze shapes, text, arrows & connections automatically.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="text-xs text-muted-foreground space-y-1.5">
                  <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500 shrink-0" /> Highest accuracy</li>
                  <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500 shrink-0" /> Detects all node types & branches</li>
                  <li className="flex items-center gap-1.5"><AlertCircle className="h-3 w-3 text-amber-500 shrink-0" /> Uses AI credits</li>
                </ul>
              </CardContent>
            </Card>

            {/* OCR + Shape */}
            <Card className="hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer group" onClick={() => handleMethodSelect('ocr')}>
              <CardHeader className="pb-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                  <ScanText className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-base">OCR + Shape Detection</CardTitle>
                <CardDescription className="text-xs">
                  Browser-based OCR & pixel analysis — free but may need manual adjustments.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="text-xs text-muted-foreground space-y-1.5">
                  <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500 shrink-0" /> 100% free, runs locally</li>
                  <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500 shrink-0" /> Shape & color detection</li>
                  <li className="flex items-center gap-1.5"><AlertCircle className="h-3 w-3 text-amber-500 shrink-0" /> May need edits after</li>
                </ul>
              </CardContent>
            </Card>

            {/* Manual */}
            <Card className="hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer group" onClick={() => handleMethodSelect('manual')}>
              <CardHeader className="pb-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                  <PenLine className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-base">Build Manually</CardTitle>
                <CardDescription className="text-xs">
                  Create a process from scratch using the form editor — add nodes, connections & details by hand.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="text-xs text-muted-foreground space-y-1.5">
                  <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500 shrink-0" /> Full control over structure</li>
                  <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500 shrink-0" /> No image needed</li>
                  <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500 shrink-0" /> Add any node type</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Image upload (for AI or OCR) */}
        {methodChoice && !extractedData && (
          <>
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                {!imagePreview ? (
                  <div
                    className="border-2 border-dashed border-border rounded-xl m-4 p-12 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all"
                    onClick={() => fileRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                  >
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Upload className="h-8 w-8 text-primary" />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground mb-1">Drop your diagram image here</h2>
                    <p className="text-sm text-muted-foreground">or click to browse — supports PNG, JPG, WEBP</p>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="bg-muted/40 p-4">
                      <img src={imagePreview} alt="Uploaded diagram" className="w-full max-h-[350px] object-contain rounded-lg" />
                    </div>
                    <div className="absolute top-3 right-3 flex gap-2">
                      <Button variant="secondary" size="sm" className="shadow-md"
                        onClick={() => { setImagePreview(null); setSelectedFile(null); setProgress(''); setExtractedData(null); }}>
                        <Image className="mr-1 h-3.5 w-3.5" /> Change
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Extract button */}
            {imagePreview && (
              <div className="flex justify-center">
                {methodChoice === 'ai' ? (
                  <Button onClick={handleExtractAI} disabled={loading} size="lg" className="shadow-md">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Extract with AI Vision
                  </Button>
                ) : (
                  <Button onClick={handleExtractOCR} disabled={loading} size="lg" variant="outline" className="shadow-md">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanText className="mr-2 h-4 w-4" />}
                    Extract with OCR
                  </Button>
                )}
              </div>
            )}

            {/* Progress */}
            {progress && (
              <Card className="border-primary/20">
                <CardContent className="p-4 flex items-center gap-3">
                  {loading && <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />}
                  <span className="text-sm text-foreground">{progress}</span>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Extraction Results Preview */}
        {extractedData && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground">Extraction Results</h2>
                <p className="text-xs text-muted-foreground">
                  {extractedData.nodes.length} nodes · {extractedData.connections.length} connections — edit before saving
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setExtractedData(null)}>Re-extract</Button>
                <Button size="sm" onClick={handleSaveAndView}>
                  <Eye className="mr-2 h-3.5 w-3.5" /> Save & View
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Process Name Input */}
            <Card>
              <CardContent className="p-4">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Process Name *</label>
                <Input
                  value={extractedData.processName}
                  onChange={(e) => setExtractedData({ ...extractedData, processName: e.target.value })}
                  placeholder="Enter a name for this process..."
                  className="text-base font-medium"
                />
              </CardContent>
            </Card>

            <Tabs defaultValue="canvas">
              <TabsList className="mb-3">
                <TabsTrigger value="canvas" className="gap-1.5">
                  <LayoutGrid className="h-3.5 w-3.5" /> Canvas
                </TabsTrigger>
                <TabsTrigger value="table" className="gap-1.5">
                  <Table2 className="h-3.5 w-3.5" /> Table
                </TabsTrigger>
              </TabsList>
              <TabsContent value="canvas">
                <DiagramCanvasEditor
                  nodes={extractedData.nodes}
                  connections={extractedData.connections}
                  onChange={(nodes, connections) => setExtractedData({ ...extractedData, nodes, connections })}
                />
              </TabsContent>
              <TabsContent value="table">
                <ExtractionResultsEditor
                  nodes={extractedData.nodes}
                  connections={extractedData.connections}
                  processId={extractedData.processId}
                  processName={extractedData.processName}
                  onUpdate={(updated) => setExtractedData(updated)}
                />
              </TabsContent>
            </Tabs>

            <div className="flex justify-end">
              <Button onClick={handleSaveAndView} size="lg">
                <Eye className="mr-2 h-4 w-4" /> Save & View Diagram
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
