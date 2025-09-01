// Supabase database types
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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      ai_embeddings: {
        Row: {
          created_at: string | null
          embedding: string | null
          id: string
          object_id: string
          object_type: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          embedding?: string | null
          id?: string
          object_id: string
          object_type: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          embedding?: string | null
          id?: string
          object_id?: string
          object_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_embeddings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_jobs: {
        Row: {
          cost_usd: number | null
          created_at: string | null
          error: string | null
          finished_at: string | null
          id: string
          input_ref: Json | null
          job_type: Database["public"]["Enums"]["ai_job_type"]
          model: string | null
          output_ref: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["ai_job_status"]
          subject_id: string | null
          task_id: string | null
          tenant_id: string
          tokens_in: number | null
          tokens_out: number | null
        }
        Insert: {
          cost_usd?: number | null
          created_at?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          input_ref?: Json | null
          job_type: Database["public"]["Enums"]["ai_job_type"]
          model?: string | null
          output_ref?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["ai_job_status"]
          subject_id?: string | null
          task_id?: string | null
          tenant_id: string
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Update: {
          cost_usd?: number | null
          created_at?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          input_ref?: Json | null
          job_type?: Database["public"]["Enums"]["ai_job_type"]
          model?: string | null
          output_ref?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["ai_job_status"]
          subject_id?: string | null
          task_id?: string | null
          tenant_id?: string
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_jobs_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_jobs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_outputs: {
        Row: {
          content: Json
          created_at: string | null
          id: string
          output_type: Database["public"]["Enums"]["ai_output_type"]
          subject_id: string | null
          task_id: string | null
          tenant_id: string
          version: string
        }
        Insert: {
          content: Json
          created_at?: string | null
          id?: string
          output_type: Database["public"]["Enums"]["ai_output_type"]
          subject_id?: string | null
          task_id?: string | null
          tenant_id: string
          version?: string
        }
        Update: {
          content?: Json
          created_at?: string | null
          id?: string
          output_type?: Database["public"]["Enums"]["ai_output_type"]
          subject_id?: string | null
          task_id?: string | null
          tenant_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_outputs_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_outputs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_outputs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_settings: {
        Row: {
          allow_image_processing: boolean
          daily_cost_cap_usd: number
          enabled: boolean
          model: string
          redact_pii: boolean
          summary_length: number
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          allow_image_processing?: boolean
          daily_cost_cap_usd?: number
          enabled?: boolean
          model?: string
          redact_pii?: boolean
          summary_length?: number
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          allow_image_processing?: boolean
          daily_cost_cap_usd?: number
          enabled?: boolean
          model?: string
          redact_pii?: boolean
          summary_length?: number
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      api_audit_logs: {
        Row: {
          api_key_id: string | null
          created_at: string | null
          id: string
          latency_ms: number | null
          method: string
          path: string
          status: number
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string | null
          id?: string
          latency_ms?: number | null
          method: string
          path: string
          status: number
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          api_key_id?: string | null
          created_at?: string | null
          id?: string
          latency_ms?: number | null
          method?: string
          path?: string
          status?: number
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          active: boolean
          created_at: string | null
          id: string
          key_hash: string
          last_used_at: string | null
          name: string
          tenant_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          id?: string
          key_hash: string
          last_used_at?: string | null
          name: string
          tenant_id: string
        }
        Update: {
          active?: boolean
          created_at?: string | null
          id?: string
          key_hash?: string
          last_used_at?: string | null
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      automations: {
        Row: {
          action_spec: Json
          action_type: string
          active: boolean | null
          created_at: string | null
          id: string
          name: string
          tenant_id: string
          trigger_spec: Json
          trigger_type: string
        }
        Insert: {
          action_spec?: Json
          action_type: string
          active?: boolean | null
          created_at?: string | null
          id?: string
          name: string
          tenant_id: string
          trigger_spec?: Json
          trigger_type: string
        }
        Update: {
          action_spec?: Json
          action_type?: string
          active?: boolean | null
          created_at?: string | null
          id?: string
          name?: string
          tenant_id?: string
          trigger_spec?: Json
          trigger_type?: string
        }
        Relationships: []
      }
      checklist_runs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          id: string
          result: Json
          task_id: string
          template_id: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          result?: Json
          task_id: string
          template_id: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          result?: Json
          task_id?: string
          template_id?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_runs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_runs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          created_at: string | null
          id: string
          items: Json
          name: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          items?: Json
          name: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          items?: Json
          name?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      event_outbox: {
        Row: {
          attempts: number | null
          created_at: string | null
          event_type: string
          id: string
          next_attempt_at: string | null
          payload: Json
          status: string | null
          tenant_id: string
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          event_type: string
          id?: string
          next_attempt_at?: string | null
          payload: Json
          status?: string | null
          tenant_id: string
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          event_type?: string
          id?: string
          next_attempt_at?: string | null
          payload?: Json
          status?: string | null
          tenant_id?: string
        }
        Relationships: []
      }
      evidence: {
        Row: {
          checksum: string | null
          created_at: string | null
          created_by: string | null
          file_path: string
          filename: string
          id: string
          kind: Database["public"]["Enums"]["evidence_kind"]
          latitude: number | null
          longitude: number | null
          metadata: Json | null
          ocr_text: string | null
          task_id: string
          tenant_id: string
        }
        Insert: {
          checksum?: string | null
          created_at?: string | null
          created_by?: string | null
          file_path: string
          filename: string
          id?: string
          kind: Database["public"]["Enums"]["evidence_kind"]
          latitude?: number | null
          longitude?: number | null
          metadata?: Json | null
          ocr_text?: string | null
          task_id: string
          tenant_id: string
        }
        Update: {
          checksum?: string | null
          created_at?: string | null
          created_by?: string | null
          file_path?: string
          filename?: string
          id?: string
          kind?: Database["public"]["Enums"]["evidence_kind"]
          latitude?: number | null
          longitude?: number | null
          metadata?: Json | null
          ocr_text?: string | null
          task_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      idempotency_keys: {
        Row: {
          created_at: string | null
          id: string
          idempotency_key: string
          request_hash: string
          response_body: Json | null
          route: string
          status_code: number | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          idempotency_key: string
          request_hash: string
          response_body?: Json | null
          route: string
          status_code?: number | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          idempotency_key?: string
          request_hash?: string
          response_body?: Json | null
          route?: string
          status_code?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "idempotency_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      log_entries: {
        Row: {
          created_at: string | null
          created_by: string | null
          event_type: string
          id: string
          message: string | null
          metadata: Json | null
          subject_id: string
          task_id: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          event_type: string
          id?: string
          message?: string | null
          metadata?: Json | null
          subject_id: string
          task_id?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          event_type?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          subject_id?: string
          task_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "log_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_entries_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          role: Database["public"]["Enums"]["user_role"]
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          ai_health: number | null
          ai_top_issues: Json | null
          closed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          status: Database["public"]["Enums"]["subject_status"]
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          ai_health?: number | null
          ai_top_issues?: Json | null
          closed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          status?: Database["public"]["Enums"]["subject_status"]
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          ai_health?: number | null
          ai_top_issues?: Json | null
          closed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          status?: Database["public"]["Enums"]["subject_status"]
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subjects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          ai_flags: Json | null
          ai_last_summary_id: string | null
          ai_risk: number | null
          assigned_to: string | null
          checklist_id: string | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          required_evidence: Json
          status: Database["public"]["Enums"]["task_status"]
          subject_id: string
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          ai_flags?: Json | null
          ai_last_summary_id?: string | null
          ai_risk?: number | null
          assigned_to?: string | null
          checklist_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          required_evidence?: Json
          status?: Database["public"]["Enums"]["task_status"]
          subject_id: string
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          ai_flags?: Json | null
          ai_last_summary_id?: string | null
          ai_risk?: number | null
          assigned_to?: string | null
          checklist_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          required_evidence?: Json
          status?: Database["public"]["Enums"]["task_status"]
          subject_id?: string
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_ai_last_summary_id_fkey"
            columns: ["ai_last_summary_id"]
            isOneToOne: false
            referencedRelation: "ai_outputs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          id: string
          name: string
          settings: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          settings?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      webhook_delivery_logs: {
        Row: {
          created_at: string | null
          error: string | null
          http_code: number | null
          id: string
          latency_ms: number | null
          status: string
          subscription_id: string
        }
        Insert: {
          created_at?: string | null
          error?: string | null
          http_code?: number | null
          id?: string
          latency_ms?: number | null
          status: string
          subscription_id: string
        }
        Update: {
          created_at?: string | null
          error?: string | null
          http_code?: number | null
          id?: string
          latency_ms?: number | null
          status?: string
          subscription_id?: string
        }
        Relationships: []
      }
      webhook_subscriptions: {
        Row: {
          active: boolean | null
          created_at: string | null
          events: string[]
          id: string
          secret: string
          tenant_id: string
          url: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          events?: string[]
          id?: string
          secret: string
          tenant_id: string
          url: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          events?: string[]
          id?: string
          secret?: string
          tenant_id?: string
          url?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_ai_queue_effective: {
        Row: {
          cost_usd: number | null
          created_at: string | null
          error: string | null
          finished_at: string | null
          id: string | null
          input_ref: Json | null
          job_type: Database["public"]["Enums"]["ai_job_type"] | null
          model: string | null
          output_ref: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["ai_job_status"] | null
          subject_id: string | null
          task_id: string | null
          tenant_id: string | null
          tokens_in: number | null
          tokens_out: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_jobs_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_jobs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      cleanup_old_idempotency_keys: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      current_tenant_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_ai_jobs_for_processing: {
        Args: { batch_size?: number }
        Returns: {
          attempts: number
          id: string
          input_ref: Json
          job_type: string
          subject_id: string
          task_id: string
          tenant_id: string
        }[]
      }
      issue_api_key: {
        Args: { p_name: string; p_tenant_id: string }
        Returns: {
          api_key: string
          key_id: string
        }[]
      }
      redact_pii: {
        Args: { input_text: string }
        Returns: string
      }
      revoke_api_key: {
        Args: { p_key_id: string }
        Returns: boolean
      }
      trigger_ai_dispatcher: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      verify_api_key: {
        Args: { p_api_key: string }
        Returns: {
          key_id: string
          tenant_id: string
        }[]
      }
    }
    Enums: {
      ai_job_status: "queued" | "running" | "succeeded" | "failed"
      ai_job_type:
        | "normalize_logs"
        | "ocr_extract"
        | "risk_score"
        | "compliance_summary"
        | "embed_object"
      ai_output_type: "normalized_log" | "ocr" | "risk" | "summary" | "tags"
      evidence_kind: "photo" | "pdf"
      subject_status: "draft" | "active" | "closed" | "cancelled"
      task_status: "pending" | "in_progress" | "completed" | "blocked"
      user_role: "jefe" | "operador"
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
      ai_job_status: ["queued", "running", "succeeded", "failed"],
      ai_job_type: [
        "normalize_logs",
        "ocr_extract",
        "risk_score",
        "compliance_summary",
        "embed_object",
      ],
      ai_output_type: ["normalized_log", "ocr", "risk", "summary", "tags"],
      evidence_kind: ["photo", "pdf"],
      subject_status: ["draft", "active", "closed", "cancelled"],
      task_status: ["pending", "in_progress", "completed", "blocked"],
      user_role: ["jefe", "operador"],
    },
  },
} as const
