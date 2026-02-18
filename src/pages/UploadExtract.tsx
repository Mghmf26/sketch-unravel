import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Sparkles, ScanText, Loader2, Check, AlertCircle } from 'lucide-react';
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
      setProgress('Extraction complete!');
      toast({ title: 'Success!', description: `Extracted ${diagram.nodes.length} nodes and ${diagram.connections.length} connections.` });
      
      setTimeout(() => navigate(`/edit/${diagram.id}`), 500);
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

      const diagram: EPCDiagram = {
        id: crypto.randomUUID(),
        processId: result.processId,
        processName: result.processName,
        nodes: result.nodes,
        connections: result.connections,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      saveDiagram(diagram);
      toast({ title: 'OCR Extraction complete!', description: `Found ${diagram.nodes.length} nodes. Please review and adjust connections manually.` });
      
      setTimeout(() => navigate(`/edit/${diagram.id}`), 500);
    } catch (err: any) {
      console.error(err);
      setProgress('');
      toast({ title: 'OCR extraction failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Upload & Extract Diagram</h1>
        <p className="text-sm text-muted-foreground">Upload an EPC diagram image and extract all nodes, connections, and relationships automatically</p>
      </div>

      {/* Upload area */}
      <Card>
        <CardContent className="p-6">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          
          {!imagePreview ? (
            <div
              className="border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground mb-1">Drop your diagram image here</h2>
              <p className="text-sm text-muted-foreground">or click to browse — supports PNG, JPG, WEBP</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-lg overflow-hidden border bg-muted/20">
                <img src={imagePreview} alt="Uploaded diagram" className="w-full max-h-[400px] object-contain" />
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => { setImagePreview(null); setSelectedFile(null); setProgress(''); }}
                >
                  Change Image
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
          <Card className={`cursor-pointer transition-all ${method === 'ai' && loading ? 'ring-2 ring-primary' : 'hover:shadow-md'}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Vision Extraction
              </CardTitle>
              <CardDescription>
                Uses AI to analyze the image and extract all nodes, types, connections, and labels with high accuracy. Powered by Lovable Cloud.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-xs text-muted-foreground space-y-1 mb-4">
                <li className="flex items-center gap-1"><Check className="h-3 w-3 text-emerald-500" /> Accurate node type detection</li>
                <li className="flex items-center gap-1"><Check className="h-3 w-3 text-emerald-500" /> Extracts all connections & labels</li>
                <li className="flex items-center gap-1"><Check className="h-3 w-3 text-emerald-500" /> Understands arrow directions</li>
                <li className="flex items-center gap-1"><AlertCircle className="h-3 w-3 text-amber-500" /> Uses AI credits (minimal cost)</li>
              </ul>
              <Button onClick={handleExtractAI} disabled={loading} className="w-full">
                {loading && method === 'ai' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Extract with AI
              </Button>
            </CardContent>
          </Card>

          {/* OCR Method */}
          <Card className={`cursor-pointer transition-all ${method === 'ocr' && loading ? 'ring-2 ring-primary' : 'hover:shadow-md'}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ScanText className="h-5 w-5 text-primary" />
                OCR + Color Analysis
              </CardTitle>
              <CardDescription>
                Uses browser-based OCR (Tesseract.js) to extract text, then analyzes pixel colors to detect node types. No external services needed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-xs text-muted-foreground space-y-1 mb-4">
                <li className="flex items-center gap-1"><Check className="h-3 w-3 text-emerald-500" /> 100% free, runs in browser</li>
                <li className="flex items-center gap-1"><Check className="h-3 w-3 text-emerald-500" /> Color-based node type detection</li>
                <li className="flex items-center gap-1"><AlertCircle className="h-3 w-3 text-amber-500" /> Connections need manual review</li>
                <li className="flex items-center gap-1"><AlertCircle className="h-3 w-3 text-amber-500" /> Less accurate than AI</li>
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
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            {loading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            <span className="text-sm text-muted-foreground">{progress}</span>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
