export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      business_processes: {
        Row: {
          client_id: string | null
          created_at: string
          department: string | null
          description: string | null
          id: string
          image_url: string | null
          mf_ai_potential: string | null
          owner: string | null
          process_name: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          department?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          mf_ai_potential?: string | null
          owner?: string | null
          process_name: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          department?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          mf_ai_potential?: string | null
          owner?: string | null
          process_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_processes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_assignments: {
        Row: {
          assigned_by: string | null
          client_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          client_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          client_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string
          engagement_mode: string | null
          engagement_period_end: string | null
          engagement_period_start: string | null
          entity_type: string | null
          id: string
          industry: string | null
          name: string
          notes: string | null
          report_issuance_date: string | null
          status: string
          updated_at: string
          wbs_code: string | null
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          engagement_mode?: string | null
          engagement_period_end?: string | null
          engagement_period_start?: string | null
          entity_type?: string | null
          id?: string
          industry?: string | null
          name: string
          notes?: string | null
          report_issuance_date?: string | null
          status?: string
          updated_at?: string
          wbs_code?: string | null
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          engagement_mode?: string | null
          engagement_period_end?: string | null
          engagement_period_start?: string | null
          entity_type?: string | null
          id?: string
          industry?: string | null
          name?: string
          notes?: string | null
          report_issuance_date?: string | null
          status?: string
          updated_at?: string
          wbs_code?: string | null
        }
        Relationships: []
      }
      controls: {
        Row: {
          automation_level: string | null
          created_at: string
          description: string | null
          effectiveness: string | null
          frequency: string | null
          id: string
          last_tested: string | null
          name: string
          risk_id: string
          type: string | null
        }
        Insert: {
          automation_level?: string | null
          created_at?: string
          description?: string | null
          effectiveness?: string | null
          frequency?: string | null
          id?: string
          last_tested?: string | null
          name: string
          risk_id: string
          type?: string | null
        }
        Update: {
          automation_level?: string | null
          created_at?: string
          description?: string | null
          effectiveness?: string | null
          frequency?: string | null
          id?: string
          last_tested?: string | null
          name?: string
          risk_id?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "controls_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: false
            referencedRelation: "risks"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_attachments: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          is_confidential: boolean
          process_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          is_confidential?: boolean
          process_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          is_confidential?: boolean
          process_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entity_attachments_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "business_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_comments: {
        Row: {
          author_id: string | null
          comment: string | null
          conclusion: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          process_id: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          comment?: string | null
          conclusion?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          process_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          comment?: string | null
          conclusion?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          process_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_comments_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "business_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          created_at: string
          date: string | null
          description: string | null
          erm_category: string | null
          erm_notes: string | null
          financial_impact: string | null
          id: string
          loss_threshold: string | null
          money_loss_amount: string | null
          owner_department: string | null
          process_id: string
          root_cause: string | null
          severity: string | null
          status: string | null
          step_id: string
          title: string
        }
        Insert: {
          created_at?: string
          date?: string | null
          description?: string | null
          erm_category?: string | null
          erm_notes?: string | null
          financial_impact?: string | null
          id?: string
          loss_threshold?: string | null
          money_loss_amount?: string | null
          owner_department?: string | null
          process_id: string
          root_cause?: string | null
          severity?: string | null
          status?: string | null
          step_id: string
          title: string
        }
        Update: {
          created_at?: string
          date?: string | null
          description?: string | null
          erm_category?: string | null
          erm_notes?: string | null
          financial_impact?: string | null
          id?: string
          loss_threshold?: string | null
          money_loss_amount?: string | null
          owner_department?: string | null
          process_id?: string
          root_cause?: string | null
          severity?: string | null
          status?: string | null
          step_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "business_processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "process_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          client_id: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          client_id?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          client_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      mainframe_flow_connections: {
        Row: {
          connection_type: string | null
          flow_id: string
          id: string
          label: string | null
          source_node_id: string
          target_node_id: string
        }
        Insert: {
          connection_type?: string | null
          flow_id: string
          id?: string
          label?: string | null
          source_node_id: string
          target_node_id: string
        }
        Update: {
          connection_type?: string | null
          flow_id?: string
          id?: string
          label?: string | null
          source_node_id?: string
          target_node_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mainframe_flow_connections_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "mainframe_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mainframe_flow_connections_source_node_id_fkey"
            columns: ["source_node_id"]
            isOneToOne: false
            referencedRelation: "mainframe_flow_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mainframe_flow_connections_target_node_id_fkey"
            columns: ["target_node_id"]
            isOneToOne: false
            referencedRelation: "mainframe_flow_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      mainframe_flow_nodes: {
        Row: {
          created_at: string
          description: string | null
          flow_id: string
          id: string
          label: string
          node_type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          flow_id: string
          id?: string
          label: string
          node_type?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          flow_id?: string
          id?: string
          label?: string
          node_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "mainframe_flow_nodes_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "mainframe_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      mainframe_flows: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          process_id: string
          step_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          process_id: string
          step_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          process_id?: string
          step_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mainframe_flows_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "business_processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mainframe_flows_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "process_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      mainframe_imports: {
        Row: {
          created_at: string
          dataset_name: string | null
          description: string | null
          file_url: string | null
          flow_id: string | null
          flow_node_id: string | null
          id: string
          last_sync: string | null
          process_id: string
          record_count: number | null
          source_name: string
          source_type: string
          status: string | null
          step_id: string | null
        }
        Insert: {
          created_at?: string
          dataset_name?: string | null
          description?: string | null
          file_url?: string | null
          flow_id?: string | null
          flow_node_id?: string | null
          id?: string
          last_sync?: string | null
          process_id: string
          record_count?: number | null
          source_name: string
          source_type?: string
          status?: string | null
          step_id?: string | null
        }
        Update: {
          created_at?: string
          dataset_name?: string | null
          description?: string | null
          file_url?: string | null
          flow_id?: string | null
          flow_node_id?: string | null
          id?: string
          last_sync?: string | null
          process_id?: string
          record_count?: number | null
          source_name?: string
          source_type?: string
          status?: string | null
          step_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mainframe_imports_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "mainframe_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mainframe_imports_flow_node_id_fkey"
            columns: ["flow_node_id"]
            isOneToOne: false
            referencedRelation: "mainframe_flow_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mainframe_imports_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "business_processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mainframe_imports_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "process_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      mf_questions: {
        Row: {
          answer: string | null
          category: string | null
          confidence: number | null
          created_at: string
          id: string
          process_id: string
          question: string
        }
        Insert: {
          answer?: string | null
          category?: string | null
          confidence?: number | null
          created_at?: string
          id?: string
          process_id: string
          question: string
        }
        Update: {
          answer?: string | null
          category?: string | null
          confidence?: number | null
          created_at?: string
          id?: string
          process_id?: string
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "mf_questions_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "business_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      page_visibility: {
        Row: {
          created_at: string
          hidden_from_roles: string[]
          id: string
          page_slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          hidden_from_roles?: string[]
          id?: string
          page_slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          hidden_from_roles?: string[]
          id?: string
          page_slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      process_raci: {
        Row: {
          accountable: string | null
          consulted: string | null
          created_at: string
          id: string
          informed: string | null
          process_id: string
          responsible: string | null
          role_name: string
        }
        Insert: {
          accountable?: string | null
          consulted?: string | null
          created_at?: string
          id?: string
          informed?: string | null
          process_id: string
          responsible?: string | null
          role_name: string
        }
        Update: {
          accountable?: string | null
          consulted?: string | null
          created_at?: string
          id?: string
          informed?: string | null
          process_id?: string
          responsible?: string | null
          role_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "process_raci_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "business_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      process_raci_step_links: {
        Row: {
          created_at: string
          id: string
          raci_id: string
          step_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          raci_id: string
          step_id: string
        }
        Update: {
          created_at?: string
          id?: string
          raci_id?: string
          step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "process_raci_step_links_raci_id_fkey"
            columns: ["raci_id"]
            isOneToOne: false
            referencedRelation: "process_raci"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_raci_step_links_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "process_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      process_steps: {
        Row: {
          created_at: string
          description: string | null
          id: string
          interface_subtype: string | null
          label: string
          position_index: number | null
          process_id: string
          step_type: string | null
          type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          interface_subtype?: string | null
          label: string
          position_index?: number | null
          process_id: string
          step_type?: string | null
          type?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          interface_subtype?: string | null
          label?: string
          position_index?: number | null
          process_id?: string
          step_type?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "process_steps_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "business_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          display_name: string | null
          id: string
          job_title: string | null
          last_sign_in: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          display_name?: string | null
          id?: string
          job_title?: string | null
          last_sign_in?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          display_name?: string | null
          id?: string
          job_title?: string | null
          last_sign_in?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      regulations: {
        Row: {
          authority: string | null
          compliance_status: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          process_id: string
          step_id: string
        }
        Insert: {
          authority?: string | null
          compliance_status?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          process_id: string
          step_id: string
        }
        Update: {
          authority?: string | null
          compliance_status?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          process_id?: string
          step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "regulations_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "business_processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regulations_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "process_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_matrices: {
        Row: {
          created_at: string
          description: string | null
          frequency_levels: string[]
          id: string
          impact_levels: string[]
          matrix_type: string
          name: string
          process_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          frequency_levels?: string[]
          id?: string
          impact_levels?: string[]
          matrix_type?: string
          name?: string
          process_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          frequency_levels?: string[]
          id?: string
          impact_levels?: string[]
          matrix_type?: string
          name?: string
          process_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_matrices_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: true
            referencedRelation: "business_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_matrix_cells: {
        Row: {
          acceptable: boolean
          created_at: string
          frequency_level: string
          id: string
          impact_level: string
          matrix_id: string
        }
        Insert: {
          acceptable?: boolean
          created_at?: string
          frequency_level: string
          id?: string
          impact_level: string
          matrix_id: string
        }
        Update: {
          acceptable?: boolean
          created_at?: string
          frequency_level?: string
          id?: string
          impact_level?: string
          matrix_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_matrix_cells_matrix_id_fkey"
            columns: ["matrix_id"]
            isOneToOne: false
            referencedRelation: "risk_matrices"
            referencedColumns: ["id"]
          },
        ]
      }
      risks: {
        Row: {
          created_at: string
          description: string
          id: string
          impact: string
          likelihood: string
          process_id: string
          step_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          impact?: string
          likelihood?: string
          process_id: string
          step_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          impact?: string
          likelihood?: string
          process_id?: string
          step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "risks_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "business_processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risks_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "process_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      step_applications: {
        Row: {
          app_type: string | null
          application_owner: string | null
          business_analyst_business: string | null
          business_analyst_it: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          parent_id: string | null
          platform: string | null
          process_id: string
          screen_name: string | null
          step_id: string
        }
        Insert: {
          app_type?: string | null
          application_owner?: string | null
          business_analyst_business?: string | null
          business_analyst_it?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          parent_id?: string | null
          platform?: string | null
          process_id: string
          screen_name?: string | null
          step_id: string
        }
        Update: {
          app_type?: string | null
          application_owner?: string | null
          business_analyst_business?: string | null
          business_analyst_it?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          platform?: string | null
          process_id?: string
          screen_name?: string | null
          step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "step_applications_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "step_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "step_applications_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "business_processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "step_applications_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "process_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      step_connections: {
        Row: {
          id: string
          label: string | null
          process_id: string
          source_step_id: string
          target_step_id: string
        }
        Insert: {
          id?: string
          label?: string | null
          process_id: string
          source_step_id: string
          target_step_id: string
        }
        Update: {
          id?: string
          label?: string | null
          process_id?: string
          source_step_id?: string
          target_step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "step_connections_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "business_processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "step_connections_source_step_id_fkey"
            columns: ["source_step_id"]
            isOneToOne: false
            referencedRelation: "process_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "step_connections_target_step_id_fkey"
            columns: ["target_step_id"]
            isOneToOne: false
            referencedRelation: "process_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      step_raci: {
        Row: {
          accountable: string | null
          consulted: string | null
          created_at: string
          id: string
          informed: string | null
          process_id: string
          responsible: string | null
          role_name: string
          step_id: string
        }
        Insert: {
          accountable?: string | null
          consulted?: string | null
          created_at?: string
          id?: string
          informed?: string | null
          process_id: string
          responsible?: string | null
          role_name: string
          step_id: string
        }
        Update: {
          accountable?: string | null
          consulted?: string | null
          created_at?: string
          id?: string
          informed?: string | null
          process_id?: string
          responsible?: string | null
          role_name?: string
          step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "step_raci_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "business_processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "step_raci_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "process_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          allowed_modules: string[]
          allowed_pages: string[]
          created_at: string
          excluded_process_ids: string[]
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allowed_modules?: string[]
          allowed_pages?: string[]
          created_at?: string
          excluded_process_ids?: string[]
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allowed_modules?: string[]
          allowed_pages?: string[]
          created_at?: string
          excluded_process_ids?: string[]
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_client: {
        Args: { _client_id: string; _user_id: string }
        Returns: boolean
      }
      can_access_process: {
        Args: { _process_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_participant: { Args: { _user_id: string }; Returns: boolean }
      is_root: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "user"
        | "team_coordinator"
        | "team_participant"
        | "client_coordinator"
        | "client_participant"
        | "root"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "user",
        "team_coordinator",
        "team_participant",
        "client_coordinator",
        "client_participant",
        "root",
      ],
    },
  },
} as const
