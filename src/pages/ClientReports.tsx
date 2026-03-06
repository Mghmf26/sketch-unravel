import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Users } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';

export default function ClientReports() {
  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <PageHeader
        title="Client Reports"
        description="Generate comprehensive reports for clients across all platform capabilities"
        breadcrumbs={[
          { label: 'Portfolio', to: '/' },
          { label: 'Reporting' },
          { label: 'Client Reports' },
        ]}
      />

      <Card variant="elevated" className="border">
        <CardContent className="p-0">
          <EmptyState
            icon={Users}
            title="Client Reports"
            description="Generate and manage professional reports for clients covering processes, risks, controls, compliance, mainframe analysis, and more."
          />
          <div className="flex justify-center pb-8">
            <Badge variant="outline">Coming Soon</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
