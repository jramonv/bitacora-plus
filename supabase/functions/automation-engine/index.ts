import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cron expression parser (basic implementation)
function shouldRunScheduled(cronExpr: string, now: Date): boolean {
  // For demo, simplified cron parsing - support basic expressions
  if (cronExpr === '0 9 * * 1') { // Every Monday at 9 AM
    return now.getDay() === 1 && now.getHours() === 9 && now.getMinutes() === 0;
  }
  if (cronExpr === '0 0 * * *') { // Daily at midnight
    return now.getHours() === 0 && now.getMinutes() === 0;
  }
  // Add more cron patterns as needed
  return false;
}

// Execute automation action
async function executeAction(automation: any, context: any = {}) {
  const { action_type, action_spec, tenant_id } = automation;
  
  console.log(`🔄 Executing ${action_type} action for automation ${automation.id}`);
  
  try {
    switch (action_type) {
      case 'email':
        return await executeEmailAction(automation, context);
      
      case 'webhook':
        return await executeWebhookAction(automation, context);
      
      case 'create_task':
        return await executeCreateTaskAction(automation, context);
      
      case 'close_task':
        return await executeCloseTaskAction(automation, context);
      
      default:
        throw new Error(`Unknown action type: ${action_type}`);
    }
  } catch (error) {
    console.error(`❌ Action execution failed:`, error);
    throw error;
  }
}

async function executeEmailAction(automation: any, context: any) {
  const { action_spec, tenant_id } = automation;
  const { to, subject, template } = action_spec;
  
  // For this implementation, we'll emit an email event to the outbox
  // The actual email sending would be handled by a separate service
  
  let emailBody = template || 'Automation triggered';
  
  // Simple template replacement
  if (context.task) {
    emailBody = emailBody.replace('{task.title}', context.task.title || '');
    emailBody = emailBody.replace('{task.id}', context.task.id || '');
    emailBody = emailBody.replace('{task.ai_risk}', context.task.ai_risk || 'N/A');
  }
  
  // Emit email event to outbox
  const { error } = await supabase.from('event_outbox').insert({
    tenant_id,
    event_type: 'automation.email',
    payload: {
      to,
      subject,
      body: emailBody,
      automation_id: automation.id,
      context
    }
  });
  
  if (error) throw error;
  
  console.log(`📧 Email action queued for ${to}`);
  return { success: true, action: 'email_queued' };
}

async function executeWebhookAction(automation: any, context: any) {
  const { action_spec, tenant_id } = automation;
  const { url, payload: payloadTemplate } = action_spec;
  
  // Merge template with context
  let payload = { ...payloadTemplate };
  if (context.task) {
    payload.task = context.task;
  }
  if (context.subject) {
    payload.subject = context.subject;
  }
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Bitacora-Automation/1.0'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
    }
    
    console.log(`🔗 Webhook action sent to ${url}`);
    return { success: true, action: 'webhook_sent', status: response.status };
  } catch (error) {
    console.error(`❌ Webhook action failed:`, error);
    throw error;
  }
}

async function executeCreateTaskAction(automation: any, context: any) {
  const { action_spec, tenant_id } = automation;
  const { subject_id, title, description, assigned_to, required_evidence } = action_spec;
  
  // Create the task
  const { data, error } = await supabase.from('tasks').insert({
    tenant_id,
    subject_id: subject_id || context.subject?.id,
    title: title || `Automated Task - ${new Date().toLocaleDateString()}`,
    description,
    assigned_to,
    required_evidence: required_evidence || {
      min_photos: 3,
      geotag_required: true,
      signature_required: true
    },
    status: 'pending'
  }).select().single();
  
  if (error) throw error;
  
  console.log(`📋 Task created: ${data.id}`);
  return { success: true, action: 'task_created', task_id: data.id };
}

async function executeCloseTaskAction(automation: any, context: any) {
  const { action_spec, tenant_id } = automation;
  const { task_id } = action_spec;
  
  const targetTaskId = task_id || context.task?.id;
  if (!targetTaskId) {
    throw new Error('No task ID provided for close action');
  }
  
  // Update task status to completed
  const { data, error } = await supabase
    .from('tasks')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('tenant_id', tenant_id)
    .eq('id', targetTaskId)
    .select()
    .single();
  
  if (error) throw error;
  
  console.log(`✅ Task closed: ${targetTaskId}`);
  return { success: true, action: 'task_closed', task_id: targetTaskId };
}

serve(async (req: Request) => {
  console.log('🤖 Automation engine starting...');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const url = new URL(req.url);
    const triggerType = url.searchParams.get('trigger') || 'schedule';
    
    if (triggerType === 'schedule') {
      return await processScheduledAutomations();
    } else if (triggerType === 'event') {
      return await processEventAutomations(req);
    } else {
      return new Response(JSON.stringify({ error: 'Invalid trigger type' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  } catch (error) {
    console.error('❌ Automation engine error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
});

async function processScheduledAutomations() {
  console.log('⏰ Processing scheduled automations...');
  
  const now = new Date();
  
  // Get all active scheduled automations
  const { data: automations, error } = await supabase
    .from('automations')
    .select('*')
    .eq('active', true)
    .eq('trigger_type', 'schedule');
  
  if (error) {
    console.error('Error fetching scheduled automations:', error);
    return new Response(JSON.stringify({ error: 'Database error' }), { status: 500 });
  }
  
  let executed = 0;
  let successful = 0;
  
  for (const automation of automations || []) {
    try {
      const { trigger_spec } = automation;
      const cronExpr = trigger_spec.cron;
      
      if (shouldRunScheduled(cronExpr, now)) {
        console.log(`🎯 Executing scheduled automation: ${automation.name}`);
        
        const result = await executeAction(automation);
        if (result.success) {
          successful++;
        }
        executed++;
      }
    } catch (error) {
      console.error(`Error executing automation ${automation.id}:`, error);
      executed++;
    }
  }
  
  console.log(`✨ Processed ${executed} scheduled automations, ${successful} successful`);
  
  return new Response(JSON.stringify({
    message: 'Scheduled automations processed',
    executed,
    successful
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

async function processEventAutomations(req: Request) {
  console.log('📡 Processing event-based automations...');
  
  const body = await req.json();
  const { event_type, payload, tenant_id } = body;
  
  if (!event_type || !tenant_id) {
    return new Response(JSON.stringify({ error: 'Missing event_type or tenant_id' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
  
  // Get automations that trigger on this event type
  const { data: automations, error } = await supabase
    .from('automations')
    .select('*')
    .eq('active', true)
    .eq('trigger_type', 'event')
    .eq('tenant_id', tenant_id);
  
  if (error) {
    console.error('Error fetching event automations:', error);
    return new Response(JSON.stringify({ error: 'Database error' }), { status: 500 });
  }
  
  let executed = 0;
  let successful = 0;
  
  for (const automation of automations || []) {
    try {
      const { trigger_spec } = automation;
      const triggerEvents = trigger_spec.events || [];
      
      if (triggerEvents.includes(event_type)) {
        // Check additional conditions if specified
        let shouldExecute = true;
        
        if (trigger_spec.conditions) {
          // Simple condition checking - can be extended
          if (trigger_spec.conditions.ai_risk_threshold && payload.ai_risk) {
            shouldExecute = payload.ai_risk >= trigger_spec.conditions.ai_risk_threshold;
          }
        }
        
        if (shouldExecute) {
          console.log(`🎯 Executing event automation: ${automation.name} for ${event_type}`);
          
          const result = await executeAction(automation, { 
            event_type, 
            ...payload 
          });
          
          if (result.success) {
            successful++;
          }
          executed++;
        }
      }
    } catch (error) {
      console.error(`Error executing automation ${automation.id}:`, error);
      executed++;
    }
  }
  
  console.log(`✨ Processed ${executed} event automations, ${successful} successful`);
  
  return new Response(JSON.stringify({
    message: 'Event automations processed',
    event_type,
    executed,
    successful
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}