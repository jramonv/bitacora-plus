/**
 * Bitácora TypeScript SDK
 * 
 * A typed client for the Bitácora API
 */

export interface BitacoraConfig {
  baseUrl: string;
  apiKey?: string;
  bearerToken?: string;
}

export interface Subject {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  status: 'draft' | 'active' | 'closed' | 'cancelled';
  due_date?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  ai_health?: number;
  ai_top_issues: string[];
}

export interface Task {
  id: string;
  tenant_id: string;
  subject_id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  assigned_to?: string;
  due_date?: string;
  completed_at?: string;
  required_evidence: RequiredEvidence;
  checklist_id?: string;
  ai_flags: string[];
  ai_risk?: number;
  ai_last_summary_id?: string;
  created_at: string;
  updated_at: string;
  evidence?: Evidence[];
}

export interface RequiredEvidence {
  min_photos?: number;
  geotag_required?: boolean;
  signature_required?: boolean;
  checklist_id?: string;
}

export interface Evidence {
  id: string;
  tenant_id: string;
  task_id: string;
  kind: 'photo' | 'pdf';
  filename: string;
  file_path: string;
  checksum?: string;
  latitude?: number;
  longitude?: number;
  metadata?: Record<string, any>;
  created_by?: string;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  total: number;
}

export interface CreateSubjectRequest {
  title: string;
  description?: string;
  due_date?: string;
}

export interface CreateTaskRequest {
  subject_id: string;
  title: string;
  description?: string;
  assignee_id?: string;
  due_date?: string;
  required_evidence?: RequiredEvidence;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  assignee_id?: string;
  due_date?: string;
  required_evidence?: RequiredEvidence;
  status?: 'pending' | 'in_progress' | 'completed' | 'blocked';
}

export interface CloseTaskRequest {
  signature_ref?: string;
  lat?: number;
  lon?: number;
}

export interface PresignedUploadRequest {
  subject_id: string;
  task_id: string;
  filename: string;
  content_type: string;
  size: number;
}

export interface PresignedUploadResponse {
  upload_url: string;
  file_path: string;
  expires_in: number;
  instructions: {
    method: string;
    headers: Record<string, string>;
    note: string;
  };
}

export interface ApiError {
  type: string;
  title: string;
  detail: string;
  instance: string;
}

export class BitacoraClient {
  private config: BitacoraConfig;

  constructor(config: BitacoraConfig) {
    this.config = config;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {},
    idempotencyKey?: string
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>
    };

    // Authentication
    if (this.config.apiKey) {
      headers['X-Api-Key'] = this.config.apiKey;
    } else if (this.config.bearerToken) {
      headers['Authorization'] = `Bearer ${this.config.bearerToken}`;
    }

    // Idempotency
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        type: 'https://bitacora.api/errors/http_error',
        title: 'HTTP Error',
        detail: `${response.status} ${response.statusText}`,
        instance: crypto.randomUUID()
      }));
      throw new Error(`${error.title}: ${error.detail}`);
    }

    // Handle empty responses (e.g., 204 No Content)
    const contentLength = response.headers.get('Content-Length');
    if (response.status === 204 || contentLength === '0') {
      return null as unknown as T;
    }

    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('application/json')) {
      return response.json();
    }

    if (contentType.startsWith('text/')) {
      return response.text() as unknown as T;
    }

    // Unsupported content type
    throw new Error(`Unsupported response type: ${contentType || 'unknown'}`);
  }

  // Subjects API
  async getSubjects(params?: {
    status?: string;
    due_from?: string;
    due_to?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Subject>> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          query.append(key, value.toString());
        }
      });
    }
    
    const endpoint = `/subjects${query.toString() ? `?${query}` : ''}`;
    return this.request<PaginatedResponse<Subject>>(endpoint);
  }

  async createSubject(
    data: CreateSubjectRequest, 
    idempotencyKey?: string
  ): Promise<Subject> {
    return this.request<Subject>('/subjects', {
      method: 'POST',
      body: JSON.stringify(data)
    }, idempotencyKey);
  }

  async getSubject(id: string): Promise<Subject> {
    return this.request<Subject>(`/subjects/${id}`);
  }

  // Tasks API
  async createTask(
    data: CreateTaskRequest,
    idempotencyKey?: string
  ): Promise<Task> {
    return this.request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data)
    }, idempotencyKey);
  }

  async getTask(id: string): Promise<Task> {
    return this.request<Task>(`/tasks/${id}`);
  }

  async updateTask(
    id: string,
    data: UpdateTaskRequest,
    idempotencyKey?: string
  ): Promise<Task> {
    return this.request<Task>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }, idempotencyKey);
  }

  async closeTask(id: string, data: CloseTaskRequest = {}): Promise<Task> {
    return this.request<Task>(`/tasks/${id}/close`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getTaskPdf(id: string): Promise<Blob> {
    const url = `${this.config.baseUrl}/tasks/${id}/report.pdf`;
    
    const headers: Record<string, string> = {};
    if (this.config.apiKey) {
      headers['X-Api-Key'] = this.config.apiKey;
    } else if (this.config.bearerToken) {
      headers['Authorization'] = `Bearer ${this.config.bearerToken}`;
    }

    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`Failed to get PDF: ${response.status} ${response.statusText}`);
    }

    return response.blob();
  }

  // Upload API
  async getPresignedUploadUrl(data: PresignedUploadRequest): Promise<PresignedUploadResponse> {
    return this.request<PresignedUploadResponse>('/uploads/presign', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async uploadFile(
    uploadUrl: string,
    file: File | Blob,
    contentType: string
  ): Promise<void> {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'Content-Length': file.size.toString()
      },
      body: file
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }
  }

  // Helper method for complete file upload flow
  async uploadEvidence(
    subjectId: string,
    taskId: string,
    file: File
  ): Promise<{ file_path: string }> {
    // Get presigned URL
    const presigned = await this.getPresignedUploadUrl({
      subject_id: subjectId,
      task_id: taskId,
      filename: file.name,
      content_type: file.type,
      size: file.size
    });

    // Upload file
    await this.uploadFile(presigned.upload_url, file, file.type);

    return { file_path: presigned.file_path };
  }
}

// Example usage
export const examples = {
  // Basic client setup
  client: new BitacoraClient({
    baseUrl: 'https://your-project.supabase.co/functions/v1/api-v1',
    apiKey: 'bta_your_api_key_here'
  }),

  // Create a subject
  async createSubject() {
    const client = new BitacoraClient({
      baseUrl: 'https://your-project.supabase.co/functions/v1/api-v1',
      apiKey: 'bta_your_api_key_here'
    });

    try {
      const subject = await client.createSubject({
        title: 'Building Inspection',
        description: 'Annual safety inspection',
        due_date: '2024-12-31T09:00:00Z'
      });
      console.log('Created subject:', subject.id);
      return subject;
    } catch (error) {
      console.error('Failed to create subject:', error);
      throw error;
    }
  },

  // Create a task with evidence requirements
  async createTask(subjectId: string) {
    const client = new BitacoraClient({
      baseUrl: 'https://your-project.supabase.co/functions/v1/api-v1',
      apiKey: 'bta_your_api_key_here'
    });

    try {
      const task = await client.createTask({
        subject_id: subjectId,
        title: 'Check fire extinguishers',
        description: 'Verify all fire extinguishers are charged and accessible',
        required_evidence: {
          min_photos: 5,
          geotag_required: true,
          signature_required: true
        }
      });
      console.log('Created task:', task.id);
      return task;
    } catch (error) {
      console.error('Failed to create task:', error);
      throw error;
    }
  },

  // Upload evidence
  async uploadEvidence(subjectId: string, taskId: string, file: File) {
    const client = new BitacoraClient({
      baseUrl: 'https://your-project.supabase.co/functions/v1/api-v1',
      apiKey: 'bta_your_api_key_here'
    });

    try {
      const result = await client.uploadEvidence(subjectId, taskId, file);
      console.log('Uploaded file:', result.file_path);
      return result;
    } catch (error) {
      console.error('Failed to upload evidence:', error);
      throw error;
    }
  },

  // Close task (with compliance validation)
  async closeTask(taskId: string) {
    const client = new BitacoraClient({
      baseUrl: 'https://your-project.supabase.co/functions/v1/api-v1',
      apiKey: 'bta_your_api_key_here'
    });

    try {
      const task = await client.closeTask(taskId, {
        signature_ref: 'signature_evidence_id',
        lat: 40.7128,
        lon: -74.0060
      });
      console.log('Task closed:', task.id);
      return task;
    } catch (error) {
      console.error('Failed to close task (compliance issues?):', error);
      throw error;
    }
  }
};

export default BitacoraClient;