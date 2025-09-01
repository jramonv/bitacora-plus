import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Validate file type and size
function validateFile(contentType: string, size: number) {
  const allowedTypes = [
    'image/jpeg',
    'image/png', 
    'image/webp',
    'application/pdf'
  ];
  
  const maxSize = 50 * 1024 * 1024; // 50MB
  
  if (!allowedTypes.includes(contentType)) {
    throw new Error(`File type ${contentType} not allowed`);
  }
  
  if (size > maxSize) {
    throw new Error(`File size ${size} exceeds maximum of ${maxSize} bytes`);
  }
}

// Generate secure file path
function generateFilePath(tenantId: string, subjectId: string, taskId: string, filename: string): string {
  const timestamp = Date.now();
  const random = crypto.randomUUID().split('-')[0];
  const extension = filename.split('.').pop();
  const safeName = `${timestamp}-${random}.${extension}`;
  
  return `bitacora/${tenantId}/${subjectId}/${taskId}/${safeName}`;
}

// Authentication middleware
async function authenticate(req: Request) {
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

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  try {
    // Authenticate request
    const auth = await authenticate(req);
    if (!auth) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const body = await req.json();
    const { subject_id, task_id, filename, content_type, size } = body;

    // Validate required fields
    if (!subject_id || !task_id || !filename || !content_type || !size) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: subject_id, task_id, filename, content_type, size'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Validate file
    try {
      validateFile(content_type, size);
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Verify task belongs to tenant
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, subject_id')
      .eq('id', task_id)
      .eq('subject_id', subject_id)
      .eq('tenant_id', auth.tenantId)
      .single();

    if (taskError || !task) {
      return new Response(JSON.stringify({ error: 'Task not found or access denied' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Generate file path
    const filePath = generateFilePath(auth.tenantId, subject_id, task_id, filename);

    console.log(`📁 Generating presigned URL for: ${filePath}`);

    // Generate presigned URL for upload
    const { data: signedUrl, error: urlError } = await supabase.storage
      .from('bitacora')
      .createSignedUploadUrl(filePath, {
        upsert: false
      });

    if (urlError) {
      console.error('Error generating presigned URL:', urlError);
      return new Response(JSON.stringify({ 
        error: 'Failed to generate upload URL',
        details: urlError.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    console.log(`✅ Presigned URL generated successfully`);

    // Return upload URL and file path
    return new Response(JSON.stringify({
      upload_url: signedUrl.signedUrl,
      file_path: filePath,
      expires_in: 3600, // 1 hour
      instructions: {
        method: 'PUT',
        headers: {
          'Content-Type': content_type,
          'Content-Length': size.toString()
        },
        note: 'Upload the file using PUT method to the upload_url'
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
    console.error('❌ Presigned upload error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
});