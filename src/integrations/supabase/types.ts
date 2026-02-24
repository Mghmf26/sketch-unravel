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
      clients: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string
          engagement_mode: string | null
          id: string
          industry: string | null
          name: string
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          engagement_mode?: string | null
          id?: string
          industry?: string | null
          name: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          engagement_mode?: string | null
          id?: string
          industry?: string | null
          name?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      controls: {
        Row: {
          created_at: string
          description: string | null
          effectiveness: string | null
          id: string
          name: string
          risk_id: string
          type: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          effectiveness?: string | null
          id?: string
          name: string
          risk_id: string
          type?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          effectiveness?: string | null
          id?: string
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
      incidents: {
        Row: {
          created_at: string
          date: string | null
          description: string | null
          erm_category: string | null
          erm_notes: string | null
          financial_impact: string | null
          id: string
          process_id: string
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
          process_id: string
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
          process_id?: string
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
      mainframe_imports: {
        Row: {
          created_at: string
          dataset_name: string | null
          description: string | null
          file_url: string | null
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
      process_steps: {
        Row: {
          created_at: string
          description: string | null
          id: string
          label: string
          position_index: number | null
          process_id: string
          type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          label: string
          position_index?: number | null
          process_id: string
          type?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          label?: string
          position_index?: number | null
          process_id?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
