import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Sparkles, ScanText, Loader2, Check, AlertCircle, ArrowLeft, Image, Eye, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { extractWithOCR } from '@/lib/ocr-extract';
import { saveDiagram } from '@/lib/store';
import type { EPCDiagram, EPCNode, EPCConnection } from '@/types/epc';

interface ExtractionData {
  processId: string;
  processName: string;
  nodes: EPCNode[];
  connections: EPCConnection[];
}

const NODE_TYPE_COLORS: Record<string, string> = {
  'in-scope': 'bg-emerald-100 text-emerald-800 border-emerald-300',
  'interface': 'bg-slate-100 text-slate-800 border-slate-300',
  'event': 'bg-pink-100 text-pink-800 border-pink-300',
  'xor': 'bg-sky-100 text-sky-800 border-sky-300',
};

export default function UploadExtract() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [method, setMethod] = useState<'ai' | 'ocr' | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractionData | null>(null);

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

  const handleSaveAndView = () => {
    if (!extractedData) return;
    const diagram: EPCDiagram = {
      id: crypto.randomUUID(),
      processId: extractedData.processId || 'PROCESS-001',
      processName: extractedData.processName || 'Extracted Process',
      nodes: extractedData.nodes.map((n) => ({ ...n, description: n.description || '' })),
      connections: extractedData.connections.map((c) => ({ ...c, id: c.id || crypto.randomUUID() })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveDiagram(diagram);
    toast({ title: 'Diagram saved!', description: `${diagram.nodes.length} nodes, ${diagram.connections.length} connections.` });
    navigate(`/view/${diagram.id}`);
  };

  const handleExtractAI = async () => {
    if (!imagePreview) return;
    setLoading(true);
    setMethod('ai');
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
    setMethod('ocr');
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
                    onClick={() => { setImagePreview(null); setSelectedFile(null); setProgress(''); setExtractedData(null); }}
                  >
                    <Image className="mr-1 h-3.5 w-3.5" /> Change
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Extraction methods */}
        {imagePreview && !extractedData && (
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
                  <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500 shrink-0" /> Detects XOR gateways & decision labels</li>
                  <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500 shrink-0" /> Understands arrow directions & Yes/No branches</li>
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
        {progress && !extractedData && (
          <Card className="border-primary/20">
            <CardContent className="p-4 flex items-center gap-3">
              {loading && <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />}
              <span className="text-sm text-foreground">{progress}</span>
            </CardContent>
          </Card>
        )}

        {/* Extraction Results Preview */}
        {extractedData && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground">Extraction Results</h2>
                <p className="text-xs text-muted-foreground">
                  {extractedData.processId && <span className="font-mono mr-2">{extractedData.processId}</span>}
                  {extractedData.nodes.length} nodes · {extractedData.connections.length} connections
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setExtractedData(null)}>
                  Re-extract
                </Button>
                <Button size="sm" onClick={handleSaveAndView}>
                  <Eye className="mr-2 h-3.5 w-3.5" /> View Diagram
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Nodes Table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Nodes ({extractedData.nodes.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium text-muted-foreground">ID</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Label</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {extractedData.nodes.map((node, i) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="p-3 font-mono text-xs">{node.id}</td>
                          <td className="p-3">{node.label}</td>
                          <td className="p-3">
                            <Badge variant="outline" className={`text-xs ${NODE_TYPE_COLORS[node.type] || ''}`}>
                              {node.type}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Connections Table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Connections ({extractedData.connections.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium text-muted-foreground">Source</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">→</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Target</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Label</th>
                      </tr>
                    </thead>
                    <tbody>
                      {extractedData.connections.map((conn, i) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="p-3 font-mono text-xs">{conn.source}</td>
                          <td className="p-3 text-muted-foreground">→</td>
                          <td className="p-3 font-mono text-xs">{conn.target}</td>
                          <td className="p-3">{conn.label || <span className="text-muted-foreground">—</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Bottom action */}
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
