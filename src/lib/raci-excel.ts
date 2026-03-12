import * as XLSX from 'xlsx';
import type { ProcessRaci, ProcessRaciStepLink } from './api-raci';
import type { ProcessStep } from './api';

interface ExportOptions {
  processName: string;
  department?: string;
  raciEntries: ProcessRaci[];
  raciStepLinks: ProcessRaciStepLink[];
  steps: ProcessStep[];
}

export function exportRaciToExcel({ processName, department, raciEntries, raciStepLinks, steps }: ExportOptions) {
  const wb = XLSX.utils.book_new();

  // Data Input sheet (main data)
  const dataRows = raciEntries.map(r => {
    const linkedStepIds = raciStepLinks.filter(l => l.raci_id === r.id).map(l => l.step_id);
    const linkedStepNames = steps.filter(s => linkedStepIds.includes(s.id)).map(s => s.label).join('; ');

    return {
      'Role Name': r.role_name,
      'Job Title': r.job_title || '',
      'Job Description': r.job_description || '',
      'Function (Department)': r.function_dept || '',
      'Sub Function': r.sub_function || '',
      'Seniority': r.seniority || '',
      'Tenure': r.tenure || '',
      'Grade': r.grade || '',
      'FTE': r.fte ?? '',
      'Salary': r.salary ?? '',
      'Manager Status': r.manager_status || '',
      'Span of Control': r.span_of_control ?? '',
      'Responsible': r.responsible || '',
      'Accountable': r.accountable || '',
      'Consulted': r.consulted || '',
      'Informed': r.informed || '',
      'Linked Steps': linkedStepNames,
    };
  });

  const ws = XLSX.utils.json_to_sheet(dataRows);
  ws['!cols'] = [
    { wch: 25 }, { wch: 25 }, { wch: 40 }, { wch: 25 }, { wch: 20 },
    { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
    { wch: 15 }, { wch: 15 }, { wch: 30 }, { wch: 30 }, { wch: 30 },
    { wch: 30 }, { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Data Input');

  // Summary sheet
  const summary = [
    { Property: 'Process Name', Value: processName },
    { Property: 'Department', Value: department || '' },
    { Property: 'Total Roles', Value: String(raciEntries.length) },
    { Property: 'Total FTE', Value: String(raciEntries.reduce((s, r) => s + (r.fte || 0), 0)) },
    { Property: 'Export Date', Value: new Date().toLocaleString() },
  ];
  const ws2 = XLSX.utils.json_to_sheet(summary);
  ws2['!cols'] = [{ wch: 20 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Summary');

  const filename = `RACI_${processName.replace(/\s+/g, '_')}${department ? '_' + department.replace(/\s+/g, '_') : ''}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export interface ImportedRaciRow {
  role_name: string;
  job_title: string;
  job_description: string;
  function_dept: string;
  sub_function: string;
  seniority: string;
  tenure: string;
  grade: string;
  fte: number | null;
  salary: number | null;
  manager_status: string;
  span_of_control: number | null;
  responsible: string;
  accountable: string;
  consulted: string;
  informed: string;
  linked_steps: string;
}

export function parseRaciExcel(file: File): Promise<ImportedRaciRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        
        // Try "Data Input" sheet first, then first sheet
        const sheetName = wb.SheetNames.includes('Data Input') ? 'Data Input' : wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<any>(ws);

        const parsed: ImportedRaciRow[] = rows
          .filter((row: any) => row['Role Name'] || row['role_name'] || row['Role name'])
          .map((row: any) => ({
            role_name: row['Role Name'] || row['role_name'] || row['Role name'] || '',
            job_title: row['Job Title'] || row['job_title'] || '',
            job_description: row['Job Description'] || row['job_description'] || '',
            function_dept: row['Function (Department)'] || row['Function'] || row['Department'] || row['function_dept'] || '',
            sub_function: row['Sub Function'] || row['sub_function'] || '',
            seniority: row['Seniority'] || row['seniority'] || '',
            tenure: row['Tenure'] || row['tenure'] || '',
            grade: row['Grade'] || row['grade'] || '',
            fte: parseFloat(row['FTE'] || row['fte']) || null,
            salary: parseFloat(row['Salary'] || row['salary']) || null,
            manager_status: row['Manager Status'] || row['manager_status'] || '',
            span_of_control: parseInt(row['Span of Control'] || row['span_of_control']) || null,
            responsible: row['Responsible'] || row['responsible'] || '',
            accountable: row['Accountable'] || row['accountable'] || '',
            consulted: row['Consulted'] || row['consulted'] || '',
            informed: row['Informed'] || row['informed'] || '',
            linked_steps: row['Linked Steps'] || row['linked_steps'] || '',
          }));

        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}
