export type NodeType = 'in-scope' | 'interface' | 'event' | 'xor' | 'start-end' | 'decision' | 'storage' | 'delay' | 'document';

export interface EPCNode {
  id: string;
  label: string;
  type: NodeType;
  description?: string;
}

export interface EPCConnection {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface RiskScenario {
  id: string;
  description: string;
  likelihood: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  mitigation: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  date: string;
}

export interface Regulation {
  id: string;
  name: string;
  description: string;
  complianceStatus: 'compliant' | 'partial' | 'non-compliant';
  authority: string;
}

export interface MFQuestion {
  id: string;
  question: string;
  answer: string;
  confidence: number;
  category: string;
}

export interface EPCDiagram {
  id: string;
  processId: string;
  processName: string;
  clientId?: string;
  owner?: string;
  department?: string;
  nodes: EPCNode[];
  connections: EPCConnection[];
  riskScenarios?: RiskScenario[];
  incidents?: Incident[];
  regulations?: Regulation[];
  mfQuestions?: MFQuestion[];
  createdAt: string;
  updatedAt: string;
}
