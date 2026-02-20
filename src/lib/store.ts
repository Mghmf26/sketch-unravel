import { EPCDiagram } from '@/types/epc';

const STORAGE_KEY = 'epc-diagrams';

export function loadDiagrams(): EPCDiagram[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveDiagrams(diagrams: EPCDiagram[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(diagrams));
}

export function saveDiagram(diagram: EPCDiagram) {
  const diagrams = loadDiagrams();
  const idx = diagrams.findIndex(d => d.id === diagram.id);
  if (idx >= 0) {
    diagrams[idx] = { ...diagram, updatedAt: new Date().toISOString() };
  } else {
    diagrams.push(diagram);
  }
  saveDiagrams(diagrams);
}

export function deleteDiagram(id: string) {
  saveDiagrams(loadDiagrams().filter(d => d.id !== id));
}

export function getDiagram(id: string): EPCDiagram | undefined {
  return loadDiagrams().find(d => d.id === id);
}

export function createNewDiagram(processId: string, processName: string, clientId?: string, owner?: string, department?: string): EPCDiagram {
  return {
    id: crypto.randomUUID(),
    processId,
    processName,
    clientId,
    owner,
    department,
    nodes: [],
    connections: [],
    riskScenarios: [],
    incidents: [],
    regulations: [],
    mfQuestions: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
