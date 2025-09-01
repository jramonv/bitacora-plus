import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, idempotency-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Rate limiting map (in-memory for simple implementation)
const rateLimits = new Map<string, { count: number; resetTime: number }>();

interface AuthContext {
  tenantId: string;
  userId?: string;
  apiKeyId?: string;
}

// Middleware: Rate limiting
function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 300;

  const current = rateLimits.get(key) || { count: 0, resetTime: now + windowMs };
  
  if (now > current.resetTime) {
    current.count = 1;
    current.resetTime = now + windowMs;
  } else {
    current.count++;
  }
  
  rateLimits.set(key, current);
  return current.count <= maxRequests;
}

// Middleware: Authentication
async function authenticate(req: Request): Promise<AuthContext | null> {
  const apiKey = req.headers.get('x-api-key');
  const authHeader = req.headers.get('authorization');

  if (apiKey) {
    // API Key authentication
    const { data, error } = await supabase.rpc('verify_api_key', { p_api_key: apiKey });
    if (error || !data || data.length === 0) {
      return null;
    }
    return { tenantId: data[0].tenant_id, apiKeyId: data[0].key_id };
  } else if (authHeader?.startsWith('Bearer ')) {
    // JWT authentication
    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return null;
    }
    
    // Get tenant from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();
    
    if (!profile) {
      return null;
    }
    
    return { tenantId: profile.tenant_id, userId: user.id };
  }
  
  return null;
}

// Middleware: Idempotency
async function handleIdempotency(req: Request, auth: AuthContext, route: string) {
  const idempotencyKey = req.headers.get('idempotency-key');
  if (!idempotencyKey || !['POST', 'PATCH'].includes(req.method)) {
    return null;
  }

  const requestBody = await req.text();
  const requestHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(requestBody));
  const hashHex = Array.from(new Uint8Array(requestHash))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  // Check if request already exists
  const { data: existing } = await supabase
    .from('idempotency_keys')
    .select('response_body, status_code')
    .eq('tenant_id', auth.tenantId)
    .eq('idempotency_key', idempotencyKey)
    .eq('route', route)
    .eq('request_hash', hashHex)
    .single();

  if (existing) {
    return new Response(JSON.stringify(existing.response_body), {
      status: existing.status_code,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  // Store for later completion
  return { idempotencyKey, requestHash: hashHex, requestBody };
}

// Audit logging
async function logRequest(auth: AuthContext | null, req: Request, status: number, startTime: number) {
  if (!auth) return;
  
  const url = new URL(req.url);
  await supabase.from('api_audit_logs').insert({
    tenant_id: auth.tenantId,
    path: url.pathname,
    method: req.method,
    user_id: auth.userId,
    api_key_id: auth.apiKeyId,
    status,
    latency_ms: Date.now() - startTime
  });
}

// Error response helper
function errorResponse(type: string, title: string, detail: string, status = 400) {
  return new Response(JSON.stringify({
    type: `https://bitacora.api/errors/${type}`,
    title,
    detail,
    instance: crypto.randomUUID()
  }), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

// Pagination helper
function parsePagination(url: URL) {
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

serve(async (req: Request) => {
  const startTime = Date.now();
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname;

  // Rate limiting
  const auth = await authenticate(req);
  const rateLimitKey = auth?.tenantId || req.headers.get('x-forwarded-for') || 'anonymous';
  
  if (!checkRateLimit(rateLimitKey)) {
    await logRequest(auth, req, 429, startTime);
    return errorResponse('rate_limit_exceeded', 'Rate Limit Exceeded', 'Too many requests', 429);
  }

  // Authentication required for API
  if (!auth) {
    await logRequest(null, req, 401, startTime);
    return errorResponse('unauthorized', 'Unauthorized', 'Valid API key or JWT required', 401);
  }

  try {
    // Route handling
    if (path === '/api/v1/subjects' && req.method === 'GET') {
      return await getSubjects(req, auth, startTime);
    } else if (path === '/api/v1/subjects' && req.method === 'POST') {
      return await createSubject(req, auth, startTime);
    } else if (path.match(/^\/api\/v1\/subjects\/[^\/]+$/) && req.method === 'GET') {
      const id = path.split('/').pop();
      return await getSubject(req, auth, id!, startTime);
    } else if (path === '/api/v1/tasks' && req.method === 'POST') {
      return await createTask(req, auth, startTime);
    } else if (path.match(/^\/api\/v1\/tasks\/[^\/]+$/) && req.method === 'PATCH') {
      const id = path.split('/').pop();
      return await updateTask(req, auth, id!, startTime);
    } else if (path.match(/^\/api\/v1\/tasks\/[^\/]+$/) && req.method === 'GET') {
      const id = path.split('/').pop();
      return await getTask(req, auth, id!, startTime);
    } else if (path.match(/^\/api\/v1\/tasks\/[^\/]+\/close$/) && req.method === 'POST') {
      const id = path.split('/')[4];
      return await closeTask(req, auth, id, startTime);
    } else {
      await logRequest(auth, req, 404, startTime);
      return errorResponse('not_found', 'Not Found', 'Endpoint not found', 404);
    }
  } catch (error) {
    console.error('API Error:', error);
    await logRequest(auth, req, 500, startTime);
    return errorResponse('internal_error', 'Internal Server Error', 'An unexpected error occurred', 500);
  }
});

async function getSubjects(req: Request, auth: AuthContext, startTime: number) {
  const url = new URL(req.url);
  const { page, limit, offset } = parsePagination(url);
  
  const status = url.searchParams.get('status');
  const dueFrom = url.searchParams.get('due_from');
  const dueTo = url.searchParams.get('due_to');

  let query = supabase
    .from('subjects')
    .select('*', { count: 'exact' })
    .eq('tenant_id', auth.tenantId)
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);
  if (dueFrom) query = query.gte('due_date', dueFrom);
  if (dueTo) query = query.lte('due_date', dueTo);

  const { data, error, count } = await query;

  if (error) {
    await logRequest(auth, req, 500, startTime);
    return errorResponse('database_error', 'Database Error', error.message, 500);
  }

  await logRequest(auth, req, 200, startTime);
  return new Response(JSON.stringify({
    data,
    page,
    total: count || 0
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

async function createSubject(req: Request, auth: AuthContext, startTime: number) {
  const idempotency = await handleIdempotency(req, auth, '/api/v1/subjects');
  if (idempotency instanceof Response) return idempotency;

  const body = idempotency ? JSON.parse(idempotency.requestBody) : await req.json();
  const { title, description, due_date } = body;

  if (!title) {
    await logRequest(auth, req, 400, startTime);
    return errorResponse('validation_error', 'Validation Error', 'Title is required');
  }

  const { data, error } = await supabase
    .from('subjects')
    .insert({
      tenant_id: auth.tenantId,
      title,
      description,
      due_date,
      created_by: auth.userId,
      status: 'draft'
    })
    .select()
    .single();

  if (error) {
    await logRequest(auth, req, 500, startTime);
    return errorResponse('database_error', 'Database Error', error.message, 500);
  }

  // Store idempotency result
  if (idempotency) {
    await supabase.from('idempotency_keys').insert({
      tenant_id: auth.tenantId,
      idempotency_key: idempotency.idempotencyKey,
      route: '/api/v1/subjects',
      request_hash: idempotency.requestHash,
      response_body: data,
      status_code: 201
    });
  }

  await logRequest(auth, req, 201, startTime);
  return new Response(JSON.stringify(data), {
    status: 201,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

async function getSubject(req: Request, auth: AuthContext, id: string, startTime: number) {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('tenant_id', auth.tenantId)
    .eq('id', id)
    .single();

  if (error || !data) {
    await logRequest(auth, req, 404, startTime);
    return errorResponse('not_found', 'Subject Not Found', 'Subject not found', 404);
  }

  await logRequest(auth, req, 200, startTime);
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

async function createTask(req: Request, auth: AuthContext, startTime: number) {
  const idempotency = await handleIdempotency(req, auth, '/api/v1/tasks');
  if (idempotency instanceof Response) return idempotency;

  const body = idempotency ? JSON.parse(idempotency.requestBody) : await req.json();
  const { subject_id, title, description, assignee_id, due_date, required_evidence } = body;

  if (!subject_id || !title) {
    await logRequest(auth, req, 400, startTime);
    return errorResponse('validation_error', 'Validation Error', 'Subject ID and title are required');
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      tenant_id: auth.tenantId,
      subject_id,
      title,
      description,
      assigned_to: assignee_id,
      due_date,
      required_evidence: required_evidence || {
        min_photos: 3,
        geotag_required: true,
        signature_required: true
      },
      status: 'pending'
    })
    .select()
    .single();

  if (error) {
    await logRequest(auth, req, 500, startTime);
    return errorResponse('database_error', 'Database Error', error.message, 500);
  }

  // Store idempotency result
  if (idempotency) {
    await supabase.from('idempotency_keys').insert({
      tenant_id: auth.tenantId,
      idempotency_key: idempotency.idempotencyKey,
      route: '/api/v1/tasks',
      request_hash: idempotency.requestHash,
      response_body: data,
      status_code: 201
    });
  }

  await logRequest(auth, req, 201, startTime);
  return new Response(JSON.stringify(data), {
    status: 201,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

async function updateTask(req: Request, auth: AuthContext, id: string, startTime: number) {
  const idempotency = await handleIdempotency(req, auth, `/api/v1/tasks/${id}`);
  if (idempotency instanceof Response) return idempotency;

  const body = idempotency ? JSON.parse(idempotency.requestBody) : await req.json();
  const { title, description, assignee_id, due_date, required_evidence, status } = body;

  const updates: any = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (assignee_id !== undefined) updates.assigned_to = assignee_id;
  if (due_date !== undefined) updates.due_date = due_date;
  if (required_evidence !== undefined) updates.required_evidence = required_evidence;
  if (status !== undefined) updates.status = status;

  if (Object.keys(updates).length === 0) {
    await logRequest(auth, req, 400, startTime);
    return errorResponse('validation_error', 'Validation Error', 'No valid fields to update');
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('tenant_id', auth.tenantId)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    await logRequest(auth, req, 404, startTime);
    return errorResponse('not_found', 'Task Not Found', 'Task not found or access denied', 404);
  }

  // Store idempotency result
  if (idempotency) {
    await supabase.from('idempotency_keys').insert({
      tenant_id: auth.tenantId,
      idempotency_key: idempotency.idempotencyKey,
      route: `/api/v1/tasks/${id}`,
      request_hash: idempotency.requestHash,
      response_body: data,
      status_code: 200
    });
  }

  await logRequest(auth, req, 200, startTime);
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

async function getTask(req: Request, auth: AuthContext, id: string, startTime: number) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, evidence(*)')
    .eq('tenant_id', auth.tenantId)
    .eq('id', id)
    .single();

  if (error || !data) {
    await logRequest(auth, req, 404, startTime);
    return errorResponse('not_found', 'Task Not Found', 'Task not found', 404);
  }

  await logRequest(auth, req, 200, startTime);
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

async function closeTask(req: Request, auth: AuthContext, id: string, startTime: number) {
  const body = await req.json();
  const { signature_ref, lat, lon } = body;

  // Get task and validate requirements
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('*, evidence(*)')
    .eq('tenant_id', auth.tenantId)
    .eq('id', id)
    .single();

  if (taskError || !task) {
    await logRequest(auth, req, 404, startTime);
    return errorResponse('not_found', 'Task Not Found', 'Task not found', 404);
  }

  if (task.status === 'completed') {
    await logRequest(auth, req, 400, startTime);
    return errorResponse('invalid_state', 'Task Already Closed', 'Task is already completed');
  }

  // Validate compliance requirements
  const requiredEvidence = task.required_evidence || {};
  const evidence = task.evidence || [];
  
  const violations = [];
  
  if (requiredEvidence.min_photos && evidence.filter(e => e.kind === 'photo').length < requiredEvidence.min_photos) {
    violations.push(`Minimum ${requiredEvidence.min_photos} photos required`);
  }
  
  if (requiredEvidence.geotag_required && !evidence.some(e => e.latitude && e.longitude)) {
    violations.push('Geotag required on at least one evidence');
  }
  
  if (requiredEvidence.signature_required && !signature_ref) {
    violations.push('Signature required for task closure');
  }

  if (violations.length > 0) {
    await logRequest(auth, req, 400, startTime);
    return errorResponse('compliance_violation', 'Compliance Requirements Not Met', violations.join('; '));
  }

  // Close the task
  const { data, error } = await supabase
    .from('tasks')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('tenant_id', auth.tenantId)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    await logRequest(auth, req, 500, startTime);
    return errorResponse('database_error', 'Database Error', error.message, 500);
  }

  await logRequest(auth, req, 200, startTime);
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}