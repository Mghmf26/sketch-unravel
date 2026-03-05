import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Monitor, Terminal, Server, Layers } from 'lucide-react';

const PLATFORMS = [
  { key: 'windows', label: 'Windows', icon: Monitor, description: 'Windows Server infrastructure components, services, and dependencies.' },
  { key: 'linux', label: 'Linux', icon: Terminal, description: 'Linux-based infrastructure components, distributions, and services.' },
  { key: 'unix', label: 'Unix', icon: Server, description: 'Unix systems including AIX, Solaris, HP-UX infrastructure components.' },
  { key: 'tandem', label: 'Tandem', icon: Layers, description: 'HPE NonStop (Tandem) fault-tolerant infrastructure components.' },
];

export default function OnPremiseEcosystem() {
  const [activeTab, setActiveTab] = useState('windows');

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">On Premise Ecosystems</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage on-premise infrastructure across platforms</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {PLATFORMS.map(p => (
            <TabsTrigger key={p.key} value={p.key} className="gap-2">
              <p.icon className="h-4 w-4" />
              {p.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {PLATFORMS.map(p => (
          <TabsContent key={p.key} value={p.key}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <p.icon className="h-5 w-5 text-primary" />
                  {p.label} Infrastructure
                </CardTitle>
                <CardDescription>{p.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                  <div className="text-center space-y-2">
                    <p.icon className="h-12 w-12 mx-auto text-muted-foreground/30" />
                    <p className="text-sm font-medium">No {p.label} components configured yet</p>
                    <p className="text-xs text-muted-foreground">Infrastructure components for this platform will appear here</p>
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
