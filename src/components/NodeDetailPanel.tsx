import { X, ShieldAlert, Shield, BookOpen, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { Risk, Control, Regulation, Incident } from '@/lib/api';
import type { EPCNode, NodeType } from '@/types/epc';

interface NodeDetailPanelProps {
  node: EPCNode;
  risks: Risk[];
  controls: Control[];
  regulations: Regulation[];
  incidents: Incident[];
  defaultTab?: string;
  onClose: () => void;
}

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'in-scope': { bg: '#d1fae5', text: '#065f46', border: '#10b981' },
  'interface': { bg: '#e2e8f0', text: '#1e293b', border: '#64748b' },
  'event': { bg: '#fce7f3', text: '#831843', border: '#ec4899' },
  'xor': { bg: '#dbeafe', text: '#1e3a8a', border: '#3b82f6' },
  'decision': { bg: '#ffedd5', text: '#7c2d12', border: '#f97316' },
  'start-end': { bg: '#dcfce7', text: '#14532d', border: '#22c55e' },
  'storage': { bg: '#fef9c3', text: '#713f12', border: '#eab308' },
  'delay': { bg: '#fee2e2', text: '#7f1d1d', border: '#ef4444' },
  'document': { bg: '#ede9fe', text: '#3b0764', border: '#8b5cf6' },
};

const TYPE_LABELS: Record<string, string> = {
  'in-scope': 'Step', 'interface': 'Process Interface', 'event': 'Event', 'xor': 'XOR',
  'start-end': 'Start/End', 'decision': 'Decision', 'storage': 'Storage', 'delay': 'Delay', 'document': 'Document',
};

function SeverityBadge({ value }: { value: string }) {
  const colors: Record<string, string> = {
    low: 'bg-emerald-100 text-emerald-700',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700',
  };
  return <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${colors[value] || 'bg-muted text-muted-foreground'}`}>{value}</span>;
}

function StatusBadge({ value }: { value: string }) {
  const colors: Record<string, string> = {
    open: 'bg-red-100 text-red-700',
    investigating: 'bg-yellow-100 text-yellow-700',
    resolved: 'bg-emerald-100 text-emerald-700',
    closed: 'bg-slate-100 text-slate-700',
    compliant: 'bg-emerald-100 text-emerald-700',
    partial: 'bg-yellow-100 text-yellow-700',
    'non-compliant': 'bg-red-100 text-red-700',
    effective: 'bg-emerald-100 text-emerald-700',
    partially: 'bg-yellow-100 text-yellow-700',
    ineffective: 'bg-red-100 text-red-700',
  };
  return <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${colors[value] || 'bg-muted text-muted-foreground'}`}>{value}</span>;
}

export default function NodeDetailPanel({ node, risks, controls, regulations, incidents, defaultTab = 'overview', onClose }: NodeDetailPanelProps) {
  const tc = TYPE_COLORS[node.type] || TYPE_COLORS['in-scope'];
  const stepRisks = risks.filter(r => r.step_id === node.id);
  const stepRiskIds = new Set(stepRisks.map(r => r.id));
  const stepControls = controls.filter(c => stepRiskIds.has(c.risk_id));
  const stepRegulations = regulations.filter(r => r.step_id === node.id);
  const stepIncidents = incidents.filter(i => i.step_id === node.id);

  return (
    <div className="w-[340px] bg-background border-l shadow-lg flex flex-col h-full overflow-hidden" style={{ borderTopColor: tc.border, borderTopWidth: 3 }}>
      {/* Header */}
      <div className="flex items-start gap-2 p-4 pb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ backgroundColor: tc.bg, color: tc.text, border: `1px solid ${tc.border}` }}>
              {TYPE_LABELS[node.type] || node.type}
            </span>
          </div>
          <h3 className="text-sm font-bold truncate">{node.label}</h3>
          {node.description && (
            <p className="text-xs text-muted-foreground mt-0.5">{node.description}</p>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Separator />

      {/* Tabs */}
      <Tabs defaultValue={defaultTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-4 mt-2 bg-muted/50 h-8">
          <TabsTrigger value="overview" className="text-[10px] h-6 px-2">
            <Info className="h-3 w-3 mr-1" /> Overview
          </TabsTrigger>
          <TabsTrigger value="risks" className="text-[10px] h-6 px-2">
            <ShieldAlert className="h-3 w-3 mr-1" /> Risks
            {stepRisks.length > 0 && <Badge variant="secondary" className="ml-1 h-4 text-[8px] px-1">{stepRisks.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="controls" className="text-[10px] h-6 px-2">
            <Shield className="h-3 w-3 mr-1" /> Controls
            {stepControls.length > 0 && <Badge variant="secondary" className="ml-1 h-4 text-[8px] px-1">{stepControls.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="regulations" className="text-[10px] h-6 px-2">
            <BookOpen className="h-3 w-3 mr-1" /> Reg
            {stepRegulations.length > 0 && <Badge variant="secondary" className="ml-1 h-4 text-[8px] px-1">{stepRegulations.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="incidents" className="text-[10px] h-6 px-2">
            <AlertTriangle className="h-3 w-3 mr-1" /> Inc
            {stepIncidents.length > 0 && <Badge variant="secondary" className="ml-1 h-4 text-[8px] px-1">{stepIncidents.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 px-4 py-2">
          <TabsContent value="overview" className="mt-0 space-y-3">
            <div>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">Name</span>
              <p className="text-sm">{node.label}</p>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">Description</span>
              <p className="text-sm text-muted-foreground">{node.description || 'No description'}</p>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">Type</span>
              <p className="text-sm">{TYPE_LABELS[node.type] || node.type}</p>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2 rounded-lg border bg-orange-50">
                <div className="flex items-center gap-1 mb-0.5"><ShieldAlert className="h-3 w-3 text-orange-500" /><span className="text-[10px] font-semibold text-orange-700">Risks</span></div>
                <span className="text-lg font-bold text-orange-700">{stepRisks.length}</span>
              </div>
              <div className="p-2 rounded-lg border bg-blue-50">
                <div className="flex items-center gap-1 mb-0.5"><Shield className="h-3 w-3 text-blue-500" /><span className="text-[10px] font-semibold text-blue-700">Controls</span></div>
                <span className="text-lg font-bold text-blue-700">{stepControls.length}</span>
              </div>
              <div className="p-2 rounded-lg border bg-purple-50">
                <div className="flex items-center gap-1 mb-0.5"><BookOpen className="h-3 w-3 text-purple-500" /><span className="text-[10px] font-semibold text-purple-700">Regulations</span></div>
                <span className="text-lg font-bold text-purple-700">{stepRegulations.length}</span>
              </div>
              <div className="p-2 rounded-lg border bg-red-50">
                <div className="flex items-center gap-1 mb-0.5"><AlertTriangle className="h-3 w-3 text-red-500" /><span className="text-[10px] font-semibold text-red-700">Incidents</span></div>
                <span className="text-lg font-bold text-red-700">{stepIncidents.length}</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="risks" className="mt-0 space-y-2">
            {stepRisks.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No risks linked to this step</p>
            ) : stepRisks.map(risk => {
              const riskControls = controls.filter(c => c.risk_id === risk.id);
              return (
                <div key={risk.id} className="p-3 rounded-lg border bg-orange-50/50 space-y-2">
                  <p className="text-sm font-medium">{risk.description}</p>
                  <div className="flex gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-muted-foreground">Likelihood:</span>
                      <SeverityBadge value={risk.likelihood} />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-muted-foreground">Impact:</span>
                      <SeverityBadge value={risk.impact} />
                    </div>
                  </div>
                  {riskControls.length > 0 && (
                    <div className="pl-2 border-l-2 border-blue-200 space-y-1 mt-1">
                      <span className="text-[9px] font-semibold text-blue-600">Controls ({riskControls.length})</span>
                      {riskControls.map(ctrl => (
                        <div key={ctrl.id} className="flex items-center gap-1.5 text-xs">
                          <Shield className="h-3 w-3 text-blue-400" />
                          <span className="font-medium">{ctrl.name}</span>
                          <StatusBadge value={ctrl.effectiveness || 'effective'} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="controls" className="mt-0 space-y-2">
            {stepControls.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No controls linked to this step's risks</p>
            ) : stepControls.map(ctrl => (
              <div key={ctrl.id} className="p-3 rounded-lg border bg-blue-50/50 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-sm font-medium">{ctrl.name}</span>
                </div>
                {ctrl.description && <p className="text-xs text-muted-foreground">{ctrl.description}</p>}
                <div className="flex gap-2">
                  <StatusBadge value={ctrl.type || 'preventive'} />
                  <StatusBadge value={ctrl.effectiveness || 'effective'} />
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="regulations" className="mt-0 space-y-2">
            {stepRegulations.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No regulations linked to this step</p>
            ) : stepRegulations.map(reg => (
              <div key={reg.id} className="p-3 rounded-lg border bg-purple-50/50 space-y-1.5">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-3.5 w-3.5 text-purple-500" />
                  <span className="text-sm font-medium">{reg.name}</span>
                </div>
                {reg.description && <p className="text-xs text-muted-foreground">{reg.description}</p>}
                <div className="flex gap-2">
                  {reg.authority && <Badge variant="outline" className="text-[9px]">{reg.authority}</Badge>}
                  <StatusBadge value={reg.compliance_status || 'partial'} />
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="incidents" className="mt-0 space-y-2">
            {stepIncidents.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No incidents linked to this step</p>
            ) : stepIncidents.map(inc => (
              <div key={inc.id} className="p-3 rounded-lg border bg-red-50/50 space-y-1.5">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                  <span className="text-sm font-medium">{inc.title}</span>
                </div>
                {inc.description && <p className="text-xs text-muted-foreground">{inc.description}</p>}
                <div className="flex gap-2">
                  <SeverityBadge value={inc.severity} />
                  <StatusBadge value={inc.status || 'open'} />
                  {inc.date && <span className="text-[9px] text-muted-foreground">{inc.date}</span>}
                </div>
              </div>
            ))}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
