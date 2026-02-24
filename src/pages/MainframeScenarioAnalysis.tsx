import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cpu, Server } from 'lucide-react';

export default function MainframeScenarioAnalysis() {
  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <div className="flex items-center gap-3 mb-1">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Server className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Mainframe Scenario Analysis</h1>
          <p className="text-sm text-muted-foreground">Analyze all info and data from mainframe — the entire flow of mainframe data and components</p>
        </div>
      </div>

      <Card className="border bg-card">
        <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Cpu className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <h3 className="text-base font-semibold text-foreground">Mainframe Scenario Analysis</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Analyze mainframe data flows and components to identify indications, risks and optimization results.
            </p>
          </div>
          <Badge variant="outline" className="mt-2">Coming Soon</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
