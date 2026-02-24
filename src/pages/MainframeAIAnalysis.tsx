import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Cpu } from 'lucide-react';

export default function MainframeAIAnalysis() {
  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <div className="flex items-center gap-3 mb-1">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Brain className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Mainframe AI Analysis</h1>
          <p className="text-sm text-muted-foreground">AI-powered analysis of business process and mainframe data — the entire flow and components</p>
        </div>
      </div>

      <Card className="border bg-card">
        <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Brain className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <h3 className="text-base font-semibold text-foreground">Mainframe AI Analysis</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Combines business process and mainframe data to generate AI-driven insights, indications and results.
            </p>
          </div>
          <Badge variant="outline" className="mt-2">Coming Soon</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
