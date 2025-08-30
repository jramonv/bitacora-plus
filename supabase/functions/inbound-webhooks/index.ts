import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hub-signature, x-hub-signature-256, x-tenant',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// HMAC verification
async function verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    // Handle different signature formats
    let expectedHash = signature;
    if (signature.startsWith('sha256=')) {
      expectedHash = signature.substring(7);
    } else if (signature.startsWith('sha1=')) {
      // Convert to SHA-256 for consistency
      return false; // Require SHA-256
    }
    
    const computedSignature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const computedHash = Array.from(new Uint8Array(computedSignature))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    
    return computedHash === expectedHash;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

// Get tenant configuration for provider
async function getTenantConfig(tenantId: string, provider: string) {
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();
  
  if (error || !tenant) {
    throw new Error('Tenant not found');
  }
  
  const settings = tenant.settings || {};
  const providerConfig = settings[`inbound_${provider}`];
  
  if (!providerConfig || !providerConfig.enabled) {
    throw new Error(`Provider ${provider} not configured for tenant`);
  }
  
  return providerConfig;
}

// Normalize different provider payloads to internal format
function normalizePayload(provider: string, payload: any) {
  switch (provider) {
    case 'pipedrive':
      return normalizePipedrivePayload(payload);
    case 'shopify':
      return normalizeShopifyPayload(payload);
    case 'custom':
      return normalizeCustomPayload(payload);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

function normalizePipedrivePayload(payload: any) {
  // Pipedrive deal webhook normalization
  const deal = payload.current || payload.previous;
  
  return {
    type: 'subject',
    data: {
      title: deal.title,
      description: `Pipedrive Deal - Value: ${deal.value} ${deal.currency}`,
      status: deal.status === 'won' ? 'active' : 'draft',
      external_id: `pipedrive_${deal.id}`,
      metadata: {
        provider: 'pipedrive',
        deal_id: deal.id,
        stage_id: deal.stage_id,
        person_id: deal.person_id,
        org_id: deal.org_id
      }
    }
  };
}

function normalizeShopifyPayload(payload: any) {
  // Shopify order webhook normalization
  const order = payload;
  
  return {
    type: 'subject',
    data: {
      title: `Order #${order.order_number || order.id}`,
      description: `Shopify Order - Total: ${order.total_price} ${order.currency}`,
      status: 'active',
      external_id: `shopify_${order.id}`,
      metadata: {
        provider: 'shopify',
        order_id: order.id,
        order_number: order.order_number,
        customer_id: order.customer?.id,
        fulfillment_status: order.fulfillment_status
      }
    },
    tasks: [
      {
        title: 'Process Order',
        description: 'Process and fulfill the order',
        required_evidence: {
          min_photos: 1,
          geotag_required: false,
          signature_required: true
        }
      }
    ]
  };
}

function normalizeCustomPayload(payload: any) {
  // Custom webhook format - expect normalized data
  return payload;
}

// Create entities from normalized payload
async function createEntities(tenantId: string, normalized: any) {
  const results = [];
  
  if (normalized.type === 'subject' || normalized.data) {
    // Create subject
    const { data: subject, error: subjectError } = await supabase
      .from('subjects')
      .insert({
        tenant_id: tenantId,
        title: normalized.data.title,
        description: normalized.data.description,
        status: normalized.data.status || 'draft',
        metadata: normalized.data.metadata
      })
      .select()
      .single();
    
    if (subjectError) {
      throw new Error(`Failed to create subject: ${subjectError.message}`);
    }
    
    results.push({ type: 'subject', id: subject.id, data: subject });
    
    // Create associated tasks if specified
    if (normalized.tasks && Array.isArray(normalized.tasks)) {
      for (const taskData of normalized.tasks) {
        const { data: task, error: taskError } = await supabase
          .from('tasks')
          .insert({
            tenant_id: tenantId,
            subject_id: subject.id,
            title: taskData.title,
            description: taskData.description,
            required_evidence: taskData.required_evidence || {
              min_photos: 3,
              geotag_required: true,  
              signature_required: true
            },
            status: 'pending'
          })
          .select()
          .single();
        
        if (taskError) {
          console.error('Failed to create task:', taskError);
        } else {
          results.push({ type: 'task', id: task.id, data: task });
        }
      }
    }
  }
  
  return results;
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
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const provider = pathParts[pathParts.length - 1]; // Last part of path

    console.log(`📡 Inbound webhook from ${provider}`);

    // Get tenant ID from header or query param
    const tenantId = req.headers.get('x-tenant') || url.searchParams.get('tenant_id');
    if (!tenantId) {
      return new Response(JSON.stringify({ error: 'Missing tenant identifier' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Get tenant configuration for this provider
    let config;
    try {
      config = await getTenantConfig(tenantId, provider);
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Read and verify the payload
    const payloadText = await req.text();
    const signature = req.headers.get('x-hub-signature-256') || req.headers.get('x-hub-signature');
    
    if (config.verify_signature && signature && config.webhook_secret) {
      const isValid = await verifySignature(payloadText, signature, config.webhook_secret);
      if (!isValid) {
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    // Parse payload
    let payload;
    try {
      payload = JSON.parse(payloadText);
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    console.log(`✅ Webhook payload verified and parsed`);

    // Normalize payload to internal format
    const normalized = normalizePayload(provider, payload);
    
    // Create entities
    const results = await createEntities(tenantId, normalized);

    console.log(`🎯 Created ${results.length} entities from webhook`);

    // Log the inbound webhook
    await supabase.from('api_audit_logs').insert({
      tenant_id: tenantId,
      path: url.pathname,
      method: req.method,
      status: 200,
      latency_ms: 0 // Will be calculated if needed
    });

    return new Response(JSON.stringify({
      message: 'Webhook processed successfully',
      provider,
      created: results.map(r => ({ type: r.type, id: r.id }))
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
    console.error('❌ Inbound webhook error:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
});