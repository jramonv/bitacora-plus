const ERP_API_URL = import.meta.env.VITE_ERP_API_URL;
const ERP_API_KEY = import.meta.env.VITE_ERP_API_KEY;

interface SubjectPayload {
  id: string;
  [key: string]: any;
}

async function request(path: string, options: RequestInit = {}) {
  if (!ERP_API_URL || !ERP_API_KEY) {
    throw new Error('ERP credentials are not configured');
  }

  const response = await fetch(`${ERP_API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ERP_API_KEY}`,
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    throw new Error(`ERP request failed: ${response.status}`);
  }

  return response.json();
}

export async function createSubject(subject: SubjectPayload) {
  return request('/subjects', {
    method: 'POST',
    body: JSON.stringify(subject)
  });
}

export async function updateSubject(subject: SubjectPayload) {
  if (!subject.id) throw new Error('Subject ID is required');
  return request(`/subjects/${subject.id}`, {
    method: 'PUT',
    body: JSON.stringify(subject)
  });
}

export async function closeSubject(id: string) {
  return request(`/subjects/${id}/close`, {
    method: 'POST'
  });
}

export default {
  createSubject,
  updateSubject,
  closeSubject
};
