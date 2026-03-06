import { useState } from "react";
import { FileText, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { exportDatabaseSchemaPDF, exportArchitecturePDF } from "@/lib/docs-pdf-export";
import { toast } from "@/hooks/use-toast";

export default function DocumentationExport() {
  const [generatingSchema, setGeneratingSchema] = useState(false);
  const [generatingArch, setGeneratingArch] = useState(false);

  const handleSchemaExport = async () => {
    setGeneratingSchema(true);
    try {
      exportDatabaseSchemaPDF();
      toast({ title: "PDF Generated", description: "Database Schema PDF has been downloaded." });
    } catch (e) {
      toast({ title: "Error", description: "Failed to generate PDF.", variant: "destructive" });
    } finally {
      setGeneratingSchema(false);
    }
  };

  const handleArchExport = async () => {
    setGeneratingArch(true);
    try {
      exportArchitecturePDF();
      toast({ title: "PDF Generated", description: "Application Architecture PDF has been downloaded." });
    } catch (e) {
      toast({ title: "Error", description: "Failed to generate PDF.", variant: "destructive" });
    } finally {
      setGeneratingArch(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Documentation Export</h1>
        <p className="text-muted-foreground mt-1">Generate professional PDF documents for management deliverables.</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Database Schema Documentation</CardTitle>
                <CardDescription>Complete entity-relationship reference — 28 tables, functions, triggers, RLS policies, and index strategy.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button onClick={handleSchemaExport} disabled={generatingSchema} className="w-full sm:w-auto">
              {generatingSchema ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Download Database Schema PDF
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Application Architecture Documentation</CardTitle>
                <CardDescription>Complete system & component reference — 6-layer architecture, 13 feature modules, security framework, and diagrams.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button onClick={handleArchExport} disabled={generatingArch} className="w-full sm:w-auto">
              {generatingArch ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Download Architecture PDF
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
