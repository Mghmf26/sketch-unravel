import * as XLSX from 'xlsx';
import type { EPCDiagram } from '@/types/epc';

const TYPE_LABELS: Record<string, string> = {
  'in-scope': 'In-Scope Step',
  'interface': 'Interface/External Process',
  'event': 'Event',
  'xor': 'XOR Gateway',
};

export function exportToExcel(diagram: EPCDiagram) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Nodes
  const nodesData = diagram.nodes.map(n => ({
    'Node ID': n.id,
    'Label': n.label,
    'Type': TYPE_LABELS[n.type] || n.type,
    'Description': n.description || '',
  }));
  const ws1 = XLSX.utils.json_to_sheet(nodesData);
  ws1['!cols'] = [{ wch: 16 }, { wch: 50 }, { wch: 28 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Nodes');

  // Sheet 2: Connections
  const connData = diagram.connections.map(c => ({
    'Source Node': c.source,
    'Target Node': c.target,
    'Label': c.label || '',
  }));
  const ws2 = XLSX.utils.json_to_sheet(connData);
  ws2['!cols'] = [{ wch: 16 }, { wch: 16 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Connections');

  // Sheet 3: Summary
  const summary = [
    { 'Property': 'Process ID', 'Value': diagram.processId },
    { 'Property': 'Process Name', 'Value': diagram.processName },
    { 'Property': 'Total Nodes', 'Value': String(diagram.nodes.length) },
    { 'Property': 'In-Scope Steps', 'Value': String(diagram.nodes.filter(n => n.type === 'in-scope').length) },
    { 'Property': 'Interfaces', 'Value': String(diagram.nodes.filter(n => n.type === 'interface').length) },
    { 'Property': 'Events', 'Value': String(diagram.nodes.filter(n => n.type === 'event').length) },
    { 'Property': 'XOR Gateways', 'Value': String(diagram.nodes.filter(n => n.type === 'xor').length) },
    { 'Property': 'Total Connections', 'Value': String(diagram.connections.length) },
    { 'Property': 'Created', 'Value': new Date(diagram.createdAt).toLocaleString() },
    { 'Property': 'Last Updated', 'Value': new Date(diagram.updatedAt).toLocaleString() },
  ];
  const ws3 = XLSX.utils.json_to_sheet(summary);
  ws3['!cols'] = [{ wch: 20 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws3, 'Summary');

  XLSX.writeFile(wb, `${diagram.processId}_${diagram.processName.replace(/\s+/g, '_')}.xlsx`);
}
