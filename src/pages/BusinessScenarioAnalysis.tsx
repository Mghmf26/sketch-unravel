import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Network, ArrowUpRight } from 'lucide-react';

export default function BusinessScenarioAnalysis() {
  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <div className="flex items-center gap-3 mb-1">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Business Scenario Analysis</h1>
          <p className="text-sm text-muted-foreground">Analyze all info and data from a business process — the entire flow of business process data and components</p>
        </div>
      </div>

      <Card className="border bg-card">
        <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Network className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <h3 className="text-base font-semibold text-foreground">Business Scenario Analysis</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Select a business process to analyze its complete flow, identifying indications and results across all components.
            </p>
          </div>
          <Badge variant="outline" className="mt-2">Coming Soon</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
