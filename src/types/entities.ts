import { TaskStatus, SubjectStatus, RequiredEvidence, ChecklistResult, EvidenceKind, LogMetadata, ChecklistItem, EvidenceMetadata } from "./database";

export interface ChecklistTemplate {
  id: string;
  name: string;
  items: ChecklistItem[];
}

export interface ChecklistRun {
  id: string;
  task_id: string;
  template_id: string;
  created_at?: string | null;
  created_by?: string | null;
  completed_at?: string | null;
  result?: ChecklistResult | null;
  checklist_templates?: ChecklistTemplate;
}

export interface Evidence {
  id: string;
  filename: string;
  file_path: string;
  kind: EvidenceKind;
  latitude?: number | null;
  longitude?: number | null;
  created_at?: string | null;
  metadata?: EvidenceMetadata;
}

export interface Task {
  id: string;
  subject_id: string;
  tenant_id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  due_date?: string | null;
  completed_at?: string | null;
  assigned_to?: string | null;
  required_evidence: RequiredEvidence;
  ai_risk?: number | null;
  ai_flags?: string[] | null;
  checklist_runs?: ChecklistRun[];
  evidence?: Evidence[];
  subjects?: Pick<Subject, 'id' | 'title' | 'status'>;
}

export interface LogEntry {
  id: string;
  event_type: string;
  message: string;
  created_at: string;
  created_by?: string | null;
  metadata?: LogMetadata | null;
}

export interface Subject {
  id: string;
  title: string;
  description?: string | null;
  status: SubjectStatus;
  due_date?: string | null;
  closed_at?: string | null;
  created_at?: string | null;
  ai_health?: number | null;
  ai_top_issues?: any;
  tasks?: Task[];
  log_entries?: LogEntry[];
}

