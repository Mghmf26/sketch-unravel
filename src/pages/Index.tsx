import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileSpreadsheet, Eye, Trash2, Clock, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { loadDiagrams, deleteDiagram } from '@/lib/store';
import type { EPCDiagram } from '@/types/epc';
import { exportToExcel } from '@/lib/excel-export';
import { toast } from '@/hooks/use-toast';

export default function Index() {
  const navigate = useNavigate();
  const [diagrams, setDiagrams] = useState<EPCDiagram[]>([]);

  useEffect(() => {
    setDiagrams(loadDiagrams());
  }, []);

  const handleDelete = (id: string, name: string) => {
    deleteDiagram(id);
    setDiagrams(loadDiagrams());
    toast({ title: 'Deleted', description: `"${name}" has been removed.` });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">EPC Diagram Tool</h1>
          <p className="text-sm text-muted-foreground">Create, visualize, and export EPC business process diagrams</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/upload')}>
            <Upload className="mr-2 h-4 w-4" /> Upload & Extract
          </Button>
          <Button onClick={() => navigate('/new')}>
            <Plus className="mr-2 h-4 w-4" /> New Diagram
          </Button>
        </div>
      </div>

      {diagrams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-1">No diagrams yet</h2>
            <p className="text-sm text-muted-foreground mb-4">Create your first EPC diagram to get started.</p>
            <Button onClick={() => navigate('/new')}>
              <Plus className="mr-2 h-4 w-4" /> Create Diagram
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {diagrams.map((d) => (
            <Card key={d.id} className="hover:shadow-md transition-shadow">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileSpreadsheet className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{d.processName}</span>
                      <Badge variant="outline" className="text-xs font-mono">{d.processId}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span>{d.nodes.length} nodes</span>
                      <span>{d.connections.length} connections</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(d.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/edit/${d.id}`)}>Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/view/${d.id}`)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => exportToExcel(d)}>
                    <FileSpreadsheet className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(d.id, d.processName)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
