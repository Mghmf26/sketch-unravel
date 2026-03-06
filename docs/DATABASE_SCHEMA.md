# MF AI — Database Schema Documentation

**Document Version:** 1.0  
**Date:** March 6, 2026  
**Classification:** Internal — Confidential  
**Prepared by:** Engineering Team  
**Environment:** Ubuntu 24.04 LTS (VMware ESXi 8.0) / PostgreSQL 15 / Bob AI / Visual Studio Code

---

## Table of Contents

1. [Overview](#1-overview)
2. [Database Engine & Configuration](#2-database-engine--configuration)
3. [Schema Diagram](#3-schema-diagram)
4. [Enumerations](#4-enumerations)
5. [Tables](#5-tables)
   - 5.1 [profiles](#51-profiles)
   - 5.2 [user_roles](#52-user_roles)
   - 5.3 [user_permissions](#53-user_permissions)
   - 5.4 [invitations](#54-invitations)
   - 5.5 [clients](#55-clients)
   - 5.6 [client_assignments](#56-client_assignments)
   - 5.7 [business_processes](#57-business_processes)
   - 5.8 [process_steps](#58-process_steps)
   - 5.9 [step_connections](#59-step_connections)
   - 5.10 [risks](#510-risks)
   - 5.11 [controls](#511-controls)
   - 5.12 [regulations](#512-regulations)
   - 5.13 [incidents](#513-incidents)
   - 5.14 [step_applications](#514-step_applications)
   - 5.15 [process_raci](#515-process_raci)
   - 5.16 [process_raci_step_links](#516-process_raci_step_links)
   - 5.17 [step_raci](#517-step_raci-legacy)
   - 5.18 [mainframe_flows](#518-mainframe_flows)
   - 5.19 [mainframe_flow_nodes](#519-mainframe_flow_nodes)
   - 5.20 [mainframe_flow_connections](#520-mainframe_flow_connections)
   - 5.21 [mainframe_imports](#521-mainframe_imports)
   - 5.22 [mf_questions](#522-mf_questions)
   - 5.23 [risk_matrices](#523-risk_matrices)
   - 5.24 [risk_matrix_cells](#524-risk_matrix_cells)
   - 5.25 [entity_comments](#525-entity_comments)
   - 5.26 [entity_attachments](#526-entity_attachments)
   - 5.27 [activity_log](#527-activity_log)
   - 5.28 [page_visibility](#528-page_visibility)
6. [Database Functions](#6-database-functions)
7. [Triggers](#7-triggers)
8. [Row-Level Security (RLS) Policies](#8-row-level-security-rls-policies)
9. [Storage Buckets](#9-storage-buckets)
10. [Index Strategy](#10-index-strategy)

---

## 1. Overview

The MF AI platform uses a **PostgreSQL 15** relational database deployed on an Ubuntu 24.04 LTS virtual machine running under VMware ESXi 8.0. The database backs a business process management (BPM) and risk/controls governance application. The schema supports:

- **Multi-tenant client management** with role-based access control (RBAC)
- **Business process modeling** with EPC (Event-driven Process Chain) diagramming
- **Risk, Controls, Regulations & Incident management** per process step
- **RACI matrix management** at the process level with step-level inheritance
- **Mainframe technical flow mapping** with infrastructure node decomposition
- **AI-powered analysis** and report generation
- **Document/file attachment management** with confidentiality classification
- **Comprehensive audit trail** via activity logging

All tables reside in the `public` schema. Authentication is managed through the `auth` schema (managed by the authentication layer) and is not modified directly.

---

## 2. Database Engine & Configuration

| Property | Value |
|---|---|
| **RDBMS** | PostgreSQL 15.6 |
| **Host OS** | Ubuntu 24.04 LTS |
| **Virtualization** | VMware ESXi 8.0 |
| **Schema** | `public` |
| **Authentication Schema** | `auth` (managed, read-only) |
| **UUID Generation** | `gen_random_uuid()` |
| **Row-Level Security** | Enabled on all tables |
| **Default Encoding** | UTF-8 |
| **Connection Pooling** | PgBouncer (transaction mode) |

---

## 3. Schema Diagram

### Entity-Relationship Overview

```
┌─────────────┐      ┌──────────────────┐      ┌──────────────────┐
│  auth.users  │─────▶│     profiles     │      │   user_roles     │
│  (managed)   │─────▶│                  │      │                  │
└─────────────┘  1:1  └──────────────────┘      └──────────────────┘
       │                                               │
       │ 1:N                                           │
       ▼                                               │
┌──────────────────┐                                   │
│  invitations     │                                   │
└──────────────────┘                                   │
       │                                               │
       │ N:1                                           │
       ▼                                               │
┌──────────────────┐   1:N   ┌──────────────────────┐  │
│    clients       │────────▶│  client_assignments  │◀─┘
└──────────────────┘         └──────────────────────┘
       │
       │ 1:N
       ▼
┌──────────────────────┐   1:N   ┌──────────────────┐   1:N   ┌─────────────────────┐
│  business_processes  │────────▶│  process_steps   │────────▶│       risks         │
└──────────────────────┘         └──────────────────┘         └─────────────────────┘
       │                                │                            │
       │ 1:N                            │ 1:N                       │ 1:N
       ▼                                ▼                            ▼
┌──────────────────┐          ┌──────────────────┐          ┌──────────────────┐
│  process_raci    │          │ step_connections │          │    controls      │
└──────────────────┘          └──────────────────┘          └──────────────────┘
       │
       │ N:M (via link table)
       ▼
┌──────────────────────────┐
│ process_raci_step_links  │
└──────────────────────────┘

┌──────────────────┐         ┌───────────────────────┐
│  process_steps   │────────▶│    regulations        │
│                  │────────▶│    incidents           │
│                  │────────▶│    step_applications   │
│                  │────────▶│    mainframe_flows     │
└──────────────────┘         └───────────────────────┘
                                      │
                                      │ 1:N
                                      ▼
                             ┌────────────────────────────┐   1:N   ┌───────────────────┐
                             │  mainframe_flow_nodes      │────────▶│ mainframe_imports │
                             └────────────────────────────┘         └───────────────────┘
                                      │
                                      │ 1:N
                                      ▼
                             ┌────────────────────────────┐
                             │ mainframe_flow_connections │
                             └────────────────────────────┘

Cross-cutting tables (polymorphic):
┌──────────────────┐     ┌──────────────────────┐     ┌──────────────────┐
│ entity_comments  │     │  entity_attachments   │     │   activity_log   │
└──────────────────┘     └──────────────────────┘     └──────────────────┘

┌──────────────────┐     ┌──────────────────────┐
│  risk_matrices   │────▶│  risk_matrix_cells    │
└──────────────────┘     └──────────────────────┘

┌──────────────────┐
│ page_visibility  │  (application configuration)
└──────────────────┘
```

---

## 4. Enumerations

### `app_role`

Defines the application-wide user roles used for RBAC.

| Value | Description |
|---|---|
| `root` | Super-administrator with unrestricted access |
| `admin` | Full administrative privileges |
| `user` | Standard user (default for new registrations) |
| `team_coordinator` | Internal team lead with elevated process access |
| `team_participant` | Internal team member with restricted access |
| `client_coordinator` | External client lead |
| `client_participant` | External client member with limited access |

---

## 5. Tables

### 5.1 `profiles`

Stores extended user profile information. Created automatically upon user registration via the `handle_new_user()` trigger.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| `user_id` | `uuid` | NO | — | References `auth.users.id` |
| `display_name` | `text` | YES | — | User's display name |
| `avatar_url` | `text` | YES | — | URL to avatar image |
| `job_title` | `text` | YES | — | User's job title |
| `department` | `text` | YES | — | User's department |
| `status` | `text` | NO | `'active'` | Account status (`active`, `suspended`) |
| `last_sign_in` | `timestamptz` | YES | — | Last sign-in timestamp |
| `created_at` | `timestamptz` | NO | `now()` | Record creation timestamp |
| `updated_at` | `timestamptz` | NO | `now()` | Last update timestamp |

**RLS Policies:**
- SELECT: All authenticated users can view all profiles
- INSERT: Users can only insert their own profile (`auth.uid() = user_id`)
- UPDATE: Users can only update their own profile (`auth.uid() = user_id`)
- DELETE: Not permitted

---

### 5.2 `user_roles`

Maps users to their application roles. A user may have exactly one role.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| `user_id` | `uuid` | NO | — | References `auth.users.id` |
| `role` | `app_role` | NO | — | The assigned role (enum) |

**RLS Policies:**
- SELECT: All authenticated users can read all roles
- ALL (INSERT/UPDATE/DELETE): Only users with the `admin` role

---

### 5.3 `user_permissions`

Fine-grained permission overrides per user, controlling page and module access.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| `user_id` | `uuid` | NO | — | References `auth.users.id` |
| `allowed_pages` | `text[]` | NO | `{dashboard, processes, clients, ...}` | List of accessible page slugs |
| `allowed_modules` | `text[]` | NO | `{steps, risks, controls, ...}` | List of accessible feature modules |
| `excluded_process_ids` | `uuid[]` | NO | `{}` | Process IDs explicitly denied |
| `created_at` | `timestamptz` | NO | `now()` | Record creation timestamp |
| `updated_at` | `timestamptz` | NO | `now()` | Last update timestamp |

**RLS Policies:**
- SELECT: Users can read their own permissions (`auth.uid() = user_id`)
- ALL: Admins can manage all permissions

---

### 5.4 `invitations`

Manages user invitations with token-based acceptance and role pre-assignment.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| `email` | `text` | NO | — | Invitee email address |
| `role` | `app_role` | NO | `'team_participant'` | Pre-assigned role |
| `token` | `text` | NO | `encode(gen_random_bytes(32), 'hex')` | Secure invitation token |
| `status` | `text` | NO | `'pending'` | Invitation status |
| `client_id` | `uuid` | YES | — | FK → `clients.id` (optional client assignment) |
| `invited_by` | `uuid` | YES | — | Inviting user's ID |
| `expires_at` | `timestamptz` | NO | `now() + '7 days'` | Token expiration |
| `accepted_at` | `timestamptz` | YES | — | When the invitation was accepted |
| `created_at` | `timestamptz` | NO | `now()` | Record creation timestamp |

**Foreign Keys:** `client_id` → `clients.id`

**RLS Policies:**
- ALL: Admins can manage invitations
- SELECT: Users can view invitations matching their own email

---

### 5.5 `clients`

Client/engagement entity representing an external organization being served.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| `name` | `text` | NO | — | Client name |
| `industry` | `text` | YES | — | Industry classification |
| `status` | `text` | NO | `'active'` | Client status |
| `entity_type` | `text` | YES | `'private'` | Entity type (private, public, government) |
| `wbs_code` | `text` | YES | — | Work Breakdown Structure code |
| `engagement_mode` | `text` | YES | `'audit'` | Engagement type |
| `engagement_period_start` | `date` | YES | — | Start of engagement period |
| `engagement_period_end` | `date` | YES | — | End of engagement period |
| `report_issuance_date` | `date` | YES | — | Report issuance date |
| `contact_person` | `text` | YES | — | Primary contact name |
| `contact_email` | `text` | YES | — | Primary contact email |
| `contact_phone` | `text` | YES | — | Primary contact phone |
| `address` | `text` | YES | — | Client address |
| `notes` | `text` | YES | — | General notes |
| `created_at` | `timestamptz` | NO | `now()` | Record creation timestamp |
| `updated_at` | `timestamptz` | NO | `now()` | Last update timestamp |

**RLS Policies:**
- SELECT: Admins see all; other users see only assigned clients
- INSERT/UPDATE/DELETE: Admin only

---

### 5.6 `client_assignments`

Links users to clients they are authorized to access.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| `user_id` | `uuid` | NO | — | The assigned user |
| `client_id` | `uuid` | NO | — | FK → `clients.id` |
| `assigned_by` | `uuid` | YES | — | User who created the assignment |
| `created_at` | `timestamptz` | NO | `now()` | Record creation timestamp |

**Foreign Keys:** `client_id` → `clients.id`

**RLS Policies:**
- ALL: Admins can manage assignments
- SELECT: Users can view their own assignments

---

### 5.7 `business_processes`

Core entity representing a business process under analysis.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| `process_name` | `text` | NO | — | Process name |
| `client_id` | `uuid` | YES | — | FK → `clients.id` |
| `owner` | `text` | YES | — | Process owner name |
| `department` | `text` | YES | — | Owning department |
| `description` | `text` | YES | — | Process description |
| `mf_ai_potential` | `text` | YES | `'medium'` | BMF AI Potential rating |
| `image_url` | `text` | YES | — | Process diagram image URL |
| `created_at` | `timestamptz` | NO | `now()` | Record creation timestamp |
| `updated_at` | `timestamptz` | NO | `now()` | Last update timestamp |

**Foreign Keys:** `client_id` → `clients.id`

**RLS Policies:**
- SELECT: Users with client access or processes with no client
- INSERT: Admins or users with client access
- UPDATE: Admins or users with client access
- DELETE: Admin only

---

### 5.8 `process_steps`

Individual steps/nodes within a business process (EPC diagram nodes).

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| `process_id` | `uuid` | NO | — | FK → `business_processes.id` |
| `label` | `text` | NO | — | Node display label |
| `type` | `text` | NO | `'in-scope'` | Node type: `in-scope`, `interface`, `event`, `xor`, `start-end`, `decision`, `storage`, `delay`, `document` |
| `step_type` | `text` | YES | — | Classification: `critical`, `mechanical`, `decisional` |
| `interface_subtype` | `text` | YES | — | For interface nodes: `default`, `input`, `output` |
| `description` | `text` | YES | — | Step description |
| `position_index` | `integer` | YES | `0` | Ordering index |
| `created_at` | `timestamptz` | NO | `now()` | Record creation timestamp |

**Foreign Keys:** `process_id` → `business_processes.id`

**RLS Policies:** CRUD access via `can_access_process(auth.uid(), process_id)`; DELETE also allowed for admins

---

### 5.9 `step_connections`

Directed edges between process steps in the EPC diagram.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| `process_id` | `uuid` | NO | — | FK → `business_processes.id` |
| `source_step_id` | `uuid` | NO | — | FK → `process_steps.id` |
| `target_step_id` | `uuid` | NO | — | FK → `process_steps.id` |
| `label` | `text` | YES | — | Edge label |

**Foreign Keys:**
- `process_id` → `business_processes.id`
- `source_step_id` → `process_steps.id`
- `target_step_id` → `process_steps.id`

---

### 5.10 `risks`

Risk scenarios associated with a specific process step.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| `step_id` | `uuid` | NO | — | FK → `process_steps.id` |
| `process_id` | `uuid` | NO | — | FK → `business_processes.id` |
| `description` | `text` | NO | — | Risk description |
| `likelihood` | `text` | NO | `'medium'` | Likelihood: `low`, `medium`, `high` |
| `impact` | `text` | NO | `'medium'` | Impact: `low`, `medium`, `high` |
| `created_at` | `timestamptz` | NO | `now()` | Record creation timestamp |

**Foreign Keys:**
- `step_id` → `process_steps.id`
- `process_id` → `business_processes.id`

---

### 5.11 `controls`

Mitigation controls linked to identified risks.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| `risk_id` | `uuid` | NO | — | FK → `risks.id` |
| `name` | `text` | NO | — | Control name |
| `description` | `text` | YES | — | Control description |
| `type` | `text` | YES | `'preventive'` | Type: `preventive`, `detective`, `corrective` |
| `effectiveness` | `text` | YES | `'effective'` | Effectiveness rating |
| `created_at` | `timestamptz` | NO | `now()` | Record creation timestamp |

**Foreign Keys:** `risk_id` → `risks.id`

---

### 5.12 `regulations`

Regulatory compliance records associated with process steps.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| `step_id` | `uuid` | NO | — | FK → `process_steps.id` |
| `process_id` | `uuid` | NO | — | FK → `business_processes.id` |
| `name` | `text` | NO | — | Regulation name |
| `description` | `text` | YES | — | Description |
| `authority` | `text` | YES | — | Regulatory authority |
| `compliance_status` | `text` | YES | `'partial'` | Status: `compliant`, `partial`, `non-compliant` |
| `created_at` | `timestamptz` | NO | `now()` | Record creation timestamp |

**Foreign Keys:**
- `step_id` → `process_steps.id`
- `process_id` → `business_processes.id`

---

### 5.13 `incidents`

Incident records linked to process steps, with ERM (Enterprise Risk Management) classification.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| `step_id` | `uuid` | NO | — | FK → `process_steps.id` |
| `process_id` | `uuid` | NO | — | FK → `business_processes.id` |
| `title` | `text` | NO | — | Incident title |
| `description` | `text` | YES | — | Detailed description |
| `severity` | `text` | YES | `'medium'` | Severity: `low`, `medium`, `high`, `critical` |
| `status` | `text` | YES | `'open'` | Status: `open`, `investigating`, `resolved`, `closed` |
| `date` | `timestamptz` | YES | `now()` | Incident date |
| `erm_category` | `text` | YES | — | ERM risk category |
| `erm_notes` | `text` | YES | — | ERM analyst notes |
| `financial_impact` | `text` | YES | — | Estimated financial impact |
| `created_at` | `timestamptz` | NO | `now()` | Record creation timestamp |

**Foreign Keys:**
- `step_id` → `process_steps.id`
- `process_id` → `business_processes.id`

---

### 5.14 `step_applications`

Applications and screens linked to process steps, supporting a parent-child hierarchy (Screen → Applications).

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| `step_id` | `uuid` | NO | — | FK → `process_steps.id` |
| `process_id` | `uuid` | NO | — | FK → `business_processes.id` |
| `name` | `text` | NO | — | Application/screen name |
| `screen_name` | `text` | YES | — | Screen identifier |
| `description` | `text` | YES | — | Description |
| `app_type` | `text` | YES | `'application'` | Type: `application`, `screen` |
| `parent_id` | `uuid` | YES | — | FK → `step_applications.id` (self-referencing) |
| `application_owner` | `text` | YES | — | Application owner name |
| `business_analyst_business` | `text` | YES | — | Business-side analyst |
| `business_analyst_it` | `text` | YES | — | IT-side analyst |
| `platform` | `text` | YES | — | IT platform |
| `created_at` | `timestamptz` | NO | `now()` | Record creation timestamp |

**Foreign Keys:**
- `step_id` → `process_steps.id`
- `process_id` → `business_processes.id`
- `parent_id` → `step_applications.id` (self-referencing)

---

### 5.15 `process_raci`

RACI matrix roles defined at the business process level. Each record represents a role/function with its RACI assignments.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| `process_id` | `uuid` | NO | — | FK → `business_processes.id` |
| `role_name` | `text` | NO | — | Role or function name |
| `responsible` | `text` | YES | — | Responsible person(s) |
| `accountable` | `text` | YES | — | Accountable person(s) |
| `consulted` | `text` | YES | — | Consulted person(s) |
| `informed` | `text` | YES | — | Informed person(s) |
| `created_at` | `timestamptz` | NO | `now()` | Record creation timestamp |

**Foreign Keys:** `process_id` → `business_processes.id`

---

### 5.16 `process_raci_step_links`

Many-to-many link table connecting process-level RACI roles to specific steps (inheritance mechanism).

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| `raci_id` | `uuid` | NO | — | FK → `process_raci.id` |
| `step_id` | `uuid` | NO | — | FK → `process_steps.id` |
| `created_at` | `timestamptz` | NO | `now()` | Record creation timestamp |

**Foreign Keys:**
- `raci_id` → `process_raci.id`
- `step_id` → `process_steps.id`

---

### 5.17 `step_raci` (Legacy)

Original step-level RACI table. Retained for backward compatibility; new RACI entries should use `process_raci` with `process_raci_step_links`.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| `step_id` | `uuid` | NO | — | FK → `process_steps.id` |
| `process_id` | `uuid` | NO | — | FK → `business_processes.id` |
| `role_name` | `text` | NO | — | Role name |
| `responsible` | `text` | YES | — | Responsible |
| `accountable` | `text` | YES | — | Accountable |
| `consulted` | `text` | YES | — | Consulted |
| `informed` | `text` | YES | — | Informed |
| `created_at` | `timestamptz` | NO | `now()` | Record creation timestamp |

---

### 5.18 `mainframe_flows`

Represents a technical mainframe flow diagram linked to a specific process step. **Constraint: one flow per step maximum.**

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| `process_id` | `uuid` | NO | — | FK → `business_processes.id` |
| `step_id` | `uuid` | NO | — | FK → `process_steps.id` |
| `name` | `text` | NO | `'Mainframe Flow'` | Flow name |
| `description` | `text` | YES | — | Flow description |
| `created_at` | `timestamptz` | NO | `now()` | Record creation timestamp |
| `updated_at` | `timestamptz` | NO | `now()` | Last update timestamp |

**Foreign Keys:**
- `process_id` → `business_processes.id`
- `step_id` → `process_steps.id`

---

### 5.19 `mainframe_flow_nodes`

Infrastructure nodes within a mainframe flow diagram (LPAR, Database, Subsystem, etc.).

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| `flow_id` | `uuid` | NO | — | FK → `mainframe_flows.id` |
| `label` | `text` | NO | — | Node label |
| `node_type` | `text` | NO | `'program'` | Node type: `program`, `database`, `lpar`, `subsystem`, etc. |
| `description` | `text` | YES | — | Node description |
| `created_at` | `timestamptz` | NO | `now()` | Record creation timestamp |

**Foreign Keys:** `flow_id` → `mainframe_flows.id`

---

### 5.20 `mainframe_flow_connections`

Directed edges between mainframe flow nodes.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| `flow_id` | `uuid` | NO | — | FK → `mainframe_flows.id` |
| `source_node_id` | `uuid` | NO | — | FK → `mainframe_flow_nodes.id` |
| `target_node_id` | `uuid` | NO | — | FK → `mainframe_flow_nodes.id` |
| `label` | `text` | YES | — | Connection label |
| `connection_type` | `text` | YES | `'call'` | Type: `call`, `data`, `trigger` |

**Foreign Keys:**
- `flow_id` → `mainframe_flows.id`
- `source_node_id` → `mainframe_flow_nodes.id`
- `target_node_id` → `mainframe_flow_nodes.id`

---

### 5.21 `mainframe_imports`

Data source/import records linked to mainframe infrastructure nodes.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| `process_id` | `uuid` | NO | — | FK → `business_processes.id` |
| `step_id` | `uuid` | YES | — | FK → `process_steps.id` |
| `flow_id` | `uuid` | YES | — | FK → `mainframe_flows.id` |
| `flow_node_id` | `uuid` | YES | — | FK → `mainframe_flow_nodes.id` |
| `source_name` | `text` | NO | — | Data source name |
| `source_type` | `text` | NO | `'DB2'` | Source type |
| `dataset_name` | `text` | YES | — | Dataset/table name |
| `description` | `text` | YES | — | Description |
| `record_count` | `integer` | YES | `0` | Number of records |
| `status` | `text` | YES | `'active'` | Status |
| `last_sync` | `timestamptz` | YES | — | Last synchronization timestamp |
| `file_url` | `text` | YES | — | Attached file URL |
| `created_at` | `timestamptz` | NO | `now()` | Record creation timestamp |

**Foreign Keys:**
- `process_id` → `business_processes.id`
- `step_id` → `process_steps.id`
- `flow_id` → `mainframe_flows.id`
- `flow_node_id` → `mainframe_flow_nodes.id`

---

### 5.22 `mf_questions`

AI-generated or manually entered Q&A records for process analysis.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| `process_id` | `uuid` | NO | — | FK → `business_processes.id` |
| `question` | `text` | NO | — | The question |
| `answer` | `text` | YES | — | The answer |
| `confidence` | `numeric` | YES | `0` | AI confidence score (0–100) |
| `category` | `text` | YES | — | Question category |
| `created_at` | `timestamptz` | NO | `now()` | Record creation timestamp |

**Foreign Keys:** `process_id` → `business_processes.id`

---

### 5.23 `risk_matrices`

Configurable risk assessment matrices per business process (one-to-one relationship).

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| `process_id` | `uuid` | NO | — | FK → `business_processes.id` (UNIQUE) |
| `name` | `text` | NO | `'Risk Matrix'` | Matrix name |
| `description` | `text` | YES | — | Description |
| `matrix_type` | `text` | NO | `'user-defined'` | Matrix template type |
| `frequency_levels` | `text[]` | NO | `{VL, L, M, H, VH}` | Frequency axis labels |
| `impact_levels` | `text[]` | NO | `{VL, L, M, H, VH}` | Impact axis labels |
| `created_at` | `timestamptz` | NO | `now()` | Record creation timestamp |
| `updated_at` | `timestamptz` | NO | `now()` | Last update timestamp |

**Foreign Keys:** `process_id` → `business_processes.id` (one-to-one)

---

### 5.24 `risk_matrix_cells`

Individual cells within a risk matrix, defining acceptable/unacceptable zones.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| `matrix_id` | `uuid` | NO | — | FK → `risk_matrices.id` |
| `frequency_level` | `text` | NO | — | Frequency axis value |
| `impact_level` | `text` | NO | — | Impact axis value |
| `acceptable` | `boolean` | NO | `false` | Whether this risk zone is acceptable |
| `created_at` | `timestamptz` | NO | `now()` | Record creation timestamp |

**Foreign Keys:** `matrix_id` → `risk_matrices.id`

---

### 5.25 `entity_comments`

Polymorphic comment/insight records attachable to any entity type.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| `entity_id` | `uuid` | NO | — | ID of the target entity |
| `entity_type` | `text` | NO | — | Entity type (table name) |
| `process_id` | `uuid` | NO | — | FK → `business_processes.id` |
| `comment` | `text` | YES | — | Comment text |
| `conclusion` | `text` | YES | — | Important insights |
| `author_id` | `uuid` | YES | — | Comment author |
| `created_at` | `timestamptz` | NO | `now()` | Record creation timestamp |
| `updated_at` | `timestamptz` | NO | `now()` | Last update timestamp |

**Foreign Keys:** `process_id` → `business_processes.id`

---

### 5.26 `entity_attachments`

File attachments linked to any entity, with confidentiality classification.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| `entity_id` | `uuid` | NO | — | ID of the target entity |
| `entity_type` | `text` | NO | — | Entity type (table name) |
| `process_id` | `uuid` | NO | — | FK → `business_processes.id` |
| `file_name` | `text` | NO | — | Original file name |
| `file_url` | `text` | NO | — | Storage URL |
| `file_type` | `text` | YES | — | MIME type |
| `file_size` | `bigint` | YES | — | File size in bytes |
| `is_confidential` | `boolean` | NO | `false` | Confidentiality flag |
| `uploaded_by` | `uuid` | YES | — | Uploading user's ID |
| `created_at` | `timestamptz` | NO | `now()` | Record creation timestamp |

**Foreign Keys:** `process_id` → `business_processes.id`

---

### 5.27 `activity_log`

Comprehensive audit trail populated by database triggers on all major tables.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| `user_id` | `uuid` | YES | — | Acting user |
| `user_email` | `text` | YES | — | Acting user's email |
| `action` | `text` | NO | — | Action: `created`, `updated`, `deleted` |
| `entity_type` | `text` | NO | — | Table name |
| `entity_id` | `uuid` | YES | — | Target entity ID |
| `entity_name` | `text` | YES | — | Human-readable entity name |
| `details` | `jsonb` | YES | `{}` | Additional metadata |
| `created_at` | `timestamptz` | NO | `now()` | Timestamp of the action |

**RLS Policies:**
- SELECT: All authenticated users can read logs
- INSERT: Only the acting user (`user_id = auth.uid()`)
- UPDATE/DELETE: Not permitted

---

### 5.28 `page_visibility`

Application configuration table controlling which pages are visible to which roles.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| `page_slug` | `text` | NO | — | Page identifier slug |
| `hidden_from_roles` | `text[]` | NO | `{}` | Roles from which this page is hidden |
| `created_at` | `timestamptz` | NO | `now()` | Record creation timestamp |
| `updated_at` | `timestamptz` | NO | `now()` | Last update timestamp |

**RLS Policies:**
- SELECT: All authenticated users
- ALL: Root users only

---

## 6. Database Functions

### `handle_new_user()` — Trigger Function

**Trigger:** Fires on `INSERT` to `auth.users` (AFTER INSERT)

**Behavior:**
1. Creates a `profiles` record with the user's display name (from metadata) or email
2. Checks for a matching pending invitation by email
3. If invitation found: assigns the invited role, marks invitation as accepted, creates client assignment if applicable
4. If no invitation: assigns default `user` role
5. Creates a default `user_permissions` record

### `log_activity()` — Trigger Function

**Trigger:** Fires on `INSERT`, `UPDATE`, `DELETE` on major tables

**Behavior:**
1. Determines the action type (`created`, `updated`, `deleted`)
2. Extracts the current user from `auth.uid()`
3. Extracts a human-readable name from the record
4. Inserts a row into `activity_log`

### `has_role(_user_id uuid, _role app_role)` → `boolean`

Security-definer function that checks if a user has a specific role. Root users implicitly have all roles.

### `is_root(_user_id uuid)` → `boolean`

Security-definer function that checks if a user has the `root` role.

### `is_participant(_user_id uuid)` → `boolean`

Security-definer function that checks if a user has a participant role (`team_participant` or `client_participant`).

### `can_access_client(_user_id uuid, _client_id uuid)` → `boolean`

Security-definer function. Returns `true` if the user is an admin/root OR has a `client_assignments` entry for the given client.

### `can_access_process(_user_id uuid, _process_id uuid)` → `boolean`

Security-definer function. Returns `true` if the user is an admin/root, OR has client access for the process's client AND the process is not in the user's `excluded_process_ids`.

### `update_updated_at_column()` — Trigger Function

Automatically sets `updated_at = now()` on the modified row.

---

## 7. Triggers

Activity logging triggers are attached to the following tables, firing on INSERT, UPDATE, and DELETE:

- `business_processes`
- `process_steps`
- `step_connections`
- `risks`
- `controls`
- `regulations`
- `incidents`
- `step_applications`
- `mainframe_flows`
- `mainframe_flow_nodes`
- `mainframe_imports`
- `mf_questions`
- `clients`
- `process_raci`

The `update_updated_at_column()` trigger is attached to tables with `updated_at` columns.

---

## 8. Row-Level Security (RLS) Policies

All tables have RLS enabled. The security model follows these principles:

1. **Root users** bypass all restrictions via the `has_role()` function
2. **Admin users** have full CRUD access on most tables
3. **Regular users** access data based on client assignments and process access
4. **Participants** have read access with limited write capabilities
5. **Process-level access** is determined by `can_access_process()` which checks client assignment and exclusion lists
6. **Polymorphic tables** (comments, attachments) use `process_id` for access control

---

## 9. Storage Buckets

| Bucket Name | Public | Purpose |
|---|---|---|
| `process-images` | Yes | Business process diagram images |
| `import-files` | Yes | Mainframe import data files |
| `entity-attachments` | Yes | General entity file attachments |

---

## 10. Index Strategy

Primary keys (`id` columns) are automatically indexed. Foreign key columns benefit from implicit index usage in JOIN operations. The following columns are recommended for explicit indexing in production:

- `business_processes.client_id`
- `process_steps.process_id`
- `risks.process_id`, `risks.step_id`
- `controls.risk_id`
- `regulations.process_id`, `regulations.step_id`
- `incidents.process_id`, `incidents.step_id`
- `mainframe_imports.process_id`, `mainframe_imports.flow_id`
- `activity_log.entity_type`, `activity_log.created_at`
- `client_assignments.user_id`, `client_assignments.client_id`
- `user_roles.user_id`

---

*End of Database Schema Documentation*
