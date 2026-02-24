import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Users } from 'lucide-react';

export default function ClientReports() {
  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <div className="flex items-center gap-3 mb-1">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Client Reports</h1>
          <p className="text-sm text-muted-foreground">Generate comprehensive reports for clients across all platform capabilities</p>
        </div>
      </div>

      <Card className="border bg-card">
        <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <h3 className="text-base font-semibold text-foreground">Client Reports</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Generate and manage professional reports for clients covering processes, risks, controls, compliance, mainframe analysis, and more.
            </p>
          </div>
          <Badge variant="outline" className="mt-2">Coming Soon</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
