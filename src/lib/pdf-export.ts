import jsPDF from 'jspdf';

/* ────────────────────────── Types ────────────────────────── */

interface ReportSection {
  title: string;
  badge: string;
  items: string[];
}

interface ProcessData {
  process_name: string;
  department?: string | null;
  owner?: string | null;
  description?: string | null;
  mf_ai_potential?: string | null;
}

interface StepData {
  label: string;
  type: string;
  step_type?: string | null;
  description?: string | null;
  process_id: string;
}

interface RiskData {
  description: string;
  likelihood: string;
  impact: string;
  process_id: string;
  step_id: string;
}

interface ControlData {
  name: string;
  type?: string | null;
  effectiveness?: string | null;
  description?: string | null;
  risk_id: string;
}

interface IncidentData {
  title: string;
  severity?: string | null;
  status?: string | null;
  description?: string | null;
  date?: string | null;
  process_id: string;
}

interface RegulationData {
  name: string;
  authority?: string | null;
  compliance_status?: string | null;
  description?: string | null;
  process_id: string;
}

interface ApplicationData {
  name: string;
  app_type: string;
  screen_name?: string | null;
  description?: string | null;
  process_id: string;
}

interface MFFlowData {
  id: string;
  name: string;
  description?: string | null;
  process_id: string;
}

interface MFFlowNodeData {
  label: string;
  node_type: string;
  description?: string | null;
  flow_id: string;
}

interface MFImportData {
  source_name: string;
  source_type: string;
  dataset_name?: string | null;
  description?: string | null;
  status?: string | null;
  process_id: string;
}

export interface FullPDFReportData {
  title: string;
  subtitle: string;
  generatedAt: Date;
  clientName?: string;
  clientIndustry?: string;
  clientEngagementMode?: string;
  clientContactPerson?: string;
  scopeSummary: string;
  processes: ProcessData[];
  steps: StepData[];
  risks: RiskData[];
  controls: ControlData[];
  incidents: IncidentData[];
  regulations: RegulationData[];
  applications: ApplicationData[];
  mfFlows: MFFlowData[];
  mfFlowNodes: MFFlowNodeData[];
  mfImports: MFImportData[];
  aiSections: ReportSection[];
}

/* ────────────────────────── Colors ────────────────────────── */

const C = {
  primary:     [30, 64, 175]   as [number, number, number],
  dark:        [15, 23, 42]    as [number, number, number],
  muted:       [100, 116, 139] as [number, number, number],
  light:       [241, 245, 249] as [number, number, number],
  white:       [255, 255, 255] as [number, number, number],
  accent:      [59, 130, 246]  as [number, number, number],
  red:         [220, 38, 38]   as [number, number, number],
  green:       [22, 163, 74]   as [number, number, number],
  amber:       [217, 119, 6]   as [number, number, number],
  emerald:     [5, 150, 105]   as [number, number, number],
  violet:      [124, 58, 237]  as [number, number, number],
  sectionBg:   [248, 250, 252] as [number, number, number],
};

/* ────────────────────────── Helpers ────────────────────────── */

class PDFBuilder {
  doc: jsPDF;
  y = 0;
  pageNum = 0;
  readonly pw: number;
  readonly ph: number;
  readonly m = 20;
  readonly cw: number;
  private clientName?: string;

  constructor(clientName?: string) {
    this.doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    this.pw = this.doc.internal.pageSize.getWidth();
    this.ph = this.doc.internal.pageSize.getHeight();
    this.cw = this.pw - this.m * 2;
    this.clientName = clientName;
    this.pageNum = 1;
  }

  ensureSpace(needed: number) {
    if (this.y + needed > this.ph - 22) {
      this.newPage();
    }
  }

  newPage() {
    this.addFooter();
    this.doc.addPage();
    this.pageNum++;
    this.y = 18;
    // top bar
    this.doc.setFillColor(...C.primary);
    this.doc.rect(0, 0, this.pw, 2.5, 'F');
    // header line
    this.doc.setFontSize(7);
    this.doc.setTextColor(...C.muted);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('MF AI Navigator — Confidential Report', this.m, 10);
    if (this.clientName) {
      this.doc.text(this.clientName, this.pw - this.m - this.doc.getTextWidth(this.clientName), 10);
    }
    this.doc.setDrawColor(...C.light);
    this.doc.setLineWidth(0.3);
    this.doc.line(this.m, 13, this.pw - this.m, 13);
  }

  addFooter() {
    this.doc.setFillColor(...C.primary);
    this.doc.rect(0, this.ph - 2.5, this.pw, 2.5, 'F');
    this.doc.setTextColor(...C.muted);
    this.doc.setFontSize(6.5);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('Confidential — For Authorized Recipients Only', this.m, this.ph - 6);
    this.doc.text(`Page ${this.pageNum}`, this.pw - this.m - 12, this.ph - 6);
    this.doc.text('© 2026 MF AI Navigator', this.pw / 2 - 14, this.ph - 6);
  }

  sectionTitle(title: string, numbering?: string) {
    this.ensureSpace(18);
    // colored left bar
    this.doc.setFillColor(...C.primary);
    this.doc.rect(this.m, this.y, 1.5, 10, 'F');

    this.doc.setTextColor(...C.dark);
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    const prefix = numbering ? `${numbering}  ` : '';
    this.doc.text(`${prefix}${title}`, this.m + 5, this.y + 7);
    this.y += 14;

    // underline
    this.doc.setDrawColor(...C.primary);
    this.doc.setLineWidth(0.4);
    this.doc.line(this.m, this.y, this.pw - this.m, this.y);
    this.y += 6;
  }

  subTitle(text: string) {
    this.ensureSpace(10);
    this.doc.setTextColor(...C.primary);
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(text, this.m + 2, this.y + 4);
    this.y += 9;
  }

  paragraph(text: string) {
    this.doc.setTextColor(...C.dark);
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'normal');
    const lines = this.doc.splitTextToSize(text, this.cw - 4);
    const h = lines.length * 4.2 + 2;
    this.ensureSpace(h);
    this.doc.text(lines, this.m + 2, this.y + 4);
    this.y += h + 2;
  }

  keyValue(key: string, value: string | undefined | null, indent = 0) {
    if (!value) return;
    this.ensureSpace(6);
    this.doc.setFontSize(8.5);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(...C.muted);
    this.doc.text(`${key}:`, this.m + 4 + indent, this.y + 3.5);
    const kw = this.doc.getTextWidth(`${key}: `) + 1;
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(...C.dark);
    this.doc.text(value, this.m + 4 + indent + kw, this.y + 3.5);
    this.y += 5.5;
  }

  badge(text: string, color: [number, number, number], x: number, yPos: number) {
    const w = this.doc.getTextWidth(text) + 6;
    this.doc.setFillColor(...color);
    this.doc.roundedRect(x, yPos, w, 5.5, 1, 1, 'F');
    this.doc.setTextColor(...C.white);
    this.doc.setFontSize(6);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(text, x + 3, yPos + 3.8);
    return w;
  }

  tableRow(cols: string[], widths: number[], isHeader = false) {
    const rowH = 6;
    this.ensureSpace(rowH + 2);
    if (isHeader) {
      this.doc.setFillColor(...C.primary);
      this.doc.rect(this.m, this.y, this.cw, rowH, 'F');
      this.doc.setTextColor(...C.white);
      this.doc.setFontSize(7);
      this.doc.setFont('helvetica', 'bold');
    } else {
      this.doc.setFillColor(...C.sectionBg);
      this.doc.rect(this.m, this.y, this.cw, rowH, 'F');
      this.doc.setTextColor(...C.dark);
      this.doc.setFontSize(7);
      this.doc.setFont('helvetica', 'normal');
    }
    let x = this.m + 2;
    cols.forEach((col, i) => {
      const truncated = col.length > 60 ? col.slice(0, 57) + '...' : col;
      this.doc.text(truncated, x, this.y + 4);
      x += widths[i];
    });
    this.y += rowH + 0.3;

    if (!isHeader) {
      this.doc.setDrawColor(...C.light);
      this.doc.setLineWidth(0.15);
      this.doc.line(this.m, this.y, this.pw - this.m, this.y);
    }
  }

  spacer(h = 4) { this.y += h; }
}

/* ────────────────────────── Badge Colors ────────────────────────── */

function badgeColor(text: string): [number, number, number] {
  const l = text.toLowerCase();
  if (l.includes('critical') || l.includes('high')) return C.red;
  if (l.includes('action') || l.includes('next')) return C.accent;
  if (l.includes('opportunity') || l.includes('value') || l.includes('strategic')) return C.emerald;
  return C.primary;
}

function severityColor(s?: string | null): [number, number, number] {
  if (!s) return C.muted;
  const l = s.toLowerCase();
  if (l === 'critical') return C.red;
  if (l === 'high') return C.amber;
  if (l === 'medium') return C.accent;
  return C.emerald;
}

function complianceColor(s?: string | null): [number, number, number] {
  if (!s) return C.muted;
  if (s === 'compliant') return C.emerald;
  if (s === 'partial') return C.amber;
  return C.red;
}

/* ────────────────────────── Main Export ────────────────────────── */

export function exportReportToPDF(data: FullPDFReportData) {
  const b = new PDFBuilder(data.clientName);
  const { doc, m, pw, ph, cw } = b;

  /* ═══════════════ Cover Page ═══════════════ */
  // Top accent
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, pw, 5, 'F');

  // Logo block
  let y = 28;
  doc.setFillColor(...C.dark);
  doc.roundedRect(m, y, 14, 14, 2.5, 2.5, 'F');
  doc.setTextColor(...C.white);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('MF', m + 3.5, y + 6);
  doc.text('AI', m + 4.5, y + 11);

  doc.setTextColor(...C.dark);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('MF AI Navigator', m + 18, y + 6);
  doc.setTextColor(...C.muted);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('PROCESS INTELLIGENCE PLATFORM', m + 18, y + 11.5);

  // Main title
  y = 70;
  doc.setTextColor(...C.dark);
  doc.setFontSize(30);
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(data.title, cw);
  doc.text(titleLines, m, y);
  y += titleLines.length * 13;

  // Subtitle
  y += 3;
  doc.setTextColor(...C.muted);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  const subLines = doc.splitTextToSize(data.subtitle, cw);
  doc.text(subLines, m, y);
  y += subLines.length * 6 + 8;

  // Divider
  doc.setDrawColor(...C.primary);
  doc.setLineWidth(1);
  doc.line(m, y, m + 50, y);
  y += 15;

  // Client & Meta Info Box
  doc.setFillColor(...C.light);
  doc.roundedRect(m, y, cw, 38, 3, 3, 'F');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.primary);
  doc.text('REPORT DETAILS', m + 8, y + 8);

  doc.setDrawColor(...C.primary);
  doc.setLineWidth(0.3);
  doc.line(m + 8, y + 11, m + 50, y + 11);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.dark);
  let metaY = y + 17;

  const metaItems: [string, string][] = [];
  if (data.clientName) metaItems.push(['Client', data.clientName]);
  if (data.clientIndustry) metaItems.push(['Industry', data.clientIndustry]);
  if (data.clientEngagementMode) metaItems.push(['Engagement', data.clientEngagementMode]);
  if (data.clientContactPerson) metaItems.push(['Contact', data.clientContactPerson]);
  metaItems.push(['Generated', data.generatedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })]);
  metaItems.push(['Time', data.generatedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })]);

  // Two columns
  const leftMeta = metaItems.slice(0, Math.ceil(metaItems.length / 2));
  const rightMeta = metaItems.slice(Math.ceil(metaItems.length / 2));

  leftMeta.forEach(([k, v]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.muted);
    doc.text(`${k}:`, m + 8, metaY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.dark);
    doc.text(v, m + 38, metaY);
    metaY += 5.5;
  });

  metaY = y + 17;
  rightMeta.forEach(([k, v]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.muted);
    doc.text(`${k}:`, m + cw / 2 + 8, metaY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.dark);
    doc.text(v, m + cw / 2 + 38, metaY);
    metaY += 5.5;
  });

  y += 45;

  // Scope summary box
  doc.setFillColor(...C.primary);
  doc.roundedRect(m, y, cw, 16, 3, 3, 'F');
  doc.setTextColor(...C.white);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('ANALYSIS SCOPE', m + 6, y + 6);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const scopeLines = doc.splitTextToSize(data.scopeSummary, cw - 12);
  doc.text(scopeLines, m + 6, y + 11.5);

  // Cover footer
  doc.setTextColor(...C.muted);
  doc.setFontSize(6.5);
  doc.text('Confidential — For Authorized Recipients Only', m, ph - 12);
  doc.text('© 2026 MF AI Navigator', pw - m - 35, ph - 12);
  doc.setFillColor(...C.primary);
  doc.rect(0, ph - 3, pw, 3, 'F');

  /* ═══════════════ Table of Contents ═══════════════ */
  b.newPage();
  b.sectionTitle('Table of Contents');
  const tocItems = [
    '1. Executive Summary',
    '2. Business Process Overview',
    '3. Risk Assessment & Controls',
    '4. Compliance & Regulatory Status',
    '5. Incident Register',
    '6. Technology Landscape — Screens & Applications',
    '7. Mainframe Infrastructure & Flows',
    '8. MF Data Sources',
    '9. AI-Powered Insights & Recommendations',
  ];
  tocItems.forEach(item => {
    b.ensureSpace(7);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.dark);
    doc.text(item, m + 6, b.y + 5);
    b.y += 8;
  });

  /* ═══════════════ 1. Executive Summary ═══════════════ */
  b.newPage();
  b.sectionTitle('Executive Summary', '1');

  b.paragraph(`This report presents a comprehensive analysis of ${data.processes.length} business process${data.processes.length !== 1 ? 'es' : ''}${data.clientName ? ` for ${data.clientName}` : ''}, encompassing ${data.steps.length} operational steps, ${data.risks.length} identified risks with ${data.controls.length} mitigating controls, ${data.regulations.length} regulatory requirements, and ${data.incidents.length} recorded incidents.`);

  b.paragraph(`The technology landscape includes ${data.applications.length} screens and applications, ${data.mfFlows.length} mainframe technical flows with ${data.mfFlowNodes.length} infrastructure nodes, and ${data.mfImports.length} data sources. AI analysis has been performed to identify cost reduction opportunities, risk mitigation strategies, revenue optimization, and actionable next steps.`);

  // Summary stats grid
  b.spacer(4);
  const stats = [
    ['Processes', String(data.processes.length)],
    ['Steps', String(data.steps.length)],
    ['Risks', String(data.risks.length)],
    ['Controls', String(data.controls.length)],
    ['Regulations', String(data.regulations.length)],
    ['Incidents', String(data.incidents.length)],
    ['Screens/Apps', String(data.applications.length)],
    ['MF Flows', String(data.mfFlows.length)],
    ['MF Nodes', String(data.mfFlowNodes.length)],
    ['Data Sources', String(data.mfImports.length)],
  ];

  b.ensureSpace(28);
  const boxW = (cw - 8) / 5;
  const boxH = 12;
  stats.forEach(([label, val], i) => {
    const col = i % 5;
    const row = Math.floor(i / 5);
    const bx = m + 2 + col * (boxW + 1.5);
    const by = b.y + row * (boxH + 2);
    doc.setFillColor(...C.light);
    doc.roundedRect(bx, by, boxW, boxH, 1.5, 1.5, 'F');
    doc.setTextColor(...C.primary);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(val, bx + boxW / 2, by + 5.5, { align: 'center' });
    doc.setTextColor(...C.muted);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text(label, bx + boxW / 2, by + 10, { align: 'center' });
  });
  b.y += 2 * (boxH + 2) + 6;

  /* ═══════════════ 2. Business Process Overview ═══════════════ */
  b.newPage();
  b.sectionTitle('Business Process Overview', '2');

  data.processes.forEach((proc, idx) => {
    b.ensureSpace(30);

    // Process card
    doc.setFillColor(...C.sectionBg);
    doc.roundedRect(m, b.y, cw, 6, 1, 1, 'F');
    doc.setFillColor(...C.primary);
    doc.rect(m, b.y, 1.5, 6, 'F');
    doc.setTextColor(...C.dark);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${idx + 1}. ${proc.process_name}`, m + 5, b.y + 4.3);

    if (proc.mf_ai_potential) {
      const potColor = proc.mf_ai_potential === 'high' ? C.emerald : proc.mf_ai_potential === 'medium' ? C.amber : C.muted;
      b.badge(`AI: ${proc.mf_ai_potential.toUpperCase()}`, potColor, pw - m - 22, b.y + 0.3);
    }
    b.y += 9;

    b.keyValue('Department', proc.department);
    b.keyValue('Owner', proc.owner);
    if (proc.description) b.paragraph(proc.description);

    // Steps for this process
    const procSteps = data.steps.filter(s => s.process_id === (proc as any).id);
    if (procSteps.length > 0) {
      b.subTitle(`Steps (${procSteps.length})`);
      const stepWidths = [cw * 0.45, cw * 0.2, cw * 0.2, cw * 0.15];
      b.tableRow(['Step Name', 'Type', 'Classification', 'Description'], stepWidths, true);
      procSteps.forEach(s => {
        b.tableRow([
          s.label,
          s.type || '—',
          s.step_type || '—',
          (s.description || '—').slice(0, 50),
        ], stepWidths);
      });
    }
    b.spacer(6);
  });

  /* ═══════════════ 3. Risk Assessment & Controls ═══════════════ */
  b.newPage();
  b.sectionTitle('Risk Assessment & Controls', '3');

  if (data.risks.length === 0) {
    b.paragraph('No risks have been identified for the selected scope.');
  } else {
    // Risk summary
    const highRisks = data.risks.filter(r => r.likelihood === 'high' || r.impact === 'high').length;
    const medRisks = data.risks.filter(r => r.likelihood === 'medium' && r.impact === 'medium').length;
    b.paragraph(`Total risks: ${data.risks.length} (${highRisks} high-severity, ${medRisks} medium, ${data.risks.length - highRisks - medRisks} low). Control coverage: ${data.controls.length} controls across ${data.risks.length} risks (${data.risks.length > 0 ? Math.round(data.controls.length / data.risks.length * 100) : 0}%).`);
    b.spacer(3);

    const rWidths = [cw * 0.4, cw * 0.12, cw * 0.12, cw * 0.36];
    b.tableRow(['Risk Description', 'Likelihood', 'Impact', 'Controls'], rWidths, true);

    data.risks.forEach(risk => {
      const riskControls = data.controls.filter(c => c.risk_id === risk.id || (c as any).risk_id === (risk as any).id);
      const ctrlNames = riskControls.map(c => c.name).join(', ') || 'None';
      b.tableRow([
        risk.description.slice(0, 55),
        risk.likelihood.toUpperCase(),
        risk.impact.toUpperCase(),
        ctrlNames.slice(0, 50),
      ], rWidths);
    });
  }

  /* ═══════════════ 4. Compliance & Regulatory ═══════════════ */
  b.newPage();
  b.sectionTitle('Compliance & Regulatory Status', '4');

  if (data.regulations.length === 0) {
    b.paragraph('No regulatory requirements have been mapped for the selected scope.');
  } else {
    const compliant = data.regulations.filter(r => r.compliance_status === 'compliant').length;
    const partial = data.regulations.filter(r => r.compliance_status === 'partial').length;
    const nonComp = data.regulations.filter(r => r.compliance_status === 'non-compliant').length;
    b.paragraph(`Regulatory landscape: ${data.regulations.length} requirements tracked. ${compliant} compliant, ${partial} partial, ${nonComp} non-compliant.`);
    b.spacer(3);

    const regWidths = [cw * 0.3, cw * 0.25, cw * 0.2, cw * 0.25];
    b.tableRow(['Regulation', 'Authority', 'Status', 'Description'], regWidths, true);
    data.regulations.forEach(reg => {
      b.tableRow([
        reg.name,
        reg.authority || '—',
        (reg.compliance_status || '—').toUpperCase(),
        (reg.description || '—').slice(0, 40),
      ], regWidths);
    });
  }

  /* ═══════════════ 5. Incidents ═══════════════ */
  b.newPage();
  b.sectionTitle('Incident Register', '5');

  if (data.incidents.length === 0) {
    b.paragraph('No incidents have been recorded for the selected scope.');
  } else {
    const criticals = data.incidents.filter(i => i.severity === 'critical').length;
    const highs = data.incidents.filter(i => i.severity === 'high').length;
    b.paragraph(`Total incidents: ${data.incidents.length}. Critical: ${criticals}, High: ${highs}, Other: ${data.incidents.length - criticals - highs}.`);
    b.spacer(3);

    const iWidths = [cw * 0.3, cw * 0.12, cw * 0.12, cw * 0.15, cw * 0.31];
    b.tableRow(['Incident', 'Severity', 'Status', 'Date', 'Description'], iWidths, true);
    data.incidents.forEach(inc => {
      b.tableRow([
        inc.title.slice(0, 35),
        (inc.severity || '—').toUpperCase(),
        (inc.status || '—'),
        inc.date ? new Date(inc.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—',
        (inc.description || '—').slice(0, 40),
      ], iWidths);
    });
  }

  /* ═══════════════ 6. Screens & Applications ═══════════════ */
  b.newPage();
  b.sectionTitle('Technology Landscape — Screens & Applications', '6');

  if (data.applications.length === 0) {
    b.paragraph('No screens or applications have been mapped for the selected scope.');
  } else {
    b.paragraph(`${data.applications.length} screens and applications are linked to the process steps within scope.`);
    b.spacer(3);

    const aWidths = [cw * 0.3, cw * 0.15, cw * 0.25, cw * 0.3];
    b.tableRow(['Name', 'Type', 'Screen', 'Description'], aWidths, true);
    data.applications.forEach(app => {
      b.tableRow([
        app.name,
        app.app_type || '—',
        app.screen_name || '—',
        (app.description || '—').slice(0, 40),
      ], aWidths);
    });
  }

  /* ═══════════════ 7. Mainframe Infrastructure ═══════════════ */
  b.newPage();
  b.sectionTitle('Mainframe Infrastructure & Flows', '7');

  if (data.mfFlows.length === 0) {
    b.paragraph('No mainframe technical flows have been configured for the selected scope.');
  } else {
    b.paragraph(`${data.mfFlows.length} mainframe flows with ${data.mfFlowNodes.length} infrastructure nodes have been mapped.`);
    b.spacer(3);

    data.mfFlows.forEach((flow, idx) => {
      b.ensureSpace(16);
      doc.setFillColor(...C.sectionBg);
      doc.roundedRect(m, b.y, cw, 6, 1, 1, 'F');
      doc.setFillColor(...C.violet);
      doc.rect(m, b.y, 1.5, 6, 'F');
      doc.setTextColor(...C.dark);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`${idx + 1}. ${flow.name}`, m + 5, b.y + 4.3);
      b.y += 9;
      if (flow.description) b.keyValue('Description', flow.description, 2);

      const flowNodes = data.mfFlowNodes.filter(n => n.flow_id === flow.id);
      if (flowNodes.length > 0) {
        const nWidths = [cw * 0.35, cw * 0.25, cw * 0.4];
        b.tableRow(['Node', 'Type', 'Description'], nWidths, true);
        flowNodes.forEach(node => {
          b.tableRow([
            node.label,
            node.node_type.replace(/-/g, ' ').toUpperCase(),
            (node.description || '—').slice(0, 50),
          ], nWidths);
        });
      }
      b.spacer(4);
    });
  }

  /* ═══════════════ 8. MF Data Sources ═══════════════ */
  b.newPage();
  b.sectionTitle('MF Data Sources', '8');

  if (data.mfImports.length === 0) {
    b.paragraph('No mainframe data sources have been configured for the selected scope.');
  } else {
    b.paragraph(`${data.mfImports.length} data sources are mapped to the mainframe infrastructure.`);
    b.spacer(3);

    const dsWidths = [cw * 0.25, cw * 0.15, cw * 0.2, cw * 0.15, cw * 0.25];
    b.tableRow(['Source Name', 'Type', 'Dataset', 'Status', 'Description'], dsWidths, true);
    data.mfImports.forEach(imp => {
      b.tableRow([
        imp.source_name,
        imp.source_type,
        imp.dataset_name || '—',
        (imp.status || '—'),
        (imp.description || '—').slice(0, 35),
      ], dsWidths);
    });
  }

  /* ═══════════════ 9. AI Insights ═══════════════ */
  if (data.aiSections.length > 0) {
    b.newPage();
    b.sectionTitle('AI-Powered Insights & Recommendations', '9');

    b.paragraph('The following insights were generated by AI analysis of all scoped data including processes, risks, controls, compliance posture, incidents, mainframe infrastructure, and data sources.');
    b.spacer(3);

    data.aiSections.forEach((section, sIdx) => {
      b.ensureSpace(20);

      // Section header with badge
      doc.setFillColor(...C.light);
      doc.roundedRect(m, b.y, cw, 8, 1.5, 1.5, 'F');
      doc.setTextColor(...C.dark);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${sIdx + 1}. ${section.title}`, m + 5, b.y + 5.5);

      const bc = badgeColor(section.badge);
      b.badge(section.badge, bc, pw - m - doc.getTextWidth(section.badge) - 10, b.y + 1.5);
      b.y += 12;

      // Items
      section.items.forEach((item, i) => {
        const itemLines = doc.splitTextToSize(item, cw - 18);
        const itemH = itemLines.length * 4.2 + 4;
        b.ensureSpace(itemH);

        // Numbered circle
        doc.setFillColor(...C.light);
        doc.circle(m + 5, b.y + 3, 3, 'F');
        doc.setTextColor(...C.primary);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text(String(i + 1), m + 3.5, b.y + 4.2);

        // Text
        doc.setTextColor(...C.dark);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.text(itemLines, m + 12, b.y + 4);

        b.y += itemH;

        if (i < section.items.length - 1) {
          doc.setDrawColor(...C.light);
          doc.setLineWidth(0.2);
          doc.line(m + 12, b.y - 1, pw - m, b.y - 1);
        }
      });
      b.spacer(6);
    });
  }

  /* ═══════════════ Final Footer ═══════════════ */
  b.addFooter();

  /* ═══════════════ Save ═══════════════ */
  const ts = data.generatedAt.toISOString().slice(0, 10);
  const filename = `MF_AI_Report_${data.clientName?.replace(/\s+/g, '_') || 'All'}_${ts}.pdf`;
  doc.save(filename);
}
