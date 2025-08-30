// Extended types for better type safety with database JSON fields

export interface RequiredEvidence {
  min_photos?: number;
  geotag_required?: boolean;
  signature_required?: boolean;
  checklist_id?: string;
}

export interface ChecklistItem {
  text: string;
  required: boolean;
}

export interface ChecklistResult {
  [index: number]: {
    checked: boolean;
    notes?: string;
  };
}

export interface AIFlags {
  missing_geotag?: boolean;
  insufficient_photos?: boolean;
  duplicate_photo?: boolean;
  missing_signature?: boolean;
  checklist_incomplete?: boolean;
}

export interface EvidenceMetadata {
  originalName?: string;
  size?: number;
  mimeType?: string;
  checksum?: string;
  [key: string]: unknown;
}

export interface LogMetadata {
  previousValue?: unknown;
  newValue?: unknown;
  userId?: string;
  [key: string]: unknown;
}

// Task status types
export type TaskStatus = "pending" | "in_progress" | "completed" | "blocked";
export type SubjectStatus = "draft" | "active" | "closed" | "cancelled";
export type UserRole = "owner" | "editor" | "viewer";
export type EvidenceKind = "photo" | "pdf";

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  due_date?: string | null;
  completed_at?: string | null;
  ai_risk?: number | null;
  subjects: {
    id: string;
    title: string;
    status: SubjectStatus;
  };
}

// Helper functions for type casting
export const castRequiredEvidence = (data: unknown): RequiredEvidence => {
  if (!data || typeof data !== 'object') return {};
  return data as RequiredEvidence;
};

export const castChecklistResult = (data: unknown): ChecklistResult => {
  if (!data || typeof data !== 'object') return {};
  return data as ChecklistResult;
};

export const castAIFlags = (data: unknown): string[] => {
  if (!Array.isArray(data)) return [];
  return data as string[];
};

export const castLogMetadata = (data: unknown): LogMetadata => {
  if (!data || typeof data !== 'object') return {};
  return data as LogMetadata;
};