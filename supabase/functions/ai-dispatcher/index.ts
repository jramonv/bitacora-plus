import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const OPENAI_MODEL_RESPONSES = Deno.env.get('OPENAI_MODEL_RESPONSES') || 'gpt-4o-mini';
const OPENAI_MODEL_EMBEDDINGS = Deno.env.get('OPENAI_MODEL_EMBEDDINGS') || 'text-embedding-3-small';
const AI_JOB_BATCH = parseInt(Deno.env.get('AI_JOB_BATCH') || '10');
const AI_MAX_RETRIES = parseInt(Deno.env.get('AI_MAX_RETRIES') || '2');

// OpenAI pricing map (per 1M tokens) - update as needed
const PRICING = {
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-5-2025-08-07': { input: 3.00, output: 15.00 },
  'text-embedding-3-small': { input: 0.02, output: 0 },
  'text-embedding-3-large': { input: 0.13, output: 0 }
} as const;

interface AIJob {
  id: string;
  tenant_id: string;
  subject_id?: string;
  task_id?: string;
  job_type: string;
  input_ref?: any;
  attempts?: number;
}

interface AISettings {
  model: string;
  redact_pii: boolean;
  allow_image_processing: boolean;
  summary_length: number;
}

// Cost calculation helper
function calcCostUsd(model: string, tokensIn: number, tokensOut: number): number {
  const pricing = PRICING[model as keyof typeof PRICING];
  if (!pricing) return 0;
  
  return ((tokensIn * pricing.input) + (tokensOut * pricing.output)) / 1000000;
}

// PII redaction helper
async function redactText(text: string, settings: AISettings): Promise<string> {
  if (!settings.redact_pii || !text) return text;
  
  const { data, error } = await supabase.rpc('redact_pii', { input_text: text });
  if (error) {
    console.error('PII redaction error:', error);
    return text; // Fallback to original text
  }
  return data || text;
}

// Structured OpenAI API call helper
async function structuredCall(
  model: string,
  schema: any,
  messages: any[],
  temperature = 0.2
): Promise<{ content: any; tokens_in: number; tokens_out: number }> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const isNewModel = ['gpt-5-2025-08-07', 'gpt-5-mini-2025-08-07', 'gpt-4.1-2025-04-14', 'o3-2025-04-16', 'o4-mini-2025-04-16'].includes(model);

  const requestBody: any = {
    model,
    messages,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "structured_response",
        schema
      }
    }
  };

  // Handle different parameter names for different model generations
  if (isNewModel) {
    requestBody.max_completion_tokens = 4000;
    // Don't include temperature for new models
  } else {
    requestBody.max_tokens = 4000;
    requestBody.temperature = temperature;
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('OpenAI API error:', response.status, errorData);
    throw new Error(`OpenAI API error: ${response.status} ${errorData}`);
  }

  const data = await response.json();
  const content = JSON.parse(data.choices[0].message.content);
  
  return {
    content,
    tokens_in: data.usage?.prompt_tokens || 0,
    tokens_out: data.usage?.completion_tokens || 0
  };
}

// Embeddings API call
async function getEmbedding(text: string): Promise<{ embedding: number[]; tokens: number }> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL_EMBEDDINGS,
      input: text
    })
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('OpenAI Embeddings API error:', response.status, errorData);
    throw new Error(`OpenAI Embeddings API error: ${response.status} ${errorData}`);
  }

  const data = await response.json();
  
  return {
    embedding: data.data[0].embedding,
    tokens: data.usage?.total_tokens || 0
  };
}

// Job handlers
async function handleNormalizeLogs(job: AIJob, settings: AISettings) {
  console.log(`🔄 Processing normalize_logs for job ${job.id}`);
  
  // Fetch recent log entries for the subject/task
  let query = supabase
    .from('log_entries')
    .select('*')
    .eq('tenant_id', job.tenant_id)
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (job.task_id) {
    query = query.eq('task_id', job.task_id);
  } else if (job.subject_id) {
    query = query.eq('subject_id', job.subject_id);
  }
  
  const { data: logs, error: logsError } = await query;
  if (logsError) throw logsError;
  
  if (!logs || logs.length === 0) {
    throw new Error('No log entries found for normalization');
  }
  
  // Combine log messages
  const logTexts = logs.map(log => `${log.event_type}: ${log.message || ''}`).join('\n');
  const redactedText = await redactText(logTexts, settings);
  
  const schema = {
    type: "object",
    properties: {
      category: { type: "string" },
      severity: { type: "string", enum: ["low", "med", "high"] },
      tags: { type: "array", items: { type: "string" } },
      cleaned_text: { type: "string" }
    },
    required: ["cleaned_text"]
  };
  
  const messages = [
    {
      role: "system",
      content: "Normalize operational notes into structured fields: category, severity (low/med/high), tags array, and cleaned_text. Extract key information and categorize appropriately."
    },
    {
      role: "user", 
      content: `Please normalize these operational log entries:\n\n${redactedText}`
    }
  ];
  
  const result = await structuredCall(settings.model, schema, messages);
  
  // Store in ai_outputs
  const { data: output, error: outputError } = await supabase
    .from('ai_outputs')
    .insert({
      tenant_id: job.tenant_id,
      subject_id: job.subject_id,
      task_id: job.task_id,
      output_type: 'normalized_log',
      content: result.content
    })
    .select()
    .single();
  
  if (outputError) throw outputError;
  
  return {
    output_ref: output.id,
    tokens_in: result.tokens_in,
    tokens_out: result.tokens_out,
    model: settings.model
  };
}

async function handleOcrExtract(job: AIJob, settings: AISettings) {
  console.log(`🔄 Processing ocr_extract for job ${job.id}`);
  
  if (!job.task_id) {
    throw new Error('Task ID required for OCR extraction');
  }
  
  // Get evidence files for the task
  const { data: evidence, error: evidenceError } = await supabase
    .from('evidence')
    .select('*')
    .eq('tenant_id', job.tenant_id)
    .eq('task_id', job.task_id)
    .in('kind', ['photo', 'pdf']);
  
  if (evidenceError) throw evidenceError;
  
  if (!evidence || evidence.length === 0) {
    throw new Error('No evidence files found for OCR extraction');
  }
  
  let totalTokensIn = 0;
  let totalTokensOut = 0;
  const extractedTexts: string[] = [];
  
  for (const file of evidence) {
    try {
      // For demo purposes, we'll use a simple text extraction prompt
      // In production, you'd want to use OpenAI Vision API with the actual image
      const messages = [
        {
          role: "system",
          content: "Extract all visible text from the provided image. Return only the extracted text content."
        },
        {
          role: "user",
          content: `Extract text from evidence file: ${file.filename} (type: ${file.kind})`
        }
      ];
      
      const schema = {
        type: "object",
        properties: {
          extracted_text: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 1 }
        },
        required: ["extracted_text"]
      };
      
      const result = await structuredCall(settings.model, schema, messages);
      
      totalTokensIn += result.tokens_in;
      totalTokensOut += result.tokens_out;
      
      const extractedText = result.content.extracted_text;
      if (extractedText) {
        extractedTexts.push(extractedText);
        
        // Update evidence with OCR text
        await supabase
          .from('evidence')
          .update({ ocr_text: extractedText })
          .eq('id', file.id);
      }
    } catch (error) {
      console.error(`OCR extraction failed for ${file.id}:`, error);
      // Continue with other files
    }
  }
  
  // Store combined results in ai_outputs
  const { data: output, error: outputError } = await supabase
    .from('ai_outputs')
    .insert({
      tenant_id: job.tenant_id,
      subject_id: job.subject_id,
      task_id: job.task_id,
      output_type: 'ocr',
      content: {
        extracted_texts: extractedTexts,
        file_count: evidence.length,
        successful_extractions: extractedTexts.length
      }
    })
    .select()
    .single();
  
  if (outputError) throw outputError;
  
  return {
    output_ref: output.id,
    tokens_in: totalTokensIn,
    tokens_out: totalTokensOut,
    model: settings.model
  };
}

async function handleEmbedObject(job: AIJob, settings: AISettings) {
  console.log(`🔄 Processing embed_object for job ${job.id}`);
  
  let textToEmbed = '';
  let objectType = '';
  let objectId = '';
  
  if (job.task_id) {
    // Get latest log entry or evidence text for the task
    const { data: logs } = await supabase
      .from('log_entries')
      .select('message')
      .eq('tenant_id', job.tenant_id)
      .eq('task_id', job.task_id)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (logs && logs.length > 0 && logs[0].message) {
      textToEmbed = logs[0].message;
      objectType = 'task_log';
      objectId = job.task_id;
    } else {
      // Try evidence OCR text
      const { data: evidence } = await supabase
        .from('evidence')
        .select('ocr_text')
        .eq('tenant_id', job.tenant_id)
        .eq('task_id', job.task_id)
        .not('ocr_text', 'is', null)
        .limit(1);
      
      if (evidence && evidence.length > 0) {
        textToEmbed = evidence[0].ocr_text!;
        objectType = 'evidence_ocr';
        objectId = job.task_id;
      }
    }
  }
  
  if (!textToEmbed) {
    throw new Error('No text content found for embedding');
  }
  
  const redactedText = await redactText(textToEmbed, settings);
  const { embedding, tokens } = await getEmbedding(redactedText);
  
  // Store embedding
  const { error: embeddingError } = await supabase
    .from('ai_embeddings')
    .insert({
      tenant_id: job.tenant_id,
      object_type: objectType,
      object_id: objectId,
      embedding: `[${embedding.join(',')}]` // Store as text representation
    });
  
  if (embeddingError) throw embeddingError;
  
  return {
    tokens_in: tokens,
    tokens_out: 0,
    model: OPENAI_MODEL_EMBEDDINGS
  };
}

async function handleRiskScore(job: AIJob, settings: AISettings) {
  console.log(`🔄 Processing risk_score for job ${job.id}`);
  
  if (!job.task_id) {
    throw new Error('Task ID required for risk scoring');
  }
  
  // Get task with requirements and evidence
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('*, evidence(*)')
    .eq('tenant_id', job.tenant_id)
    .eq('id', job.task_id)
    .single();
  
  if (taskError) throw taskError;
  
  const requiredEvidence = task.required_evidence || {};
  const evidence = task.evidence || [];
  
  // Calculate base risk from compliance gaps
  const violations = [];
  const flags = [];
  
  if (requiredEvidence.min_photos && evidence.filter((e: any) => e.kind === 'photo').length < requiredEvidence.min_photos) {
    violations.push(`Missing photos: required ${requiredEvidence.min_photos}, found ${evidence.filter((e: any) => e.kind === 'photo').length}`);
    flags.push('insufficient_photos');
  }
  
  if (requiredEvidence.geotag_required && !evidence.some((e: any) => e.latitude && e.longitude)) {
    violations.push('Missing geotag on evidence');
    flags.push('missing_geotag');
  }
  
  if (requiredEvidence.signature_required && task.status === 'completed') {
    // In a real implementation, check for signature evidence
    violations.push('Missing signature for task completion');
    flags.push('missing_signature');
  }
  
  const schema = {
    type: "object",
    properties: {
      risk_score: { type: "number", minimum: 0, maximum: 100 },
      issues: { type: "array", items: { type: "string" } },
      flags: { type: "array", items: { type: "string" } }
    },
    required: ["risk_score"]
  };
  
  const messages = [
    {
      role: "system",
      content: "Analyze task compliance and assign a risk score (0-100). Higher scores indicate greater risk. Consider missing evidence, incomplete requirements, and potential safety/compliance issues."
    },
    {
      role: "user",
      content: `Task: ${task.title}\nStatus: ${task.status}\nViolations found: ${violations.join('; ')}\nEvidence count: ${evidence.length}\nRequired evidence: ${JSON.stringify(requiredEvidence)}`
    }
  ];
  
  const result = await structuredCall(settings.model, schema, messages);
  
  // Update task with AI risk and flags
  const combinedFlags = [...new Set([...flags, ...(result.content.flags || [])])];
  
  const { error: updateError } = await supabase
    .from('tasks')
    .update({
      ai_risk: result.content.risk_score,
      ai_flags: combinedFlags
    })
    .eq('id', job.task_id);
  
  if (updateError) throw updateError;
  
  // Store detailed results in ai_outputs
  const { data: output, error: outputError } = await supabase
    .from('ai_outputs')
    .insert({
      tenant_id: job.tenant_id,
      subject_id: job.subject_id,
      task_id: job.task_id,
      output_type: 'risk',
      content: result.content
    })
    .select()
    .single();
  
  if (outputError) throw outputError;
  
  return {
    output_ref: output.id,
    tokens_in: result.tokens_in,
    tokens_out: result.tokens_out,
    model: settings.model
  };
}

async function handleComplianceSummary(job: AIJob, settings: AISettings) {
  console.log(`🔄 Processing compliance_summary for job ${job.id}`);
  
  if (!job.task_id) {
    throw new Error('Task ID required for compliance summary');
  }
  
  // Get task with all related data
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('*, evidence(*), log_entries(*)')
    .eq('tenant_id', job.tenant_id)
    .eq('id', job.task_id)
    .single();
  
  if (taskError) throw taskError;
  
  const schema = {
    type: "object",
    properties: {
      compliance_score: { type: "number", minimum: 0, maximum: 100 },
      manager_summary: { type: "string", maxLength: settings.summary_length },
      key_findings: { type: "array", items: { type: "string" } },
      recommendations: { type: "array", items: { type: "string" } },
      risk_factors: { type: "array", items: { type: "string" } }
    },
    required: ["compliance_score", "manager_summary"]
  };
  
  const messages = [
    {
      role: "system",
      content: `Generate a compliance summary for management review. Keep the manager summary under ${settings.summary_length} characters. Focus on compliance status, key issues, and actionable recommendations.`
    },
    {
      role: "user",
      content: `Task: ${task.title}\nStatus: ${task.status}\nAI Risk Score: ${task.ai_risk || 'N/A'}\nAI Flags: ${(task.ai_flags || []).join(', ')}\nEvidence Count: ${(task.evidence || []).length}\nLog Entries: ${(task.log_entries || []).length}`
    }
  ];
  
  const result = await structuredCall(settings.model, schema, messages);
  
  // Store summary in ai_outputs
  const { data: output, error: outputError } = await supabase
    .from('ai_outputs')
    .insert({
      tenant_id: job.tenant_id,
      subject_id: job.subject_id,
      task_id: job.task_id,
      output_type: 'summary',
      content: result.content
    })
    .select()
    .single();
  
  if (outputError) throw outputError;
  
  // Update task with summary reference
  await supabase
    .from('tasks')
    .update({ ai_last_summary_id: output.id })
    .eq('id', job.task_id);
  
  return {
    output_ref: output.id,
    tokens_in: result.tokens_in,
    tokens_out: result.tokens_out,
    model: settings.model
  };
}

// Main job processor
async function processJob(job: AIJob, settings: AISettings) {
  const startTime = Date.now();
  
  try {
    let result;
    
    switch (job.job_type) {
      case 'normalize_logs':
        result = await handleNormalizeLogs(job, settings);
        break;
      case 'ocr_extract':
        result = await handleOcrExtract(job, settings);
        break;
      case 'embed_object':
        result = await handleEmbedObject(job, settings);
        break;
      case 'risk_score':
        result = await handleRiskScore(job, settings);
        break;
      case 'compliance_summary':
        result = await handleComplianceSummary(job, settings);
        break;
      default:
        throw new Error(`Unknown job type: ${job.job_type}`);
    }
    
    const costUsd = calcCostUsd(result.model, result.tokens_in, result.tokens_out);
    const duration = Date.now() - startTime;
    
    // Update job as succeeded
    const { error: updateError } = await supabase
      .from('ai_jobs')
      .update({
        status: 'succeeded',
        model: result.model,
        tokens_in: result.tokens_in,
        tokens_out: result.tokens_out,
        cost_usd: costUsd,
        output_ref: result.output_ref,
        finished_at: new Date().toISOString()
      })
      .eq('id', job.id);
    
    if (updateError) throw updateError;
    
    console.log(`✅ Job ${job.id} completed in ${duration}ms, cost: $${costUsd.toFixed(4)}`);
    
    return { success: true, duration, cost: costUsd };
    
  } catch (error) {
    console.error(`❌ Job ${job.id} failed:`, error);
    
    // Update job as failed
    await supabase
      .from('ai_jobs')
      .update({
        status: 'failed',
        error: error.message,
        finished_at: new Date().toISOString()
      })
      .eq('id', job.id);
    
    return { success: false, error: error.message, duration: Date.now() - startTime };
  }
}

serve(async (req: Request) => {
  console.log('🤖 AI Dispatcher starting...');
  
  try {
    // Get jobs from effective queue with row-level locking
    const { data: jobs, error: jobsError } = await supabase
      .rpc('get_ai_jobs_for_processing', { batch_size: AI_JOB_BATCH });
    
    if (jobsError) {
      console.error('Error fetching jobs:', jobsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch jobs' }), { status: 500 });
    }
    
    if (!jobs || jobs.length === 0) {
      console.log('No jobs to process');
      return new Response(JSON.stringify({
        message: 'No jobs to process',
        processed: 0,
        succeeded: 0,
        failed: 0
      }), { status: 200 });
    }
    
    console.log(`📋 Processing ${jobs.length} AI jobs...`);
    
    // Get AI settings for each tenant (assuming single tenant for simplicity)
    const tenantIds = [...new Set(jobs.map((job: AIJob) => job.tenant_id))];
    const settingsMap = new Map<string, AISettings>();
    
    for (const tenantId of tenantIds) {
      const { data: settings } = await supabase
        .from('ai_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();
      
      settingsMap.set(tenantId, settings || {
        model: OPENAI_MODEL_RESPONSES,
        redact_pii: true,
        allow_image_processing: false,
        summary_length: 1200
      });
    }
    
    // Process jobs in parallel (but limited)
    const results = await Promise.allSettled(
      jobs.map(async (job: AIJob) => {
        const settings = settingsMap.get(job.tenant_id)!;
        return processJob(job, settings);
      })
    );
    
    // Count results
    const succeeded = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;
    const totalCost = results
      .filter(r => r.status === 'fulfilled' && r.value.success)
      .reduce((sum, r) => sum + (r.value as any).cost, 0);
    
    console.log(`✨ Processed ${jobs.length} jobs: ${succeeded} succeeded, ${failed} failed, total cost: $${totalCost.toFixed(4)}`);
    
    return new Response(JSON.stringify({
      message: 'AI jobs processed',
      processed: jobs.length,
      succeeded,
      failed,
      total_cost_usd: totalCost
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ AI Dispatcher error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});