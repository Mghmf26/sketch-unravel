import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Sparkles, ScanText, Loader2, Check, AlertCircle, ArrowLeft, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { extractWithOCR } from '@/lib/ocr-extract';
import { saveDiagram } from '@/lib/store';
import type { EPCDiagram } from '@/types/epc';

export default function UploadExtract() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [method, setMethod] = useState<'ai' | 'ocr' | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please upload an image file.', variant: 'destructive' });
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const finalizeDiagram = (data: { processId: string; processName: string; nodes: any[]; connections: any[] }) => {
    const diagram: EPCDiagram = {
      id: crypto.randomUUID(),
      processId: data.processId || 'PROCESS-001',
      processName: data.processName || 'Extracted Process',
      nodes: (data.nodes || []).map((n: any) => ({ ...n, description: n.description || '' })),
      connections: (data.connections || []).map((c: any) => ({ ...c, id: c.id || crypto.randomUUID() })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveDiagram(diagram);
    toast({ title: 'Extraction complete!', description: `${diagram.nodes.length} nodes, ${diagram.connections.length} connections extracted.` });
    // Navigate to the diagram viewer to show the regenerated diagram
    setTimeout(() => navigate(`/view/${diagram.id}`), 400);
  };

  const handleExtractAI = async () => {
    if (!imagePreview) return;
    setLoading(true);
    setMethod('ai');
    setProgress('Sending image to AI for analysis...');

    try {
      const { data, error } = await supabase.functions.invoke('extract-diagram', {
        body: { imageBase64: imagePreview },
      });
      if (error) throw new Error(error.message || 'AI extraction failed');
      setProgress('Building diagram...');
      finalizeDiagram(data);
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
    setMethod('ocr');

    try {
      const result = await extractWithOCR(selectedFile, setProgress);
      setProgress('Building diagram...');
      finalizeDiagram(result);
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
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="max-w-4xl mx-auto flex items-center gap-3 px-6 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Upload & Extract Diagram</h1>
            <p className="text-xs text-muted-foreground">Upload an EPC diagram image and extract nodes, connections, and relationships</p>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Upload area */}
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
                  <Button
                    variant="secondary"
                    size="sm"
                    className="shadow-md"
                    onClick={() => { setImagePreview(null); setSelectedFile(null); setProgress(''); }}
                  >
                    <Image className="mr-1 h-3.5 w-3.5" /> Change
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Extraction methods */}
        {imagePreview && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* AI Method */}
            <Card className={`transition-all ${method === 'ai' && loading ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'}`}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  AI Vision Extraction
                </CardTitle>
                <CardDescription className="text-xs">
                  AI analyzes shapes, colors, text, arrows and extracts everything with high accuracy.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="text-xs text-muted-foreground space-y-1.5 mb-4">
                  <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500 shrink-0" /> Accurate node type & shape detection</li>
                  <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500 shrink-0" /> Extracts all connections & labels</li>
                  <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500 shrink-0" /> Understands arrow directions & flow</li>
                  <li className="flex items-center gap-1.5"><AlertCircle className="h-3 w-3 text-amber-500 shrink-0" /> Uses AI credits (minimal cost)</li>
                </ul>
                <Button onClick={handleExtractAI} disabled={loading} className="w-full">
                  {loading && method === 'ai' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Extract with AI
                </Button>
              </CardContent>
            </Card>

            {/* OCR + Shape Detection Method */}
            <Card className={`transition-all ${method === 'ocr' && loading ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'}`}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ScanText className="h-4 w-4 text-primary" />
                  </div>
                  OCR + Shape Detection
                </CardTitle>
                <CardDescription className="text-xs">
                  Browser-based OCR for text, canvas pixel analysis for colors, shapes, and line tracing for arrows.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="text-xs text-muted-foreground space-y-1.5 mb-4">
                  <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500 shrink-0" /> 100% free, runs in browser</li>
                  <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500 shrink-0" /> Shape & color region detection</li>
                  <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500 shrink-0" /> Arrow/line tracing for connections</li>
                  <li className="flex items-center gap-1.5"><AlertCircle className="h-3 w-3 text-amber-500 shrink-0" /> May need manual adjustments</li>
                </ul>
                <Button onClick={handleExtractOCR} disabled={loading} variant="outline" className="w-full">
                  {loading && method === 'ocr' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanText className="mr-2 h-4 w-4" />}
                  Extract with OCR
                </Button>
              </CardContent>
            </Card>
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
      </div>
    </div>
  );
}
