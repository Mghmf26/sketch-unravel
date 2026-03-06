import jsPDF from 'jspdf';

/* ─── Brand Colors ─── */
const C = {
  primary:   [30, 64, 175]   as [number, number, number],
  dark:      [15, 23, 42]    as [number, number, number],
  muted:     [100, 116, 139] as [number, number, number],
  light:     [241, 245, 249] as [number, number, number],
  white:     [255, 255, 255] as [number, number, number],
  accent:    [59, 130, 246]  as [number, number, number],
  green:     [22, 163, 74]   as [number, number, number],
  amber:     [217, 119, 6]   as [number, number, number],
  red:       [220, 38, 38]   as [number, number, number],
  teal:      [13, 148, 136]  as [number, number, number],
  sectionBg: [248, 250, 252] as [number, number, number],
};

/* ─── PDF Builder helper ─── */
class DocPDF {
  doc: jsPDF;
  y = 0;
  page = 0;
  readonly pw: number;
  readonly ph: number;
  readonly m = 18;
  readonly cw: number;
  private docTitle: string;

  constructor(title: string) {
    this.doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    this.pw = this.doc.internal.pageSize.getWidth();
    this.ph = this.doc.internal.pageSize.getHeight();
    this.cw = this.pw - this.m * 2;
    this.docTitle = title;
    this.page = 1;
  }

  ensure(h: number) { if (this.y + h > this.ph - 20) this.newPage(); }

  newPage() {
    this.footer();
    this.doc.addPage();
    this.page++;
    this.y = 16;
    this.doc.setFillColor(...C.primary);
    this.doc.rect(0, 0, this.pw, 2, 'F');
    this.doc.setFontSize(6.5);
    this.doc.setTextColor(...C.muted);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`MF AI — ${this.docTitle}`, this.m, 9);
    this.doc.text('Confidential', this.pw - this.m - 18, 9);
    this.doc.setDrawColor(...C.light);
    this.doc.setLineWidth(0.3);
    this.doc.line(this.m, 12, this.pw - this.m, 12);
  }

  footer() {
    this.doc.setFillColor(...C.primary);
    this.doc.rect(0, this.ph - 2, this.pw, 2, 'F');
    this.doc.setFontSize(6);
    this.doc.setTextColor(...C.muted);
    this.doc.text('Confidential — For Authorized Recipients Only', this.m, this.ph - 5);
    this.doc.text(`Page ${this.page}`, this.pw - this.m - 12, this.ph - 5);
    this.doc.text('© 2026 MF AI Navigator', this.pw / 2 - 14, this.ph - 5);
  }

  h1(text: string) {
    this.ensure(16);
    this.doc.setFillColor(...C.primary);
    this.doc.rect(this.m, this.y, 1.5, 10, 'F');
    this.doc.setTextColor(...C.dark);
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(text, this.m + 5, this.y + 7);
    this.y += 12;
    this.doc.setDrawColor(...C.primary);
    this.doc.setLineWidth(0.4);
    this.doc.line(this.m, this.y, this.pw - this.m, this.y);
    this.y += 6;
  }

  h2(text: string) {
    this.ensure(10);
    this.doc.setTextColor(...C.primary);
    this.doc.setFontSize(10.5);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(text, this.m + 2, this.y + 4);
    this.y += 9;
  }

  h3(text: string) {
    this.ensure(8);
    this.doc.setTextColor(...C.dark);
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(text, this.m + 4, this.y + 3.5);
    this.y += 7;
  }

  para(text: string) {
    this.doc.setTextColor(...C.dark);
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'normal');
    const lines = this.doc.splitTextToSize(text, this.cw - 6);
    const h = lines.length * 3.8 + 2;
    this.ensure(h);
    this.doc.text(lines, this.m + 3, this.y + 3.5);
    this.y += h + 1;
  }

  kv(key: string, value: string) {
    this.ensure(5);
    this.doc.setFontSize(7.5);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(...C.muted);
    this.doc.text(`${key}:`, this.m + 4, this.y + 3);
    const kw = this.doc.getTextWidth(`${key}: `) + 1;
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(...C.dark);
    this.doc.text(value, this.m + 4 + kw, this.y + 3);
    this.y += 5;
  }

  table(headers: string[], rows: string[][], widths: number[]) {
    // Header
    this.ensure(7);
    this.doc.setFillColor(...C.primary);
    this.doc.rect(this.m, this.y, this.cw, 6, 'F');
    this.doc.setTextColor(...C.white);
    this.doc.setFontSize(6.5);
    this.doc.setFont('helvetica', 'bold');
    let x = this.m + 2;
    headers.forEach((h, i) => {
      this.doc.text(h.slice(0, 40), x, this.y + 4);
      x += widths[i];
    });
    this.y += 6.3;

    // Rows
    rows.forEach((row, ri) => {
      this.ensure(6);
      const bgColor = ri % 2 === 0 ? C.sectionBg : C.white;
      this.doc.setFillColor(...bgColor);
      this.doc.rect(this.m, this.y, this.cw, 5.5, 'F');
      this.doc.setTextColor(...C.dark);
      this.doc.setFontSize(6);
      this.doc.setFont('helvetica', 'normal');
      let rx = this.m + 2;
      row.forEach((cell, ci) => {
        const maxW = widths[ci] - 2;
        const t = cell.length > 50 ? cell.slice(0, 47) + '...' : cell;
        this.doc.text(t, rx, this.y + 3.8);
        rx += widths[ci];
      });
      this.y += 5.8;
    });
    this.y += 2;
  }

  codeBlock(lines: string[]) {
    this.doc.setFillColor(245, 245, 245);
    this.doc.setTextColor(40, 40, 40);
    this.doc.setFontSize(5.5);
    this.doc.setFont('courier', 'normal');
    lines.forEach(line => {
      this.ensure(4);
      this.doc.setFillColor(245, 245, 245);
      this.doc.rect(this.m + 2, this.y, this.cw - 4, 3.8, 'F');
      this.doc.text(line.slice(0, 110), this.m + 4, this.y + 2.8);
      this.y += 3.8;
    });
    this.y += 2;
  }

  spacer(h = 4) { this.y += h; }

  badge(text: string, color: [number, number, number], x: number, yPos: number) {
    const w = this.doc.getTextWidth(text) + 6;
    this.doc.setFillColor(...color);
    this.doc.roundedRect(x, yPos, w, 5, 1, 1, 'F');
    this.doc.setTextColor(...C.white);
    this.doc.setFontSize(5.5);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(text, x + 3, yPos + 3.5);
    return w;
  }

  save(filename: string) {
    this.footer();
    this.doc.save(filename);
  }
}

/* ═══════════════════════════════════════════════════════ */
/*            DATABASE SCHEMA PDF                          */
/* ═══════════════════════════════════════════════════════ */

export function exportDatabaseSchemaPDF() {
  const b = new DocPDF('Database Schema Documentation');
  const { doc, m, pw, ph, cw } = b;

  /* ── Cover Page ── */
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, pw, 5, 'F');

  let y = 30;
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

  y = 72;
  doc.setTextColor(...C.dark);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('Database Schema', m, y);
  y += 12;
  doc.text('Documentation', m, y);
  y += 14;

  doc.setTextColor(...C.muted);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Complete Entity-Relationship Reference', m, y);
  y += 14;

  doc.setDrawColor(...C.primary);
  doc.setLineWidth(1);
  doc.line(m, y, m + 50, y);
  y += 14;

  // Meta box
  doc.setFillColor(...C.light);
  doc.roundedRect(m, y, cw, 34, 3, 3, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.primary);
  doc.text('DOCUMENT DETAILS', m + 8, y + 8);
  doc.setDrawColor(...C.primary);
  doc.setLineWidth(0.3);
  doc.line(m + 8, y + 11, m + 50, y + 11);

  const meta = [
    ['Version', '1.0'],
    ['Date', 'March 6, 2026'],
    ['Classification', 'Internal — Confidential'],
    ['RDBMS', 'PostgreSQL 15.6'],
    ['Host OS', 'Ubuntu 24.04 LTS (VMware ESXi 8.0)'],
    ['Tools', 'Bob AI / Visual Studio Code'],
  ];

  let my = y + 17;
  doc.setFontSize(8);
  meta.forEach(([k, v]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.muted);
    doc.text(`${k}:`, m + 8, my);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.dark);
    doc.text(v, m + 38, my);
    my += 4.5;
  });

  y += 42;

  // Stats box
  doc.setFillColor(...C.primary);
  doc.roundedRect(m, y, cw, 14, 3, 3, 'F');
  doc.setTextColor(...C.white);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('SCHEMA SUMMARY', m + 6, y + 6);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('28 Tables • 7 Roles • 6 Functions • 14 Activity Triggers • 3 Storage Buckets • Full RLS Coverage', m + 6, y + 11);

  doc.setTextColor(...C.muted);
  doc.setFontSize(6.5);
  doc.text('Confidential — For Authorized Recipients Only', m, ph - 12);
  doc.setFillColor(...C.primary);
  doc.rect(0, ph - 3, pw, 3, 'F');

  /* ── Table of Contents ── */
  b.newPage();
  b.h1('Table of Contents');
  const toc = [
    '1.  Overview',
    '2.  Database Engine & Configuration',
    '3.  Entity-Relationship Diagram',
    '4.  Enumerations',
    '5.  Tables (28 entities)',
    '6.  Database Functions',
    '7.  Triggers',
    '8.  Row-Level Security (RLS) Policies',
    '9.  Storage Buckets',
    '10. Index Strategy',
  ];
  toc.forEach(item => {
    b.ensure(7);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.dark);
    doc.text(item, m + 6, b.y + 4);
    b.y += 7;
  });

  /* ── 1. Overview ── */
  b.newPage();
  b.h1('1. Overview');
  b.para('The MF AI platform uses a PostgreSQL 15 relational database deployed on an Ubuntu 24.04 LTS virtual machine running under VMware ESXi 8.0. The database backs a business process management (BPM) and risk/controls governance application.');
  b.spacer(2);
  b.para('The schema supports: Multi-tenant client management with role-based access control (RBAC), Business process modeling with EPC (Event-driven Process Chain) diagramming, Risk/Controls/Regulations/Incident management per process step, RACI matrix management at the process level with step-level inheritance, Mainframe technical flow mapping with infrastructure node decomposition, AI-powered analysis and report generation, Document/file attachment management with confidentiality classification, and comprehensive audit trail via activity logging.');
  b.spacer(2);
  b.para('All tables reside in the public schema. Authentication is managed through the auth schema (managed by the authentication layer) and is not modified directly.');

  /* ── 2. Config ── */
  b.newPage();
  b.h1('2. Database Engine & Configuration');
  b.table(
    ['Property', 'Value'],
    [
      ['RDBMS', 'PostgreSQL 15.6'],
      ['Host OS', 'Ubuntu 24.04 LTS'],
      ['Virtualization', 'VMware ESXi 8.0'],
      ['Schema', 'public'],
      ['Authentication Schema', 'auth (managed, read-only)'],
      ['UUID Generation', 'gen_random_uuid()'],
      ['Row-Level Security', 'Enabled on all tables'],
      ['Default Encoding', 'UTF-8'],
      ['Connection Pooling', 'PgBouncer (transaction mode)'],
    ],
    [cw * 0.4, cw * 0.6]
  );

  /* ── 3. ER Diagram ── */
  b.newPage();
  b.h1('3. Entity-Relationship Diagram');
  b.h2('Core Hierarchy');
  b.codeBlock([
    'auth.users (managed)',
    '  │ 1:1',
    '  ├── profiles',
    '  ├── user_roles',
    '  ├── user_permissions',
    '  │',
    '  └── invitations',
    '       │ N:1',
    '       └── clients',
    '            │ 1:N',
    '            ├── client_assignments',
    '            │',
    '            └── business_processes',
    '                 │ 1:N',
    '                 ├── process_steps',
    '                 │    │ 1:N',
    '                 │    ├── risks → controls',
    '                 │    ├── regulations',
    '                 │    ├── incidents',
    '                 │    ├── step_applications (self-ref)',
    '                 │    ├── step_connections (self-ref)',
    '                 │    └── mainframe_flows (max 1/step)',
    '                 │         │ 1:N',
    '                 │         ├── mainframe_flow_nodes',
    '                 │         │    │ 1:N',
    '                 │         │    └── mainframe_flow_connections',
    '                 │         └── mainframe_imports',
    '                 │',
    '                 ├── process_raci ──M:N──> process_raci_step_links',
    '                 ├── risk_matrices → risk_matrix_cells',
    '                 └── mf_questions',
    '',
    'Cross-cutting (polymorphic):',
    '  entity_comments, entity_attachments, activity_log',
    '',
    'Configuration: page_visibility',
  ]);

  b.spacer(4);
  b.h2('Relationship Legend');
  b.table(
    ['Notation', 'Meaning'],
    [
      ['1:1', 'One-to-One (e.g., auth.users ↔ profiles)'],
      ['1:N', 'One-to-Many (e.g., clients → business_processes)'],
      ['M:N', 'Many-to-Many via junction table (e.g., process_raci ↔ steps)'],
      ['Self-ref', 'Self-referencing FK (e.g., step_applications.parent_id)'],
    ],
    [cw * 0.25, cw * 0.75]
  );

  /* ── 4. Enumerations ── */
  b.newPage();
  b.h1('4. Enumerations');
  b.h2('app_role');
  b.para('Defines the application-wide user roles used for RBAC.');
  b.table(
    ['Value', 'Description'],
    [
      ['root', 'Super-administrator with unrestricted access'],
      ['admin', 'Full administrative privileges'],
      ['user', 'Standard user (default for new registrations)'],
      ['team_coordinator', 'Internal team lead with elevated process access'],
      ['team_participant', 'Internal team member with restricted access'],
      ['client_coordinator', 'External client lead'],
      ['client_participant', 'External client member with limited access'],
    ],
    [cw * 0.3, cw * 0.7]
  );

  /* ── 5. Tables ── */
  b.newPage();
  b.h1('5. Tables');

  // Define all tables compactly
  const tables: Array<{
    num: string; name: string; desc: string;
    cols: string[][]; fks?: string[]; rls?: string;
  }> = [
    {
      num: '5.1', name: 'profiles', desc: 'Stores extended user profile information. Created automatically upon user registration via handle_new_user() trigger.',
      cols: [
        ['id', 'uuid', 'PK, gen_random_uuid()'],
        ['user_id', 'uuid', 'NOT NULL, refs auth.users.id'],
        ['display_name', 'text', 'Nullable'],
        ['avatar_url', 'text', 'Nullable'],
        ['job_title', 'text', 'Nullable'],
        ['department', 'text', 'Nullable'],
        ['status', 'text', 'Default: active'],
        ['last_sign_in', 'timestamptz', 'Nullable'],
        ['created_at', 'timestamptz', 'Default: now()'],
        ['updated_at', 'timestamptz', 'Default: now()'],
      ],
      rls: 'SELECT: all authenticated; INSERT/UPDATE: own profile only',
    },
    {
      num: '5.2', name: 'user_roles', desc: 'Maps users to their application roles. A user may have exactly one role.',
      cols: [
        ['id', 'uuid', 'PK'],
        ['user_id', 'uuid', 'NOT NULL, refs auth.users.id'],
        ['role', 'app_role', 'NOT NULL, enum'],
      ],
      rls: 'SELECT: all authenticated; ALL: admin only',
    },
    {
      num: '5.3', name: 'user_permissions', desc: 'Fine-grained permission overrides per user, controlling page and module access.',
      cols: [
        ['id', 'uuid', 'PK'],
        ['user_id', 'uuid', 'NOT NULL'],
        ['allowed_pages', 'text[]', 'Default: all pages'],
        ['allowed_modules', 'text[]', 'Default: all modules'],
        ['excluded_process_ids', 'uuid[]', 'Default: {}'],
        ['created_at / updated_at', 'timestamptz', 'Auto-managed'],
      ],
      rls: 'SELECT: own; ALL: admin',
    },
    {
      num: '5.4', name: 'invitations', desc: 'Manages user invitations with token-based acceptance and role pre-assignment.',
      cols: [
        ['id', 'uuid', 'PK'],
        ['email', 'text', 'NOT NULL'],
        ['role', 'app_role', 'Default: team_participant'],
        ['token', 'text', 'gen_random_bytes(32) hex'],
        ['status', 'text', 'Default: pending'],
        ['client_id', 'uuid', 'Nullable FK → clients'],
        ['invited_by', 'uuid', 'Nullable'],
        ['expires_at', 'timestamptz', 'now() + 7 days'],
        ['accepted_at', 'timestamptz', 'Nullable'],
      ],
      fks: ['client_id → clients.id'],
      rls: 'ALL: admin; SELECT: own email match',
    },
    {
      num: '5.5', name: 'clients', desc: 'Client/engagement entity representing an external organization being served.',
      cols: [
        ['id', 'uuid', 'PK'],
        ['name', 'text', 'NOT NULL'],
        ['industry / entity_type', 'text', 'Nullable'],
        ['status', 'text', 'Default: active'],
        ['wbs_code', 'text', 'Work Breakdown Structure code'],
        ['engagement_mode', 'text', 'Default: audit'],
        ['engagement_period_start/end', 'date', 'Nullable'],
        ['report_issuance_date', 'date', 'Nullable'],
        ['contact_person/email/phone', 'text', 'Nullable'],
        ['address / notes', 'text', 'Nullable'],
      ],
      rls: 'SELECT: admin=all, others=assigned; CUD: admin only',
    },
    {
      num: '5.6', name: 'client_assignments', desc: 'Links users to clients they are authorized to access.',
      cols: [
        ['id', 'uuid', 'PK'],
        ['user_id', 'uuid', 'NOT NULL'],
        ['client_id', 'uuid', 'FK → clients.id'],
        ['assigned_by', 'uuid', 'Nullable'],
      ],
      fks: ['client_id → clients.id'],
      rls: 'ALL: admin; SELECT: own assignments',
    },
    {
      num: '5.7', name: 'business_processes', desc: 'Core entity representing a business process under analysis.',
      cols: [
        ['id', 'uuid', 'PK'],
        ['process_name', 'text', 'NOT NULL'],
        ['client_id', 'uuid', 'Nullable FK → clients'],
        ['owner / department', 'text', 'Nullable'],
        ['description', 'text', 'Nullable'],
        ['mf_ai_potential', 'text', 'Default: medium'],
        ['image_url', 'text', 'Process diagram URL'],
      ],
      fks: ['client_id → clients.id'],
      rls: 'SELECT: client access or no client; CUD: admin or client access',
    },
    {
      num: '5.8', name: 'process_steps', desc: 'Individual steps/nodes within a business process (EPC diagram nodes).',
      cols: [
        ['id', 'uuid', 'PK'],
        ['process_id', 'uuid', 'FK → business_processes'],
        ['label', 'text', 'NOT NULL'],
        ['type', 'text', 'in-scope, interface, event, xor, start-end, etc.'],
        ['step_type', 'text', 'critical, mechanical, decisional'],
        ['interface_subtype', 'text', 'default, input, output'],
        ['description', 'text', 'Nullable'],
        ['position_index', 'integer', 'Default: 0'],
      ],
      rls: 'CRUD via can_access_process(); DELETE: also admin',
    },
    {
      num: '5.9', name: 'step_connections', desc: 'Directed edges between process steps in the EPC diagram.',
      cols: [
        ['id', 'uuid', 'PK'],
        ['process_id', 'uuid', 'FK → business_processes'],
        ['source_step_id', 'uuid', 'FK → process_steps'],
        ['target_step_id', 'uuid', 'FK → process_steps'],
        ['label', 'text', 'Nullable'],
      ],
    },
    {
      num: '5.10', name: 'risks', desc: 'Risk scenarios associated with a specific process step.',
      cols: [
        ['id', 'uuid', 'PK'],
        ['step_id', 'uuid', 'FK → process_steps'],
        ['process_id', 'uuid', 'FK → business_processes'],
        ['description', 'text', 'NOT NULL'],
        ['likelihood', 'text', 'low, medium, high'],
        ['impact', 'text', 'low, medium, high'],
      ],
    },
    {
      num: '5.11', name: 'controls', desc: 'Mitigation controls linked to identified risks.',
      cols: [
        ['id', 'uuid', 'PK'],
        ['risk_id', 'uuid', 'FK → risks'],
        ['name', 'text', 'NOT NULL'],
        ['description', 'text', 'Nullable'],
        ['type', 'text', 'preventive, detective, corrective'],
        ['effectiveness', 'text', 'effective, partial, ineffective'],
      ],
      fks: ['risk_id → risks.id'],
    },
    {
      num: '5.12', name: 'regulations', desc: 'Regulatory compliance records associated with process steps.',
      cols: [
        ['id', 'uuid', 'PK'],
        ['step_id / process_id', 'uuid', 'FKs → steps / processes'],
        ['name', 'text', 'NOT NULL'],
        ['description', 'text', 'Nullable'],
        ['authority', 'text', 'Nullable'],
        ['compliance_status', 'text', 'compliant, partial, non-compliant'],
      ],
    },
    {
      num: '5.13', name: 'incidents', desc: 'Incident records linked to process steps, with ERM classification.',
      cols: [
        ['id', 'uuid', 'PK'],
        ['step_id / process_id', 'uuid', 'FKs → steps / processes'],
        ['title', 'text', 'NOT NULL'],
        ['description', 'text', 'Nullable'],
        ['severity', 'text', 'low, medium, high, critical'],
        ['status', 'text', 'open, investigating, resolved, closed'],
        ['date', 'timestamptz', 'Nullable'],
        ['erm_category / erm_notes', 'text', 'ERM fields'],
        ['financial_impact', 'text', 'Estimated impact'],
      ],
    },
    {
      num: '5.14', name: 'step_applications', desc: 'Applications and screens linked to process steps, supporting parent-child hierarchy.',
      cols: [
        ['id', 'uuid', 'PK'],
        ['step_id / process_id', 'uuid', 'FKs → steps / processes'],
        ['name', 'text', 'NOT NULL'],
        ['screen_name', 'text', 'Screen identifier'],
        ['app_type', 'text', 'application or screen'],
        ['parent_id', 'uuid', 'Self-referencing FK'],
        ['application_owner', 'text', 'Nullable'],
        ['business_analyst_business/it', 'text', 'Analyst names'],
        ['platform', 'text', 'IT platform'],
      ],
    },
    {
      num: '5.15', name: 'process_raci', desc: 'RACI matrix roles defined at the business process level.',
      cols: [
        ['id', 'uuid', 'PK'],
        ['process_id', 'uuid', 'FK → business_processes'],
        ['role_name', 'text', 'NOT NULL'],
        ['responsible / accountable', 'text', 'RACI assignments'],
        ['consulted / informed', 'text', 'RACI assignments'],
      ],
    },
    {
      num: '5.16', name: 'process_raci_step_links', desc: 'Many-to-many link connecting process-level RACI roles to specific steps.',
      cols: [
        ['id', 'uuid', 'PK'],
        ['raci_id', 'uuid', 'FK → process_raci'],
        ['step_id', 'uuid', 'FK → process_steps'],
      ],
    },
    {
      num: '5.17', name: 'step_raci (Legacy)', desc: 'Original step-level RACI table. Retained for backward compatibility.',
      cols: [
        ['id', 'uuid', 'PK'],
        ['step_id / process_id', 'uuid', 'FKs'],
        ['role_name', 'text', 'NOT NULL'],
        ['R / A / C / I', 'text', 'RACI assignments'],
      ],
    },
    {
      num: '5.18', name: 'mainframe_flows', desc: 'Technical mainframe flow diagram linked to a process step. One flow per step maximum.',
      cols: [
        ['id', 'uuid', 'PK'],
        ['process_id', 'uuid', 'FK → business_processes'],
        ['step_id', 'uuid', 'FK → process_steps'],
        ['name', 'text', 'Default: Mainframe Flow'],
        ['description', 'text', 'Nullable'],
      ],
    },
    {
      num: '5.19', name: 'mainframe_flow_nodes', desc: 'Infrastructure nodes within a mainframe flow diagram.',
      cols: [
        ['id', 'uuid', 'PK'],
        ['flow_id', 'uuid', 'FK → mainframe_flows'],
        ['label', 'text', 'NOT NULL'],
        ['node_type', 'text', 'program, database, lpar, subsystem, etc.'],
        ['description', 'text', 'Nullable'],
      ],
    },
    {
      num: '5.20', name: 'mainframe_flow_connections', desc: 'Directed edges between mainframe flow nodes.',
      cols: [
        ['id', 'uuid', 'PK'],
        ['flow_id', 'uuid', 'FK → mainframe_flows'],
        ['source_node_id / target_node_id', 'uuid', 'FKs → flow_nodes'],
        ['label', 'text', 'Nullable'],
        ['connection_type', 'text', 'call, data, trigger'],
      ],
    },
    {
      num: '5.21', name: 'mainframe_imports', desc: 'Data source/import records linked to mainframe infrastructure nodes.',
      cols: [
        ['id', 'uuid', 'PK'],
        ['process_id', 'uuid', 'FK → business_processes'],
        ['step_id / flow_id / flow_node_id', 'uuid', 'Nullable FKs'],
        ['source_name', 'text', 'NOT NULL'],
        ['source_type', 'text', 'Default: DB2'],
        ['dataset_name', 'text', 'Nullable'],
        ['record_count', 'integer', 'Default: 0'],
        ['status', 'text', 'Default: active'],
        ['file_url', 'text', 'Attached file URL'],
      ],
    },
    {
      num: '5.22', name: 'mf_questions', desc: 'AI-generated or manually entered Q&A records for process analysis.',
      cols: [
        ['id', 'uuid', 'PK'],
        ['process_id', 'uuid', 'FK → business_processes'],
        ['question', 'text', 'NOT NULL'],
        ['answer', 'text', 'Nullable'],
        ['confidence', 'numeric', '0–100'],
        ['category', 'text', 'Nullable'],
      ],
    },
    {
      num: '5.23', name: 'risk_matrices', desc: 'Configurable risk assessment matrices per business process (1:1).',
      cols: [
        ['id', 'uuid', 'PK'],
        ['process_id', 'uuid', 'FK → business_processes (UNIQUE)'],
        ['name', 'text', 'Default: Risk Matrix'],
        ['matrix_type', 'text', 'Default: user-defined'],
        ['frequency_levels / impact_levels', 'text[]', 'Default: {VL,L,M,H,VH}'],
      ],
    },
    {
      num: '5.24', name: 'risk_matrix_cells', desc: 'Individual cells within a risk matrix, defining acceptable/unacceptable zones.',
      cols: [
        ['id', 'uuid', 'PK'],
        ['matrix_id', 'uuid', 'FK → risk_matrices'],
        ['frequency_level / impact_level', 'text', 'Axis values'],
        ['acceptable', 'boolean', 'Default: false'],
      ],
    },
    {
      num: '5.25', name: 'entity_comments', desc: 'Polymorphic comment/insight records attachable to any entity type.',
      cols: [
        ['id', 'uuid', 'PK'],
        ['entity_id / entity_type', 'uuid / text', 'Polymorphic target'],
        ['process_id', 'uuid', 'FK → business_processes'],
        ['comment / conclusion', 'text', 'Nullable'],
        ['author_id', 'uuid', 'Nullable'],
      ],
    },
    {
      num: '5.26', name: 'entity_attachments', desc: 'File attachments linked to any entity, with confidentiality classification.',
      cols: [
        ['id', 'uuid', 'PK'],
        ['entity_id / entity_type', 'uuid / text', 'Polymorphic target'],
        ['process_id', 'uuid', 'FK → business_processes'],
        ['file_name / file_url', 'text', 'NOT NULL'],
        ['file_type / file_size', 'text / bigint', 'Nullable'],
        ['is_confidential', 'boolean', 'Default: false'],
        ['uploaded_by', 'uuid', 'Nullable'],
      ],
    },
    {
      num: '5.27', name: 'activity_log', desc: 'Comprehensive audit trail populated by database triggers on all major tables.',
      cols: [
        ['id', 'uuid', 'PK'],
        ['user_id / user_email', 'uuid / text', 'Acting user'],
        ['action', 'text', 'created, updated, deleted'],
        ['entity_type / entity_id', 'text / uuid', 'Target entity'],
        ['entity_name', 'text', 'Human-readable name'],
        ['details', 'jsonb', 'Additional metadata'],
      ],
      rls: 'SELECT: all authenticated; INSERT: own user_id; UPDATE/DELETE: denied',
    },
    {
      num: '5.28', name: 'page_visibility', desc: 'Application configuration controlling which pages are visible to which roles.',
      cols: [
        ['id', 'uuid', 'PK'],
        ['page_slug', 'text', 'NOT NULL'],
        ['hidden_from_roles', 'text[]', 'Default: {}'],
      ],
      rls: 'SELECT: all authenticated; ALL: root only',
    },
  ];

  tables.forEach(t => {
    b.newPage();
    b.h2(`${t.num}  ${t.name}`);
    b.para(t.desc);
    b.spacer(2);
    b.table(
      ['Column', 'Type', 'Details'],
      t.cols,
      [cw * 0.35, cw * 0.2, cw * 0.45]
    );
    if (t.fks && t.fks.length > 0) {
      b.h3('Foreign Keys');
      t.fks.forEach(fk => b.para(`• ${fk}`));
    }
    if (t.rls) {
      b.h3('RLS Policies');
      b.para(t.rls);
    }
  });

  /* ── 6. Functions ── */
  b.newPage();
  b.h1('6. Database Functions');

  b.h2('handle_new_user() — Trigger Function');
  b.para('Fires on INSERT to auth.users. Creates profile, checks invitations, assigns role, creates permissions.');

  b.h2('log_activity() — Trigger Function');
  b.para('Fires on INSERT/UPDATE/DELETE on major tables. Logs action, user, entity type/name to activity_log.');

  b.h2('has_role(_user_id, _role) → boolean');
  b.para('Security-definer function. Checks if a user has a specific role. Root users implicitly have all roles.');

  b.h2('is_root(_user_id) → boolean');
  b.para('Security-definer. Returns true if the user has the root role.');

  b.h2('is_participant(_user_id) → boolean');
  b.para('Security-definer. Returns true if the user has team_participant or client_participant role.');

  b.h2('can_access_client(_user_id, _client_id) → boolean');
  b.para('Security-definer. Returns true if admin/root OR has client_assignments entry.');

  b.h2('can_access_process(_user_id, _process_id) → boolean');
  b.para('Security-definer. Returns true if admin/root, OR has client access AND process is not excluded.');

  b.h2('update_updated_at_column() — Trigger Function');
  b.para('Automatically sets updated_at = now() on the modified row.');

  /* ── 7. Triggers ── */
  b.newPage();
  b.h1('7. Triggers');
  b.para('Activity logging triggers are attached to the following 14 tables, firing on INSERT, UPDATE, and DELETE:');
  b.table(
    ['Table', 'Trigger Function'],
    [
      ['business_processes', 'log_activity()'],
      ['process_steps', 'log_activity()'],
      ['step_connections', 'log_activity()'],
      ['risks', 'log_activity()'],
      ['controls', 'log_activity()'],
      ['regulations', 'log_activity()'],
      ['incidents', 'log_activity()'],
      ['step_applications', 'log_activity()'],
      ['mainframe_flows', 'log_activity()'],
      ['mainframe_flow_nodes', 'log_activity()'],
      ['mainframe_imports', 'log_activity()'],
      ['mf_questions', 'log_activity()'],
      ['clients', 'log_activity()'],
      ['process_raci', 'log_activity()'],
    ],
    [cw * 0.5, cw * 0.5]
  );
  b.spacer(4);
  b.para('The update_updated_at_column() trigger is attached to all tables with an updated_at column.');

  /* ── 8. RLS ── */
  b.newPage();
  b.h1('8. Row-Level Security (RLS) Policies');
  b.para('All tables have RLS enabled. The security model follows these principles:');
  b.spacer(2);
  const rlsRules = [
    'Root users bypass all restrictions via the has_role() function',
    'Admin users have full CRUD access on most tables',
    'Regular users access data based on client assignments and process access',
    'Participants have read access with limited write capabilities',
    'Process-level access is determined by can_access_process() which checks client assignment and exclusion lists',
    'Polymorphic tables (comments, attachments) use process_id for access control',
  ];
  rlsRules.forEach((r, i) => b.para(`${i + 1}. ${r}`));

  /* ── 9. Storage ── */
  b.spacer(4);
  b.h1('9. Storage Buckets');
  b.table(
    ['Bucket Name', 'Public', 'Purpose'],
    [
      ['process-images', 'Yes', 'Business process diagram images'],
      ['import-files', 'Yes', 'Mainframe import data files'],
      ['entity-attachments', 'Yes', 'General entity file attachments'],
    ],
    [cw * 0.3, cw * 0.15, cw * 0.55]
  );

  /* ── 10. Index Strategy ── */
  b.spacer(4);
  b.h1('10. Index Strategy');
  b.para('Primary keys (id columns) are automatically indexed. Foreign key columns benefit from implicit index usage in JOIN operations. The following columns are recommended for explicit indexing in production:');
  b.table(
    ['Table', 'Recommended Index Columns'],
    [
      ['business_processes', 'client_id'],
      ['process_steps', 'process_id'],
      ['risks', 'process_id, step_id'],
      ['controls', 'risk_id'],
      ['regulations', 'process_id, step_id'],
      ['incidents', 'process_id, step_id'],
      ['mainframe_imports', 'process_id, flow_id'],
      ['activity_log', 'entity_type, created_at'],
      ['client_assignments', 'user_id, client_id'],
      ['user_roles', 'user_id'],
    ],
    [cw * 0.4, cw * 0.6]
  );

  b.save('MF_AI_Database_Schema_v1.0.pdf');
}

/* ═══════════════════════════════════════════════════════ */
/*         APPLICATION ARCHITECTURE PDF                    */
/* ═══════════════════════════════════════════════════════ */

export function exportArchitecturePDF() {
  const b = new DocPDF('Application Architecture Documentation');
  const { doc, m, pw, ph, cw } = b;

  /* ── Cover Page ── */
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, pw, 5, 'F');

  let y = 30;
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

  y = 72;
  doc.setTextColor(...C.dark);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('Application Architecture', m, y);
  y += 12;
  doc.text('Documentation', m, y);
  y += 14;

  doc.setTextColor(...C.muted);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Complete System & Component Reference', m, y);
  y += 14;

  doc.setDrawColor(...C.primary);
  doc.setLineWidth(1);
  doc.line(m, y, m + 50, y);
  y += 14;

  // Meta box
  doc.setFillColor(...C.light);
  doc.roundedRect(m, y, cw, 30, 3, 3, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.primary);
  doc.text('DOCUMENT DETAILS', m + 8, y + 8);
  doc.setDrawColor(...C.primary);
  doc.setLineWidth(0.3);
  doc.line(m + 8, y + 11, m + 50, y + 11);

  const meta = [
    ['Version', '1.0'],
    ['Date', 'March 6, 2026'],
    ['Classification', 'Internal — Confidential'],
    ['Host OS', 'Ubuntu 24.04 LTS (VMware ESXi 8.0)'],
    ['Tools', 'Bob AI / Visual Studio Code'],
  ];

  let my2 = y + 17;
  doc.setFontSize(8);
  meta.forEach(([k, v]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.muted);
    doc.text(`${k}:`, m + 8, my2);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.dark);
    doc.text(v, m + 38, my2);
    my2 += 4.5;
  });

  y += 38;

  doc.setFillColor(...C.primary);
  doc.roundedRect(m, y, cw, 14, 3, 3, 'F');
  doc.setTextColor(...C.white);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('PLATFORM OVERVIEW', m + 6, y + 6);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('React 18.3 SPA • TypeScript • Tailwind CSS • PostgreSQL 15 • Deno Edge Functions • GoTrue Auth', m + 6, y + 11);

  doc.setTextColor(...C.muted);
  doc.setFontSize(6.5);
  doc.text('Confidential — For Authorized Recipients Only', m, ph - 12);
  doc.setFillColor(...C.primary);
  doc.rect(0, ph - 3, pw, 3, 'F');

  /* ── TOC ── */
  b.newPage();
  b.h1('Table of Contents');
  const toc = [
    '1.  Executive Summary',
    '2.  System Architecture Overview',
    '3.  Infrastructure & Deployment',
    '4.  Technology Stack',
    '5.  Application Layers',
    '6.  Frontend Architecture',
    '7.  Backend Architecture',
    '8.  Data Architecture',
    '9.  Security Architecture',
    '10. Feature Modules (13 modules)',
    '11. Integration Architecture',
    '12. Export Capabilities',
    '13. Diagrams',
  ];
  toc.forEach(item => {
    b.ensure(7);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.dark);
    doc.text(item, m + 6, b.y + 4);
    b.y += 7;
  });

  /* ── 1. Executive Summary ── */
  b.newPage();
  b.h1('1. Executive Summary');
  b.para('MF AI is an enterprise-grade Business Process Management and Governance, Risk & Compliance (GRC) platform designed for audit and consulting firms. The application provides Business Process Modeling using EPC notation, Risk Assessment & Control Mapping, Regulatory Compliance Tracking, Incident Management with ERM categorization, Mainframe Technical Flow Analysis, AI-Powered Analysis for scenario analysis and reporting, Multi-tenant Client Management with fine-grained RBAC, and Comprehensive Audit Trail for all data modifications.');
  b.spacer(2);
  b.para('The platform is built as a single-page application (SPA) with a PostgreSQL-backed API layer and serverless edge functions for compute-intensive operations.');

  /* ── 2. System Architecture Overview ── */
  b.newPage();
  b.h1('2. System Architecture Overview');
  b.codeBlock([
    '┌──────────────────────────────────────────────────────┐',
    '│                 CLIENT BROWSER                        │',
    '│  ┌──────────────────────────────────────────────┐    │',
    '│  │          React SPA (Vite Build)               │    │',
    '│  │  Pages | Components | Hooks | TanStack Query  │    │',
    '│  └────────────────────┬─────────────────────────┘    │',
    '└───────────────────────┼──────────────────────────────┘',
    '                        │ HTTPS',
    '                        ▼',
    '┌──────────────────────────────────────────────────────┐',
    '│            APPLICATION SERVER (Ubuntu VM)             │',
    '│                                                      │',
    '│  Nginx ──> PostgREST (REST API)    Edge Functions    │',
    '│                  │                 (Deno Runtime)     │',
    '│                  │                 • extract-diagram  │',
    '│                  ▼                 • generate-report  │',
    '│            PostgreSQL 15           • invite-user      │',
    '│            (public + auth)                            │',
    '│                                                      │',
    '│  GoTrue Auth (JWT + MFA/TOTP)    S3 File Storage     │',
    '└──────────────────────────────────────────────────────┘',
  ]);

  /* ── 3. Infrastructure ── */
  b.newPage();
  b.h1('3. Infrastructure & Deployment');
  b.table(
    ['Component', 'Specification'],
    [
      ['Hypervisor', 'VMware ESXi 8.0'],
      ['Guest OS', 'Ubuntu 24.04 LTS (Server)'],
      ['IDE', 'Visual Studio Code (remote SSH)'],
      ['AI Assistant', 'Bob AI (integrated code assistant)'],
      ['Web Server', 'Nginx 1.24 (reverse proxy + static serving)'],
      ['Runtime', 'Node.js 20 LTS (build), Deno 1.40+ (edge functions)'],
      ['Database', 'PostgreSQL 15.6'],
      ['Process Manager', 'systemd'],
    ],
    [cw * 0.35, cw * 0.65]
  );
  b.spacer(4);
  b.h2('Build & Deployment Pipeline');
  b.codeBlock([
    'Developer Workstation (VS Code + Bob AI)',
    '    │ git push',
    '    ▼',
    'Git Repository (main branch)',
    '    │ CI/CD Hook',
    '    ▼',
    'Build Server (npm run build → Vite → dist/)',
    '    │ rsync/scp',
    '    ▼',
    'Ubuntu VM (Nginx) — /var/www/mf-ai/dist/',
  ]);

  /* ── 4. Technology Stack ── */
  b.newPage();
  b.h1('4. Technology Stack');
  b.h2('Frontend');
  b.table(
    ['Technology', 'Version', 'Purpose'],
    [
      ['React', '18.3', 'UI component framework'],
      ['TypeScript', '5.x', 'Type-safe development'],
      ['Vite', '5.x', 'Build tool and dev server'],
      ['Tailwind CSS', '3.x', 'Utility-first CSS framework'],
      ['shadcn/ui', 'Latest', 'Accessible component library (Radix UI)'],
      ['TanStack React Query', '5.x', 'Server state management and caching'],
      ['React Router DOM', '6.x', 'Client-side routing'],
      ['@xyflow/react', '12.x', 'Interactive diagram/flowchart editor'],
      ['Recharts', '2.x', 'Data visualization and charts'],
      ['react-hook-form', '7.x', 'Form handling'],
      ['Zod', '3.x', 'Schema validation'],
    ],
    [cw * 0.3, cw * 0.15, cw * 0.55]
  );
  b.spacer(4);
  b.h2('Backend');
  b.table(
    ['Technology', 'Version', 'Purpose'],
    [
      ['PostgreSQL', '15.6', 'Primary database'],
      ['PostgREST', '12.x', 'Auto-generated REST API from schema'],
      ['GoTrue', '2.x', 'Authentication (JWT, MFA/TOTP)'],
      ['Deno', '1.40+', 'Edge function runtime'],
      ['S3-compatible Storage', '—', 'File/object storage'],
    ],
    [cw * 0.3, cw * 0.15, cw * 0.55]
  );
  b.spacer(4);
  b.h2('Export & Utility Libraries');
  b.table(
    ['Library', 'Purpose'],
    [
      ['jsPDF', 'PDF document generation'],
      ['xlsx (SheetJS)', 'Excel spreadsheet export'],
      ['html2canvas', 'DOM-to-image capture'],
      ['Tesseract.js', 'OCR (Optical Character Recognition)'],
      ['dagre', 'Automatic graph/diagram layout'],
    ],
    [cw * 0.3, cw * 0.7]
  );

  /* ── 5. Application Layers ── */
  b.newPage();
  b.h1('5. Application Layers');
  b.codeBlock([
    '┌──────────────────────────────────────────────────┐',
    '│              PRESENTATION LAYER                   │',
    '│  Pages, Components, UI Kit (shadcn/ui + TW)      │',
    '├──────────────────────────────────────────────────┤',
    '│               ROUTING LAYER                       │',
    '│  React Router DOM (protected routes, MFA gates)  │',
    '├──────────────────────────────────────────────────┤',
    '│           STATE MANAGEMENT LAYER                  │',
    '│  TanStack React Query + React Context             │',
    '├──────────────────────────────────────────────────┤',
    '│             DATA ACCESS LAYER                     │',
    '│  API modules (api.ts, api-applications.ts, ...)  │',
    '├──────────────────────────────────────────────────┤',
    '│           BACKEND SERVICES LAYER                  │',
    '│  PostgREST, Edge Functions, GoTrue, S3 Storage   │',
    '├──────────────────────────────────────────────────┤',
    '│              DATABASE LAYER                       │',
    '│  PostgreSQL 15 (RLS, triggers, functions)        │',
    '└──────────────────────────────────────────────────┘',
  ]);

  /* ── 6. Frontend Architecture ── */
  b.newPage();
  b.h1('6. Frontend Architecture');

  b.h2('6.1 Project Structure');
  b.codeBlock([
    'src/',
    '├── main.tsx                 # Application entry point',
    '├── App.tsx                  # Root component, routing',
    '├── index.css                # Tailwind directives & tokens',
    '├── assets/                  # Static assets (logo, etc.)',
    '├── components/              # Reusable components',
    '│   ├── ui/                  # shadcn/ui (40+ components)',
    '│   ├── risk-matrix/         # Risk matrix sub-components',
    '│   ├── DiagramCanvasEditor  # EPC diagram canvas',
    '│   ├── MainframeFlowEditor  # MF flow diagram',
    '│   ├── ProcessEditTab       # Process data editing',
    '│   └── ... (20+ feature components)',
    '├── contexts/AuthContext.tsx  # Authentication state',
    '├── hooks/                   # Custom hooks (4)',
    '├── integrations/supabase/   # DB client + types (auto)',
    '├── lib/                     # API + utility modules (10)',
    '├── pages/                   # Route-level pages (30+)',
    '├── types/epc.ts             # EPC type interfaces',
    '└── test/                    # Test files',
  ]);

  b.h2('6.2 Routing & Navigation');
  b.para('The application uses React Router DOM v6 with 30+ routes. Key routes include:');
  b.table(
    ['Route', 'Page', 'Access'],
    [
      ['/', 'Dashboard', 'Protected'],
      ['/auth', 'Login / Registration', 'Public only'],
      ['/admin', 'Admin Dashboard', 'Protected (admin)'],
      ['/clients', 'Client Management', 'Protected'],
      ['/processes', 'Business Processes', 'Protected'],
      ['/process-view/:id', 'Process Read-Only', 'Protected'],
      ['/risks', 'Risks & Controls', 'Protected'],
      ['/regulations', 'Regulations', 'Protected'],
      ['/incidents', 'Incidents', 'Protected'],
      ['/mainframe-flows', 'MF Flow Hub', 'Protected'],
      ['/ai-reports', 'AI Reports', 'Protected'],
      ['/analytics', 'Visual Analytics', 'Protected'],
      ['/activity-log', 'Activity Log', 'Protected'],
    ],
    [cw * 0.35, cw * 0.3, cw * 0.35]
  );

  b.newPage();
  b.h2('6.3 Route Protection Flow');
  b.codeBlock([
    'User Request',
    '  │',
    '  ├─ Authenticated? ──NO──> Redirect /auth',
    '  │   YES',
    '  ├─ Is Root? ──YES──> Render Page',
    '  │   NO',
    '  ├─ MFA Enrolled? ──NO──> Enroll MFA',
    '  │   YES',
    '  ├─ MFA Verified? ──NO──> Verify MFA',
    '  │   YES',
    '  ├─ Page Permission Check (pageSlug)',
    '  │   │',
    '  │   ├─ YES ──> Render Page',
    '  │   └─ NO  ──> Access Restricted',
  ]);

  b.h2('6.4 State Management');
  b.table(
    ['Concern', 'Solution'],
    [
      ['Server state (DB data)', 'TanStack React Query v5'],
      ['Authentication state', 'React Context (AuthContext)'],
      ['Permission state', 'React Hook (usePermissions)'],
      ['UI state', 'React useState / useReducer'],
      ['Column settings', 'localStorage (useColumnSettings)'],
      ['Toast notifications', 'Radix-based toast system'],
    ],
    [cw * 0.4, cw * 0.6]
  );

  b.h2('6.5 Component Architecture');
  b.codeBlock([
    'Page Components (src/pages/)',
    '  ├── Layout Components',
    '  │   ├── AppLayout (sidebar + main)',
    '  │   ├── AppHeader (top nav bar)',
    '  │   └── AppSidebar (collapsible nav)',
    '  ├── Feature Components (src/components/)',
    '  │   ├── DiagramCanvasEditor (EPC)',
    '  │   ├── MainframeFlowEditor (MF)',
    '  │   ├── NodeDetailPanel',
    '  │   ├── RiskMatrixEditor',
    '  │   └── UserPermissionsEditor',
    '  └── Base UI (src/components/ui/) — 40+ shadcn/ui',
  ]);

  /* ── 7. Backend ── */
  b.newPage();
  b.h1('7. Backend Architecture');

  b.h2('7.1 Database Layer');
  b.para('PostgreSQL 15 with Row-Level Security (RLS) on all tables, security-definer functions for access control, trigger-based audit logging, automatic timestamp management, and user onboarding automation. See DATABASE_SCHEMA.md for complete reference.');

  b.h2('7.2 Edge Functions (Serverless)');
  b.table(
    ['Function', 'Purpose'],
    [
      ['extract-diagram', 'Processes uploaded diagram images using AI to extract EPC nodes and connections'],
      ['generate-ai-report', 'Generates comprehensive AI analysis reports for business processes'],
      ['invite-user', 'Sends invitation emails with role pre-assignment'],
    ],
    [cw * 0.3, cw * 0.7]
  );
  b.spacer(2);
  b.codeBlock([
    'Client Request',
    '  │',
    '  ▼',
    'Edge Function (Deno Runtime)',
    '  ├── Request Validation',
    '  ├── DB Access (Service Role Key)',
    '  └── External AI Service (Bob AI / Gemini)',
  ]);

  b.h2('7.3 File Storage');
  b.table(
    ['Bucket', 'Access', 'Content'],
    [
      ['process-images', 'Public', 'Business process diagram images'],
      ['import-files', 'Public', 'Mainframe import data files'],
      ['entity-attachments', 'Public', 'General file attachments (confidentiality at DB level)'],
    ],
    [cw * 0.25, cw * 0.15, cw * 0.6]
  );

  b.h2('7.4 Authentication Service');
  b.para('GoTrue-based authentication providing: Email/password auth, email verification (mandatory), password reset, TOTP-based MFA, JWT token management with refresh, and user metadata storage.');

  /* ── 8. Data Architecture ── */
  b.newPage();
  b.h1('8. Data Architecture');

  b.h2('8.1 Entity Hierarchy');
  b.codeBlock([
    'Level 1: Client',
    '  │ 1:N',
    'Level 2: Business Process',
    '  │ 1:N',
    'Level 3: Process Step (EPC Node)',
    '  ├── Risks → Controls',
    '  ├── Regulations, Incidents',
    '  ├── Applications / Screens',
    '  ├── RACI (inherited from process)',
    '  │ 1:1 (max one per step)',
    'Level 4: Mainframe Flow',
    '  │ 1:N',
    'Level 5: Infrastructure Node (LPAR, DB, Subsystem)',
    '  │ 1:N',
    'Level 5b: Data Sources (Mainframe Imports)',
  ]);

  b.h2('8.2 Data Access Patterns');
  b.table(
    ['Pattern', 'Implementation'],
    [
      ['Process-scoped queries', 'All queries filter by process_id'],
      ['Client-scoped access', 'RLS via can_access_process() → can_access_client()'],
      ['Cascading metadata', 'Risks, controls, regulations belong to steps'],
      ['RACI inheritance', 'Process-level RACI linked via junction table'],
      ['Polymorphic attachments', 'entity_type + entity_id pattern'],
      ['Audit trail', 'Automatic via database triggers'],
    ],
    [cw * 0.35, cw * 0.65]
  );

  b.h2('8.3 API Layer');
  b.table(
    ['Module', 'Responsibility'],
    [
      ['api.ts', 'Core: processes, steps, risks, controls, regulations, incidents, imports, clients'],
      ['api-applications.ts', 'Step applications CRUD'],
      ['api-comments.ts', 'Entity comments and attachments CRUD'],
      ['api-mainframe-flows.ts', 'Mainframe flows, nodes, connections CRUD'],
      ['api-raci.ts', 'Process-level RACI and step linking'],
      ['api-risk-matrix.ts', 'Risk matrices and cells CRUD'],
    ],
    [cw * 0.35, cw * 0.65]
  );

  /* ── 9. Security Architecture ── */
  b.newPage();
  b.h1('9. Security Architecture');

  b.h2('9.1 Authentication Flow');
  b.codeBlock([
    'User Browser ──credentials──> GoTrue Service ──JWT──> Client App',
    '                                                        │',
    '                                             JWT in Auth Header',
    '                                                        │',
    '                                                        ▼',
    '                                               PostgREST (validates JWT)',
    '                                                        │',
    '                                                        ▼',
    '                                               PostgreSQL (RLS enforced)',
  ]);

  b.h2('9.2 Multi-Factor Authentication');
  b.para('Method: TOTP (Time-based One-Time Password). Enrollment: Mandatory for all non-root users on first login. Verification: Required each session. QR Code generated during enrollment for authenticator app setup.');

  b.h2('9.3 Role-Based Access Control');
  b.codeBlock([
    'ROLE HIERARCHY',
    '',
    'root ──> Full unrestricted access (MFA optional)',
    '  │',
    '  ├── admin ──> All CRUD, user/client management',
    '  │   ├── team_coordinator ──> Team-level access',
    '  │   │   └── team_participant ──> Limited team access',
    '  │   ├── client_coordinator ──> Client-specific access',
    '  │   │   └── client_participant ──> Limited client access',
    '  │   └── user ──> Default role (basic access)',
  ]);
  b.spacer(2);
  b.h3('Access Control Layers');
  b.para('1. Role check (user_roles) — base permissions');
  b.para('2. Client assignment (client_assignments) — which clients');
  b.para('3. Process access (can_access_process()) — client + exclusions');
  b.para('4. Page visibility (page_visibility + user_permissions) — which pages');
  b.para('5. Module permissions (allowed_modules) — which features');

  /* ── 10. Feature Modules ── */
  b.newPage();
  b.h1('10. Feature Modules');

  const modules: Array<{name: string; pages: string; desc: string}> = [
    { name: '10.1 Dashboard & Analytics', pages: 'Dashboard.tsx, VisualAnalytics.tsx', desc: 'Summary cards, BMF AI Potential distribution, risk severity charts, recent activity feed, interactive Recharts-based analytics.' },
    { name: '10.2 Client Management', pages: 'Clients.tsx, ClientReports.tsx', desc: 'Client CRUD with engagement details, client-to-user assignment, contact tracking, client-scoped report generation.' },
    { name: '10.3 Business Process Management', pages: 'BusinessProcesses.tsx, ProcessDetails.tsx, DataEntry.tsx', desc: 'Process CRUD, client association, owner/department assignment, BMF AI Potential rating, multi-tab editing interface.' },
    { name: '10.4 EPC Diagram Editor', pages: 'DiagramViewer.tsx, DiagramCanvasEditor.tsx', desc: 'Interactive EPC notation editing, 9 node types, step type classification, dagre auto-layout, node detail panel with linked metadata, PDF/image export.' },
    { name: '10.5 Risk & Controls Management', pages: 'RisksControls.tsx, Controls.tsx', desc: 'Risk identification per step, Likelihood × Impact assessment, control mapping (preventive/detective/corrective), configurable risk matrices.' },
    { name: '10.6 Regulatory Compliance', pages: 'Regulations.tsx', desc: 'Regulation tracking per step, compliance status management, regulatory authority recording.' },
    { name: '10.7 Incident Management', pages: 'Incidents.tsx', desc: 'Incident recording per step, severity classification, status tracking, ERM categorization, financial impact recording.' },
    { name: '10.8 RACI Matrix Management', pages: 'ProcessEditTab.tsx (RACI section)', desc: 'Process-level RACI role definition, multiple roles/functions, step-level inheritance via explicit linking.' },
    { name: '10.9 Application & Screen Registry', pages: 'ApplicationScreenDetails.tsx', desc: 'Hierarchical application/screen mapping, extended metadata (owner, BA Business, BA IT, IT Platform).' },
    { name: '10.10 Mainframe Flow Mapping', pages: 'MainframeFlowHub.tsx, MainframeImports.tsx', desc: 'Interactive MF flow diagrams, infrastructure node types, one flow per step max, data source linking, color-coded visualization, auto-save.' },
    { name: '10.11 AI Analysis & Reporting', pages: 'AIReports.tsx, BusinessScenarioAnalysis.tsx', desc: 'AI-powered scenario analysis, MF modernization analysis, BMF AI Potential questionnaire, AI report generation, OCR diagram extraction, Bob AI / Gemini integration.' },
    { name: '10.12 Activity Logging & Audit', pages: 'ActivityLog.tsx', desc: 'Automatic capture via triggers, user identification, clickable entries navigating to relevant entity/page, filterable feed.' },
    { name: '10.13 User & Permission Admin', pages: 'AdminDashboard.tsx, Profile.tsx', desc: 'User role assignment, invitation system, per-user page/module permissions, process exclusions, page visibility config (root only).' },
  ];

  modules.forEach(mod => {
    b.ensure(20);
    b.h2(mod.name);
    b.h3(`Pages: ${mod.pages}`);
    b.para(mod.desc);
    b.spacer(2);
  });

  /* ── 11. Integration ── */
  b.newPage();
  b.h1('11. Integration Architecture');
  b.codeBlock([
    '┌──────────────────────────────────────────────────┐',
    '│              MF AI APPLICATION                    │',
    '│                                                  │',
    '│  PostgREST (REST API)      GoTrue (Auth)         │',
    '│        │                      │                  │',
    '│        ▼                      ▼                  │',
    '│     PostgreSQL 15 (RLS, Triggers, Functions)     │',
    '│                                                  │',
    '│  S3 Storage (Files)       Edge Functions (Deno)  │',
    '│                                 │                │',
    '└─────────────────────────────────┼────────────────┘',
    '                                  │',
    '                    ┌─────────────┴──────────────┐',
    '                    │    External Services       │',
    '                    │  • Bob AI (LLM)            │',
    '                    │  • Gemini API              │',
    '                    │  • SMTP (Email)            │',
    '                    └────────────────────────────┘',
  ]);

  /* ── 12. Export ── */
  b.spacer(6);
  b.h1('12. Export Capabilities');
  b.table(
    ['Format', 'Library', 'Use Cases'],
    [
      ['PDF', 'jsPDF + html2canvas', 'Process reports, risk matrices, diagrams'],
      ['Excel', 'xlsx (SheetJS)', 'Data tables, risk registers, control matrices'],
      ['Image', 'html2canvas', 'Diagram snapshots, chart exports'],
    ],
    [cw * 0.15, cw * 0.3, cw * 0.55]
  );

  /* ── 13. Diagrams ── */
  b.newPage();
  b.h1('13. Component Dependency Graph');
  b.codeBlock([
    '                    App.tsx',
    '                      │',
    '         ┌────────────┼────────────┐',
    '         │            │            │',
    '    AuthProvider  QueryClient  TooltipProvider',
    '         │            │',
    '         ▼            ▼',
    '   ProtectedRoute ──> AppLayout',
    '         │                │',
    '         ▼                ├── AppHeader',
    '    Page Component        ├── AppSidebar',
    '         │                └── Main Content',
    '         │',
    '   ┌─────┼──────────┐',
    '   │     │          │',
    ' Feature Feature  Feature',
    '   │     │          │',
    '  ui/*  ui/*       ui/*  (shadcn)',
  ]);

  b.spacer(6);
  b.h1('14. Data Flow Architecture');
  b.codeBlock([
    'User Interaction',
    '  │',
    '  ▼',
    'React Component ──React Query mutation──> API Module',
    '  │                                       │',
    '  │ State Update                   Supabase Client',
    '  │                                       │',
    '  │                                       ▼',
    '  │                                PostgREST (REST → SQL)',
    '  │                                       │',
    '  │                                       ▼',
    '  │                                PostgreSQL (RLS enforced)',
    '  │                                  │ Trigger → activity_log',
    '  │  Cache Invalidation               │',
    '  │◄──── (React Query refetch) ◄──────┘',
    '  ▼',
    'UI Re-render',
  ]);

  b.save('MF_AI_Application_Architecture_v1.0.pdf');
}
