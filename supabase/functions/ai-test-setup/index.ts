import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🧪 Setting up AI test data...');
    
    // This is a test function to demonstrate the AI job processing flow
    // In production, jobs would be created by triggers
    
    const body = await req.json();
    const { tenant_id, action } = body;
    
    if (!tenant_id) {
      return new Response(JSON.stringify({ error: 'tenant_id required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    const results: any[] = [];
    
    if (action === 'create_test_jobs' || !action) {
      // Create a test subject and task
      const { data: subject, error: subjectError } = await supabase
        .from('subjects')
        .insert({
          tenant_id,
          title: 'Test AI Processing Subject',
          description: 'Subject for testing AI job processing',
          status: 'active'
        })
        .select()
        .single();
      
      if (subjectError) throw subjectError;
      results.push({ type: 'subject', id: subject.id });
      
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          tenant_id,
          subject_id: subject.id,
          title: 'Test AI Task',
          description: 'Task for testing AI job processing',
          status: 'in_progress',
          required_evidence: {
            min_photos: 3,
            geotag_required: true,
            signature_required: true
          }
        })
        .select()
        .single();
      
      if (taskError) throw taskError;
      results.push({ type: 'task', id: task.id });
      
      // Create some test log entries
      const logEntries = [
        {
          tenant_id,
          subject_id: subject.id,
          task_id: task.id,
          event_type: 'status_change',
          message: 'Task started by technician John Doe'
        },
        {
          tenant_id,
          subject_id: subject.id,
          task_id: task.id,
          event_type: 'photo_taken',
          message: 'Photo evidence captured at site entrance'
        },
        {
          tenant_id,
          subject_id: subject.id,
          task_id: task.id,
          event_type: 'note_added',
          message: 'Found minor issue with electrical panel, documented with photos'
        }
      ];
      
      const { data: logs, error: logsError } = await supabase
        .from('log_entries')
        .insert(logEntries)
        .select();
      
      if (logsError) throw logsError;
      results.push({ type: 'log_entries', count: logs?.length || 0 });
      
      // Create test evidence
      const { data: evidence, error: evidenceError } = await supabase
        .from('evidence')
        .insert({
          tenant_id,
          task_id: task.id,
          kind: 'photo',
          filename: 'test-photo.jpg',
          file_path: `bitacora/${tenant_id}/${subject.id}/${task.id}/test-photo.jpg`,
          latitude: 40.7128,
          longitude: -74.0060,
          metadata: { test: true }
        })
        .select()
        .single();
      
      if (evidenceError) throw evidenceError;
      results.push({ type: 'evidence', id: evidence.id });
      
      console.log('✅ Test data created successfully');
    }
    
    if (action === 'trigger_dispatcher' || action === 'create_test_jobs') {
      // Manually trigger the AI dispatcher
      const dispatcherResponse = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-dispatcher`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ trigger: 'manual' })
        }
      );
      
      const dispatcherResult = await dispatcherResponse.json();
      results.push({ type: 'dispatcher_result', data: dispatcherResult });
      
      console.log('🤖 AI dispatcher triggered');
    }
    
    if (action === 'check_results') {
      // Check AI job results
      const { data: jobs, error: jobsError } = await supabase
        .from('ai_jobs')
        .select('*')
        .eq('tenant_id', tenant_id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (jobsError) throw jobsError;
      
      const { data: outputs, error: outputsError } = await supabase
        .from('ai_outputs')
        .select('*')
        .eq('tenant_id', tenant_id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (outputsError) throw outputsError;
      
      results.push({ 
        type: 'status_check',
        jobs: jobs?.length || 0,
        outputs: outputs?.length || 0,
        recent_jobs: jobs?.slice(0, 5).map(j => ({
          id: j.id,
          job_type: j.job_type,
          status: j.status,
          cost_usd: j.cost_usd
        }))
      });
    }
    
    return new Response(JSON.stringify({
      message: 'AI test setup completed',
      action: action || 'create_test_jobs',
      results
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
    
  } catch (error) {
    console.error('❌ AI test setup error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
});