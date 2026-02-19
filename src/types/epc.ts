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

export interface EPCDiagram {
  id: string;
  processId: string;
  processName: string;
  nodes: EPCNode[];
  connections: EPCConnection[];
  createdAt: string;
  updatedAt: string;
}
