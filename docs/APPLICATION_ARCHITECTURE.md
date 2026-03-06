# MF AI — Application Architecture Documentation

**Document Version:** 1.0  
**Date:** March 6, 2026  
**Classification:** Internal — Confidential  
**Prepared by:** Engineering Team  
**Environment:** Ubuntu 24.04 LTS (VMware ESXi 8.0) / Bob AI / Visual Studio Code

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Infrastructure & Deployment](#3-infrastructure--deployment)
4. [Technology Stack](#4-technology-stack)
5. [Application Layers](#5-application-layers)
6. [Frontend Architecture](#6-frontend-architecture)
   - 6.1 [Project Structure](#61-project-structure)
   - 6.2 [Routing & Navigation](#62-routing--navigation)
   - 6.3 [Authentication & Authorization](#63-authentication--authorization)
   - 6.4 [State Management](#64-state-management)
   - 6.5 [Component Architecture](#65-component-architecture)
   - 6.6 [Design System & UI Framework](#66-design-system--ui-framework)
7. [Backend Architecture](#7-backend-architecture)
   - 7.1 [Database Layer](#71-database-layer)
   - 7.2 [Edge Functions (Serverless)](#72-edge-functions-serverless)
   - 7.3 [File Storage](#73-file-storage)
   - 7.4 [Authentication Service](#74-authentication-service)
8. [Data Architecture](#8-data-architecture)
   - 8.1 [Entity Hierarchy](#81-entity-hierarchy)
   - 8.2 [Data Access Patterns](#82-data-access-patterns)
   - 8.3 [API Layer](#83-api-layer)
9. [Security Architecture](#9-security-architecture)
   - 9.1 [Authentication Flow](#91-authentication-flow)
   - 9.2 [Multi-Factor Authentication](#92-multi-factor-authentication)
   - 9.3 [Role-Based Access Control](#93-role-based-access-control)
   - 9.4 [Row-Level Security](#94-row-level-security)
10. [Feature Modules](#10-feature-modules)
    - 10.1 [Dashboard & Analytics](#101-dashboard--analytics)
    - 10.2 [Client Management](#102-client-management)
    - 10.3 [Business Process Management](#103-business-process-management)
    - 10.4 [EPC Diagram Editor](#104-epc-diagram-editor)
    - 10.5 [Risk & Controls Management](#105-risk--controls-management)
    - 10.6 [Regulatory Compliance](#106-regulatory-compliance)
    - 10.7 [Incident Management](#107-incident-management)
    - 10.8 [RACI Matrix Management](#108-raci-matrix-management)
    - 10.9 [Application & Screen Registry](#109-application--screen-registry)
    - 10.10 [Mainframe Flow Mapping](#1010-mainframe-flow-mapping)
    - 10.11 [AI Analysis & Reporting](#1011-ai-analysis--reporting)
    - 10.12 [Activity Logging & Audit Trail](#1012-activity-logging--audit-trail)
    - 10.13 [User & Permission Administration](#1013-user--permission-administration)
11. [Integration Architecture](#11-integration-architecture)
12. [Export Capabilities](#12-export-capabilities)
13. [Diagrams](#13-diagrams)

---

## 1. Executive Summary

MF AI is an enterprise-grade **Business Process Management and Governance, Risk & Compliance (GRC)** platform designed for audit and consulting firms. The application provides:

- **Business Process Modeling** using Event-driven Process Chain (EPC) notation with interactive diagram editing
- **Risk Assessment & Control Mapping** with configurable risk matrices
- **Regulatory Compliance Tracking** per process step
- **Incident Management** with ERM categorization
- **Mainframe Technical Flow Analysis** with infrastructure decomposition
- **AI-Powered Analysis** for scenario analysis, reporting, and BMF AI Potential assessment
- **Multi-tenant Client Management** with fine-grained role-based access control
- **Comprehensive Audit Trail** for all data modifications

The platform is built as a single-page application (SPA) with a PostgreSQL-backed API layer and serverless edge functions for compute-intensive operations.

---

## 2. System Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER                                │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                    React SPA (Vite Build)                      │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │  │
│  │  │  Pages   │ │Components│ │  Hooks   │ │  State (TanStack)│  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘  │  │
│  └──────────────────────────┬─────────────────────────────────────┘  │
└─────────────────────────────┼────────────────────────────────────────┘
                              │ HTTPS
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     APPLICATION SERVER (Ubuntu VM)                    │
│                                                                      │
│  ┌─────────────┐    ┌──────────────────┐    ┌───────────────────┐   │
│  │   Nginx     │    │  PostgREST API   │    │  Edge Functions   │   │
│  │  (Reverse   │───▶│  (Auto-generated │    │  (Deno Runtime)   │   │
│  │   Proxy)    │    │   REST API)      │    │                   │   │
│  └─────────────┘    └────────┬─────────┘    │  • extract-diagram│   │
│                              │              │  • generate-report│   │
│                              │              │  • invite-user    │   │
│                              ▼              └─────────┬─────────┘   │
│                    ┌──────────────────┐                │             │
│                    │   PostgreSQL 15  │◀───────────────┘             │
│                    │                  │                              │
│                    │  ┌────────────┐  │    ┌──────────────────┐      │
│                    │  │  public    │  │    │  File Storage    │      │
│                    │  │  schema    │  │    │  (S3-compatible) │      │
│                    │  └────────────┘  │    │                  │      │
│                    │  ┌────────────┐  │    │ • process-images │      │
│                    │  │   auth     │  │    │ • import-files   │      │
│                    │  │  schema    │  │    │ • entity-attach. │      │
│                    │  └────────────┘  │    └──────────────────┘      │
│                    └──────────────────┘                              │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  GoTrue Authentication Service (JWT + MFA/TOTP)             │    │
│  └──────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. Infrastructure & Deployment

### Host Environment

| Component | Specification |
|---|---|
| **Hypervisor** | VMware ESXi 8.0 |
| **Guest OS** | Ubuntu 24.04 LTS (Server) |
| **IDE** | Visual Studio Code (remote SSH) |
| **AI Assistant** | Bob AI (integrated code assistant) |
| **Web Server** | Nginx 1.24 (reverse proxy + static file serving) |
| **Runtime** | Node.js 20 LTS (build), Deno 1.40+ (edge functions) |
| **Database** | PostgreSQL 15.6 |
| **Process Manager** | systemd |

### Build & Deployment Pipeline

```
Developer Workstation (VS Code + Bob AI)
         │
         │  git push
         ▼
┌─────────────────────┐
│   Git Repository    │
│   (main branch)     │
└────────┬────────────┘
         │  CI/CD Hook
         ▼
┌─────────────────────┐
│  Build Server       │
│  (npm run build)    │
│  Vite → dist/       │
└────────┬────────────┘
         │  rsync/scp
         ▼
┌─────────────────────┐
│  Ubuntu VM (Nginx)  │
│  /var/www/mf-ai/    │
│  dist/ → static     │
└─────────────────────┘
```

---

## 4. Technology Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| **React** | 18.3 | UI component framework |
| **TypeScript** | 5.x | Type-safe development |
| **Vite** | 5.x | Build tool and dev server |
| **Tailwind CSS** | 3.x | Utility-first CSS framework |
| **shadcn/ui** | Latest | Accessible component library (Radix UI primitives) |
| **TanStack React Query** | 5.x | Server state management and caching |
| **React Router DOM** | 6.x | Client-side routing |
| **@xyflow/react** | 12.x | Interactive diagram/flowchart editor |
| **Recharts** | 2.x | Data visualization and charts |
| **Lucide React** | 0.462 | Icon system |
| **Framer Motion** | — | Animation library |
| **react-hook-form** | 7.x | Form handling |
| **Zod** | 3.x | Schema validation |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| **PostgreSQL** | 15.6 | Primary database |
| **PostgREST** | 12.x | Auto-generated REST API from schema |
| **GoTrue** | 2.x | Authentication (JWT, MFA/TOTP) |
| **Deno** | 1.40+ | Edge function runtime |
| **S3-compatible Storage** | — | File/object storage |

### Development Tools

| Tool | Purpose |
|---|---|
| **Visual Studio Code** | Primary IDE |
| **Bob AI** | AI-assisted code generation and review |
| **ESLint** | Code linting |
| **Vitest** | Unit testing framework |
| **Git** | Version control |

### Export & Utility Libraries

| Library | Purpose |
|---|---|
| **jsPDF** | PDF document generation |
| **xlsx** | Excel spreadsheet export |
| **html2canvas** | DOM-to-image capture |
| **Tesseract.js** | OCR (Optical Character Recognition) for diagram extraction |
| **dagre** | Automatic graph/diagram layout |

---

## 5. Application Layers

```
┌────────────────────────────────────────────────────────┐
│                   PRESENTATION LAYER                    │
│  Pages, Components, UI Kit (shadcn/ui + Tailwind CSS)  │
├────────────────────────────────────────────────────────┤
│                    ROUTING LAYER                        │
│  React Router DOM (protected routes, MFA gates)        │
├────────────────────────────────────────────────────────┤
│                STATE MANAGEMENT LAYER                   │
│  TanStack React Query (server state + cache)           │
│  React Context (auth state, permissions)               │
├────────────────────────────────────────────────────────┤
│                    DATA ACCESS LAYER                    │
│  API modules (api.ts, api-applications.ts, etc.)       │
│  Supabase JS Client (PostgREST + Auth + Storage)       │
├────────────────────────────────────────────────────────┤
│                 BACKEND SERVICES LAYER                  │
│  PostgREST (auto-REST), Edge Functions (Deno),         │
│  GoTrue Auth, S3 Storage                               │
├────────────────────────────────────────────────────────┤
│                   DATABASE LAYER                        │
│  PostgreSQL 15 (RLS, triggers, functions)              │
└────────────────────────────────────────────────────────┘
```

---

## 6. Frontend Architecture

### 6.1 Project Structure

```
src/
├── main.tsx                    # Application entry point
├── App.tsx                     # Root component, routing configuration
├── App.css                     # Global styles
├── index.css                   # Tailwind directives & design tokens
├── vite-env.d.ts               # Vite type declarations
│
├── assets/                     # Static assets
│   └── mf-ai-logo.png          # Application logo
│
├── components/                 # Reusable components
│   ├── ui/                     # shadcn/ui base components (40+ components)
│   │   ├── accordion.tsx
│   │   ├── alert-dialog.tsx
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── chart.tsx
│   │   ├── checkbox.tsx
│   │   ├── command.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── form.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── sidebar.tsx
│   │   ├── table.tsx
│   │   ├── tabs.tsx
│   │   ├── toast.tsx
│   │   └── ... (30+ additional UI primitives)
│   │
│   ├── risk-matrix/             # Risk matrix sub-components
│   │   ├── MatrixGrid.tsx       # Interactive risk matrix grid
│   │   └── TemplateSelector.tsx # Risk matrix template chooser
│   │
│   ├── AppHeader.tsx            # Global application header bar
│   ├── AppLayout.tsx            # Main layout wrapper (sidebar + content)
│   ├── AppSidebar.tsx           # Navigation sidebar
│   ├── ColumnSettingsDropdown.tsx# Table column visibility control
│   ├── ConfirmDialog.tsx        # Reusable confirmation dialog
│   ├── DiagramCanvasEditor.tsx  # EPC diagram canvas (xyflow-based)
│   ├── EditableEPCNode.tsx      # Editable EPC diagram node
│   ├── EPCCustomNode.tsx        # Custom EPC node renderer
│   ├── EmptyState.tsx           # Empty state placeholder
│   ├── ExtractionResultsEditor.tsx # OCR extraction results editor
│   ├── LoadingSkeletons.tsx     # Loading state skeletons
│   ├── MFCustomNode.tsx         # Mainframe flow custom node
│   ├── MainframeFlowEditor.tsx  # Mainframe flow diagram editor
│   ├── NavLink.tsx              # Navigation link component
│   ├── NodeDetailPanel.tsx      # Step/node detail side panel
│   ├── PageHeader.tsx           # Page header with breadcrumbs
│   ├── PageVisibilityEditor.tsx # Admin: page visibility config
│   ├── ProcessEditTab.tsx       # Process data editing tab
│   ├── RiskMatrixEditor.tsx     # Risk matrix editor
│   ├── Sparkline.tsx            # Inline sparkline chart
│   ├── StepTypeBadge.tsx        # Step type visual badge
│   └── UserPermissionsEditor.tsx# Admin: user permissions editor
│
├── contexts/                    # React context providers
│   └── AuthContext.tsx          # Authentication state context
│
├── hooks/                       # Custom React hooks
│   ├── use-mobile.tsx           # Mobile viewport detection
│   ├── use-toast.ts             # Toast notification hook
│   ├── useColumnSettings.ts     # Table column settings persistence
│   └── usePermissions.ts        # Permission checking hook
│
├── integrations/                # External service integrations
│   └── supabase/
│       ├── client.ts            # Supabase client singleton (auto-generated)
│       └── types.ts             # Database type definitions (auto-generated)
│
├── lib/                         # Utility and API modules
│   ├── api.ts                   # Core data API (processes, steps, risks, etc.)
│   ├── api-applications.ts      # Application/screen CRUD API
│   ├── api-comments.ts          # Entity comments API
│   ├── api-mainframe-flows.ts   # Mainframe flow CRUD API
│   ├── api-raci.ts              # Process-level RACI API
│   ├── api-risk-matrix.ts       # Risk matrix API
│   ├── excel-export.ts          # Excel export utilities
│   ├── layout.ts                # Diagram auto-layout (dagre)
│   ├── ocr-extract.ts           # OCR text extraction (Tesseract.js)
│   ├── pdf-export.ts            # PDF export utilities
│   ├── store.ts                 # Client-side state utilities
│   └── utils.ts                 # General utilities (cn, formatters)
│
├── pages/                       # Route-level page components
│   ├── ActivityLog.tsx          # Audit trail viewer
│   ├── AdminDashboard.tsx       # Admin: user & role management
│   ├── AIReports.tsx            # AI-generated report viewer
│   ├── ApplicationScreenDetails.tsx # Application registry
│   ├── Auth.tsx                 # Login / registration page
│   ├── BusinessProcesses.tsx    # Process list view
│   ├── BusinessScenarioAnalysis.tsx # AI business scenario analysis
│   ├── ClientReports.tsx        # Client-specific reports
│   ├── Clients.tsx              # Client management
│   ├── CloudEcosystem.tsx       # Cloud infrastructure view
│   ├── Controls.tsx             # Controls registry
│   ├── Dashboard.tsx            # Main dashboard
│   ├── DataEntry.tsx            # Process data entry/editor
│   ├── DiagramViewer.tsx        # Read-only diagram viewer
│   ├── EnrollMFA.tsx            # MFA enrollment page
│   ├── ForgotPassword.tsx       # Password recovery
│   ├── Incidents.tsx            # Incident registry
│   ├── Index.tsx                # Landing/redirect page
│   ├── MainframeAIAnalysis.tsx  # AI mainframe analysis
│   ├── MainframeFlowHub.tsx     # Mainframe flow management hub
│   ├── MainframeImports.tsx     # Data source import management
│   ├── MainframeScenarioAnalysis.tsx # Mainframe scenario analysis
│   ├── NotFound.tsx             # 404 page
│   ├── OnPremiseEcosystem.tsx   # On-premise infrastructure view
│   ├── ProcessDetails.tsx       # Process detail/edit view
│   ├── ProcessingAnalysis.tsx   # Processing analysis dashboard
│   ├── ProcessView.tsx          # Process read-only view
│   ├── Profile.tsx              # User profile management
│   ├── Regulations.tsx          # Regulations registry
│   ├── ResetPassword.tsx        # Password reset page
│   ├── RisksControls.tsx        # Risk & controls overview
│   ├── UploadExtract.tsx        # Document upload & OCR extraction
│   ├── VerifyMFA.tsx            # MFA verification gate
│   └── VisualAnalytics.tsx      # Visual analytics dashboards
│
├── types/                       # TypeScript type definitions
│   └── epc.ts                   # EPC diagram type interfaces
│
└── test/                        # Test files
    ├── setup.ts                 # Test setup configuration
    └── example.test.ts          # Example test
```

### 6.2 Routing & Navigation

The application uses React Router DOM v6 with a hierarchical route structure:

```
/                           → Dashboard (protected, pageSlug: dashboard)
/auth                       → Login / Registration (public only)
/forgot-password            → Password Recovery (public only)
/reset-password             → Password Reset (accessible always)
/admin                      → Admin Dashboard (protected)
/profile                    → User Profile (protected)
/clients                    → Client Management (protected, pageSlug: clients)
/processes                  → Business Processes List (protected, pageSlug: processes)
/process-details            → Process Detail Editor (protected, pageSlug: processes)
/process-view/:id           → Process Read-Only View (protected, pageSlug: processes)
/risks                      → Risks & Controls (protected, pageSlug: risks-controls)
/controls                   → Controls Registry (protected, pageSlug: controls)
/regulations                → Regulations (protected, pageSlug: regulations)
/incidents                  → Incidents (protected, pageSlug: incidents)
/application-screen-details → Application Registry (protected, pageSlug: processes)
/imports                    → Mainframe Imports (protected, pageSlug: mainframe-imports)
/mainframe-flows            → Mainframe Flow Hub (protected, pageSlug: mainframe-imports)
/processing-analysis        → Processing Analysis (protected, pageSlug: mainframe-imports)
/analytics                  → Visual Analytics (protected, pageSlug: visual-analytics)
/ai-reports                 → AI Reports (protected, pageSlug: ai-reports)
/business-scenario-analysis → Business Scenario Analysis (protected, pageSlug: analysis)
/mainframe-scenario-analysis → Mainframe Scenario Analysis (protected, pageSlug: analysis)
/mainframe-ai-analysis      → Mainframe AI Analysis (protected, pageSlug: analysis)
/client-reports             → Client Reports (protected, pageSlug: client-reports)
/on-premise/*               → On-Premise Ecosystem (protected, pageSlug: on-premise)
/cloud/*                    → Cloud Ecosystem (protected, pageSlug: cloud)
/activity-log               → Activity Log (protected, pageSlug: dashboard)
/new                        → New Process Data Entry (protected, pageSlug: data-entry)
/upload                     → Upload & Extract (protected, pageSlug: upload)
/edit/:id                   → Edit Process Data (protected, pageSlug: data-entry)
/view/:id                   → Diagram Viewer (unprotected)
```

**Route Protection Flow:**

```
User Request
     │
     ▼
┌──────────────┐     NO     ┌──────────────┐
│ Authenticated?│───────────▶│ Redirect to  │
└──────┬───────┘            │   /auth      │
       │ YES                └──────────────┘
       ▼
┌──────────────┐     NO     ┌──────────────┐
│  Is Root?    │──┐         │ MFA Enrolled?│
└──────┬───────┘  │         └──────┬───────┘
       │ YES      │ NO             │ NO
       │          ▼                ▼
       │   ┌──────────────┐ ┌──────────────┐
       │   │ MFA Verified?│ │  Enroll MFA  │
       │   └──────┬───────┘ └──────────────┘
       │          │ NO
       │          ▼
       │   ┌──────────────┐
       │   │ Verify MFA   │
       │   └──────────────┘
       │          │ YES
       ▼          ▼
┌──────────────────────┐
│  Page Permission     │
│  Check (pageSlug)    │
├──────┬───────────────┤
│ YES  │      NO       │
▼      │      ▼        │
Render │  Access       │
Page   │  Restricted   │
       └───────────────┘
```

### 6.3 Authentication & Authorization

**Authentication Provider:** GoTrue (JWT-based)

The `AuthContext` manages:
- User session state
- Role detection (`root`, `admin`, `user`, participants, coordinators)
- MFA enrollment and verification state
- Session refresh and token management

**MFA Policy:**
- **Mandatory** for all users except `root` (optional for root)
- TOTP-based (Time-based One-Time Password)
- Enrollment required on first login
- Verification required on each session

### 6.4 State Management

| Concern | Solution |
|---|---|
| Server state (DB data) | TanStack React Query v5 (caching, refetching, optimistic updates) |
| Authentication state | React Context (`AuthContext`) |
| Permission state | React Hook (`usePermissions`) |
| UI state | React component state (`useState`, `useReducer`) |
| Column settings | Custom hook with `localStorage` persistence (`useColumnSettings`) |
| Toast notifications | Radix-based toast system |

### 6.5 Component Architecture

The component architecture follows a **layered composition** pattern:

```
Page Components (src/pages/)
    │
    ├── Layout Components
    │   ├── AppLayout (sidebar + main content)
    │   ├── AppHeader (top navigation bar)
    │   └── AppSidebar (collapsible navigation)
    │
    ├── Feature Components (src/components/)
    │   ├── DiagramCanvasEditor (EPC diagram)
    │   ├── MainframeFlowEditor (MF flow diagram)
    │   ├── NodeDetailPanel (step detail panel)
    │   ├── ProcessEditTab (process editing)
    │   ├── RiskMatrixEditor (risk matrix)
    │   └── UserPermissionsEditor (admin)
    │
    └── Base UI Components (src/components/ui/)
        ├── Button, Input, Select, Checkbox
        ├── Dialog, Sheet, Popover
        ├── Table, Tabs, Card
        ├── Toast, Tooltip, Badge
        └── ... (40+ primitives from shadcn/ui)
```

### 6.6 Design System & UI Framework

- **Base Framework:** Tailwind CSS with semantic design tokens
- **Component Library:** shadcn/ui (built on Radix UI primitives)
- **Theming:** CSS custom properties (HSL) in `index.css` with dark mode support
- **Icons:** Lucide React (consistent icon set)
- **Charts:** Recharts (responsive, composable charting)
- **Diagrams:** @xyflow/react (node-based graph editor)
- **Layout:** dagre (automatic graph layout algorithm)

---

## 7. Backend Architecture

### 7.1 Database Layer

PostgreSQL 15 with:
- **Row-Level Security (RLS)** on all tables
- **Security-definer functions** for access control (`has_role`, `can_access_process`, `can_access_client`)
- **Trigger-based audit logging** via `log_activity()` function
- **Automatic timestamp management** via `update_updated_at_column()` trigger
- **User onboarding automation** via `handle_new_user()` trigger

See `DATABASE_SCHEMA.md` for complete schema documentation.

### 7.2 Edge Functions (Serverless)

Three Deno-based edge functions handle compute-intensive operations:

| Function | JWT Verification | Purpose |
|---|---|---|
| `extract-diagram` | Disabled | Processes uploaded diagram images using AI to extract EPC nodes, connections, and metadata |
| `generate-ai-report` | Disabled* | Generates comprehensive AI analysis reports for business processes |
| `invite-user` | Disabled | Sends invitation emails to new users with role pre-assignment |

*JWT verification is disabled at the API gateway level; functions validate tokens internally where needed.

**Edge Function Architecture:**

```
Client Request
     │
     ▼
┌──────────────────┐
│  Edge Function   │
│  (Deno Runtime)  │
│                  │
│  ┌────────────┐  │     ┌────────────────┐
│  │ Request    │  │     │  External AI   │
│  │ Validation │  │────▶│  Service (Bob  │
│  └────────────┘  │     │  AI / Gemini)  │
│  ┌────────────┐  │     └────────────────┘
│  │ DB Access  │  │
│  │ (Service   │  │
│  │  Role Key) │  │
│  └────────────┘  │
└──────────────────┘
```

### 7.3 File Storage

S3-compatible object storage with three buckets:

| Bucket | Access | Content |
|---|---|---|
| `process-images` | Public | Business process diagram screenshots/images |
| `import-files` | Public | Mainframe import data files (CSV, XLSX, etc.) |
| `entity-attachments` | Public | General file attachments with confidentiality metadata |

Files are referenced by URL in the database. Confidentiality is tracked at the database level (`entity_attachments.is_confidential`), not at the storage level.

### 7.4 Authentication Service

GoTrue-based authentication providing:
- Email/password authentication
- Email verification (mandatory)
- Password reset via email
- TOTP-based Multi-Factor Authentication
- JWT token management with refresh
- User metadata storage

---

## 8. Data Architecture

### 8.1 Entity Hierarchy

The data model follows a strict five-level hierarchy:

```
Level 1: Client
    │
    │ 1:N
    ▼
Level 2: Business Process
    │
    │ 1:N
    ▼
Level 3: Process Step (EPC Node)
    │
    ├── Risks → Controls
    ├── Regulations
    ├── Incidents
    ├── Applications / Screens
    ├── RACI (inherited from process)
    │
    │ 1:1 (max one per step)
    ▼
Level 4: Mainframe Flow
    │
    │ 1:N
    ▼
Level 5: Infrastructure Node (LPAR, DB, Subsystem)
    │
    │ 1:N
    ▼
Level 5b: Data Sources (Mainframe Imports)
```

### 8.2 Data Access Patterns

| Pattern | Implementation |
|---|---|
| Process-scoped queries | All queries filter by `process_id` |
| Client-scoped access | RLS via `can_access_process()` → `can_access_client()` |
| Cascading metadata | Risks, controls, regulations, incidents belong to steps |
| RACI inheritance | Process-level RACI linked to steps via junction table |
| Polymorphic attachments | `entity_comments` and `entity_attachments` use `entity_type` + `entity_id` |
| Audit trail | Automatic via database triggers on all major tables |

### 8.3 API Layer

The frontend communicates with the database through typed API modules:

```
src/lib/
├── api.ts                  # Core entities: processes, steps, risks, controls,
│                           # regulations, incidents, imports, questions,
│                           # clients, step connections, step RACI
│
├── api-applications.ts     # Step applications CRUD
├── api-comments.ts         # Entity comments and attachments CRUD
├── api-mainframe-flows.ts  # Mainframe flows, nodes, connections CRUD
├── api-raci.ts             # Process-level RACI and step linking
└── api-risk-matrix.ts      # Risk matrices and cells CRUD
```

Each module exports typed async functions that:
1. Accept partial entity objects for inserts/updates
2. Return typed entity objects
3. Throw errors on failure (caught by React Query)
4. Use the PostgREST client for all database operations

---

## 9. Security Architecture

### 9.1 Authentication Flow

```
┌─────────┐    Credentials    ┌──────────┐    JWT Token    ┌───────────┐
│  User   │──────────────────▶│  GoTrue  │───────────────▶│   Client  │
│ Browser │                   │  Service │                │   App     │
└─────────┘                   └──────────┘                └─────┬─────┘
                                                                │
                                                    JWT in Auth Header
                                                                │
                                                                ▼
                                                        ┌───────────────┐
                                                        │  PostgREST    │
                                                        │  (validates   │
                                                        │   JWT, sets   │
                                                        │   auth.uid()) │
                                                        └───────┬───────┘
                                                                │
                                                                ▼
                                                        ┌───────────────┐
                                                        │  PostgreSQL   │
                                                        │  (RLS         │
                                                        │   enforced)   │
                                                        └───────────────┘
```

### 9.2 Multi-Factor Authentication

- **Method:** TOTP (Time-based One-Time Password)
- **Enrollment:** Mandatory for all non-root users on first login
- **Verification:** Required each session
- **QR Code:** Generated during enrollment for authenticator app setup
- **Recovery:** Managed through admin-assisted reset

### 9.3 Role-Based Access Control

```
┌─────────────────────────────────────────────────────────────┐
│                        ROLE HIERARCHY                        │
│                                                             │
│  root ──▶ Full unrestricted access (MFA optional)          │
│    │                                                        │
│    ▼                                                        │
│  admin ──▶ All CRUD, user management, client management    │
│    │                                                        │
│    ├── team_coordinator ──▶ Team-level access               │
│    │       │                                                │
│    │       └── team_participant ──▶ Limited team access     │
│    │                                                        │
│    ├── client_coordinator ──▶ Client-specific access        │
│    │       │                                                │
│    │       └── client_participant ──▶ Limited client access │
│    │                                                        │
│    └── user ──▶ Default role (basic access)                │
└─────────────────────────────────────────────────────────────┘
```

**Access Control Layers:**

1. **Role check** (`user_roles` table) — determines base permissions
2. **Client assignment** (`client_assignments` table) — determines which clients a user can access
3. **Process access** (`can_access_process()`) — combines client access with process-level exclusions
4. **Page visibility** (`page_visibility` + `user_permissions`) — controls which pages are accessible
5. **Module permissions** (`user_permissions.allowed_modules`) — controls which feature modules are available

### 9.4 Row-Level Security

All tables have RLS enabled. Policies use security-definer functions to prevent recursive checks:

- `has_role()` — checks user role (root implicitly passes all role checks)
- `can_access_client()` — checks admin status or client assignment
- `can_access_process()` — checks admin status, client access, and process exclusions
- `is_root()` — checks root role specifically
- `is_participant()` — checks participant roles

---

## 10. Feature Modules

### 10.1 Dashboard & Analytics

**Pages:** `Dashboard.tsx`, `VisualAnalytics.tsx`  
**Components:** `Sparkline.tsx`

Provides:
- Summary cards showing total counts (processes, risks, controls, incidents, regulations)
- BMF AI Potential distribution analytics
- Risk severity distribution charts
- Recent activity feed
- Visual analytics with Recharts-based interactive charts

### 10.2 Client Management

**Pages:** `Clients.tsx`, `ClientReports.tsx`

Features:
- Client CRUD with engagement details (period, mode, WBS code, entity type)
- Client-to-user assignment management
- Contact information tracking
- Client-scoped report generation

### 10.3 Business Process Management

**Pages:** `BusinessProcesses.tsx`, `ProcessDetails.tsx`, `ProcessView.tsx`, `DataEntry.tsx`  
**Components:** `ProcessEditTab.tsx`

Features:
- Process CRUD with client association
- Process owner and department assignment
- BMF AI Potential rating
- Multi-tab editing interface (Steps, Connections, RACI, MF Data Sources)
- Process image upload and management

### 10.4 EPC Diagram Editor

**Pages:** `DiagramViewer.tsx`  
**Components:** `DiagramCanvasEditor.tsx`, `EPCCustomNode.tsx`, `EditableEPCNode.tsx`, `NodeDetailPanel.tsx`, `StepTypeBadge.tsx`  
**Types:** `src/types/epc.ts`

Features:
- Interactive EPC (Event-driven Process Chain) diagram editing
- Node types: In-Scope, Interface (Input/Output), Event, XOR, Start/End, Decision, Storage, Delay, Document
- Step type classification: Critical, Mechanical, Decisional
- Automatic layout using dagre algorithm
- Node detail panel with linked metadata (risks, controls, regulations, incidents, applications, RACI)
- Connection management with labels
- Export to PDF and image formats

### 10.5 Risk & Controls Management

**Pages:** `RisksControls.tsx`, `Controls.tsx`  
**Components:** `RiskMatrixEditor.tsx`, `risk-matrix/MatrixGrid.tsx`, `risk-matrix/TemplateSelector.tsx`

Features:
- Risk identification per process step
- Likelihood × Impact assessment
- Control mapping to risks (preventive, detective, corrective)
- Control effectiveness rating
- Configurable risk matrices (per process)
- Multiple matrix templates
- Visual risk matrix grid with acceptable/unacceptable zones

### 10.6 Regulatory Compliance

**Pages:** `Regulations.tsx`

Features:
- Regulation tracking per process step
- Compliance status management (compliant, partial, non-compliant)
- Regulatory authority recording
- Cross-process regulation overview

### 10.7 Incident Management

**Pages:** `Incidents.tsx`

Features:
- Incident recording per process step
- Severity classification (low, medium, high, critical)
- Status tracking (open, investigating, resolved, closed)
- ERM (Enterprise Risk Management) categorization
- Financial impact recording
- ERM analyst notes

### 10.8 RACI Matrix Management

**API:** `api-raci.ts`  
**Components:** `ProcessEditTab.tsx` (RACI section)

Features:
- Process-level RACI role definition (Responsible, Accountable, Consulted, Informed)
- Multiple roles/functions per process
- Multiple persons per RACI assignment
- Step-level RACI inheritance via explicit linking
- Role-to-step many-to-many relationship

### 10.9 Application & Screen Registry

**Pages:** `ApplicationScreenDetails.tsx`  
**API:** `api-applications.ts`

Features:
- Hierarchical application/screen mapping (Screen → child Applications)
- Step-level application linking
- Extended metadata: Application Owner, BA (Business), BA (IT), IT Platform
- Centralized application registry across all processes

### 10.10 Mainframe Flow Mapping

**Pages:** `MainframeFlowHub.tsx`, `MainframeImports.tsx`, `ProcessingAnalysis.tsx`  
**Components:** `MainframeFlowEditor.tsx`, `MFCustomNode.tsx`  
**API:** `api-mainframe-flows.ts`

Features:
- Interactive mainframe infrastructure flow diagrams
- Node types: Program, Database, LPAR, Subsystem, etc.
- One flow per step maximum (enforced)
- Infrastructure node connection management
- Data source (mainframe import) linking to specific nodes
- Color-coded visualization (Emerald: Step, Blue: MF Flow, Slate: Node, Amber: Data Source)
- Auto-save mechanism for diagram persistence

### 10.11 AI Analysis & Reporting

**Pages:** `AIReports.tsx`, `BusinessScenarioAnalysis.tsx`, `MainframeScenarioAnalysis.tsx`, `MainframeAIAnalysis.tsx`  
**Edge Functions:** `extract-diagram`, `generate-ai-report`

Features:
- AI-powered business process scenario analysis
- Mainframe modernization scenario analysis
- BMF AI Potential assessment questionnaire
- AI report generation (comprehensive process analysis)
- OCR-based diagram extraction from uploaded images (Tesseract.js)
- Integration with Bob AI / Gemini for natural language analysis

### 10.12 Activity Logging & Audit Trail

**Pages:** `ActivityLog.tsx`

Features:
- Automatic capture of all CRUD operations via database triggers
- User identification (email + ID) for each action
- Entity type and name tracking
- Clickable log entries navigating to the relevant entity/page
- Chronological activity feed
- Filterable by action type, entity type, user

### 10.13 User & Permission Administration

**Pages:** `AdminDashboard.tsx`, `Profile.tsx`  
**Components:** `UserPermissionsEditor.tsx`, `PageVisibilityEditor.tsx`

Features:
- User role assignment and management
- Invitation system with email, role pre-assignment, and client linking
- Per-user page access permissions
- Per-user module access permissions
- Process-level exclusions
- Page visibility configuration by role (root only)
- Profile management (display name, avatar, job title, department)

---

## 11. Integration Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    MF AI APPLICATION                        │
│                                                            │
│  ┌──────────────┐      ┌──────────────┐                   │
│  │ PostgREST    │      │  GoTrue      │                   │
│  │ (REST API)   │      │  (Auth)      │                   │
│  └──────┬───────┘      └──────┬───────┘                   │
│         │                     │                            │
│         ▼                     ▼                            │
│  ┌──────────────────────────────────────┐                  │
│  │          PostgreSQL 15              │                  │
│  │  (RLS, Triggers, Functions)         │                  │
│  └──────────────────────────────────────┘                  │
│                                                            │
│  ┌──────────────┐      ┌──────────────┐                   │
│  │  S3 Storage  │      │ Edge Funcs   │                   │
│  │  (Files)     │      │ (Deno)       │                   │
│  └──────────────┘      └──────┬───────┘                   │
│                               │                            │
└───────────────────────────────┼────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │   External Services   │
                    │                       │
                    │  • Bob AI (LLM)       │
                    │  • Gemini API         │
                    │  • SMTP (Email)       │
                    └───────────────────────┘
```

---

## 12. Export Capabilities

| Format | Library | Use Cases |
|---|---|---|
| **PDF** | jsPDF + html2canvas | Process reports, risk matrices, diagrams |
| **Excel** | xlsx (SheetJS) | Data tables, risk registers, control matrices |
| **Image** | html2canvas | Diagram snapshots, chart exports |

---

## 13. Diagrams

### Component Dependency Graph

```
                         App.tsx
                           │
              ┌────────────┼────────────┐
              │            │            │
         AuthProvider  QueryClient  TooltipProvider
              │            │
              ▼            ▼
        ProtectedRoute ───▶ AppLayout
              │                │
              ▼                ├── AppHeader
         Page Component        ├── AppSidebar
              │                └── Main Content Area
              │
    ┌─────────┼──────────┐
    │         │          │
  Feature   Feature    Feature
  Component Component  Component
    │         │          │
    ▼         ▼          ▼
  ui/*      ui/*       ui/*
 (shadcn)  (shadcn)   (shadcn)
```

### Data Flow Architecture

```
User Interaction
       │
       ▼
┌──────────────┐
│  React       │  React Query mutation
│  Component   │──────────────────────┐
└──────┬───────┘                      │
       │ State Update                 ▼
       │                    ┌──────────────────┐
       │                    │  API Module      │
       │                    │  (src/lib/api*)  │
       │                    └────────┬─────────┘
       │                             │ Supabase Client
       │                             ▼
       │                    ┌──────────────────┐
       │                    │  PostgREST       │
       │                    │  (REST → SQL)    │
       │                    └────────┬─────────┘
       │                             │
       │                             ▼
       │                    ┌──────────────────┐
       │                    │  PostgreSQL      │
       │  Cache Invalidation │  (RLS enforced) │
       │◀────────────────────│  Trigger →      │
       │  (React Query       │  activity_log   │
       │   refetch)          └──────────────────┘
       ▼
┌──────────────┐
│  UI Re-render│
└──────────────┘
```

---

*End of Application Architecture Documentation*
