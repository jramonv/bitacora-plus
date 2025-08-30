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
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      current_tenant_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
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
      user_role: "owner" | "editor" | "viewer"
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
      user_role: ["owner", "editor", "viewer"],
    },
  },
} as const
