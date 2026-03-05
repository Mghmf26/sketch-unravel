import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Cloud } from 'lucide-react';

const PROVIDERS = [
  { key: 'ibm', label: 'IBM Cloud', description: 'IBM Cloud services, mainframe-to-cloud bridges, and hybrid components.' },
  { key: 'aws', label: 'AWS Cloud', description: 'Amazon Web Services infrastructure, compute, storage, and integration services.' },
  { key: 'azure', label: 'Azure Cloud', description: 'Microsoft Azure services, hybrid cloud components, and integrations.' },
];

export default function CloudEcosystem() {
  const [activeTab, setActiveTab] = useState('ibm');

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Cloud Ecosystems</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage cloud infrastructure across providers</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {PROVIDERS.map(p => (
            <TabsTrigger key={p.key} value={p.key} className="gap-2">
              <Cloud className="h-4 w-4" />
              {p.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {PROVIDERS.map(p => (
          <TabsContent key={p.key} value={p.key}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="h-5 w-5 text-primary" />
                  {p.label}
                </CardTitle>
                <CardDescription>{p.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                  <div className="text-center space-y-2">
                    <Cloud className="h-12 w-12 mx-auto text-muted-foreground/30" />
                    <p className="text-sm font-medium">No {p.label} components configured yet</p>
                    <p className="text-xs text-muted-foreground">Cloud infrastructure components will appear here</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
