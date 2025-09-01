-- Create view for effective AI job queue based on settings and cost caps
CREATE OR REPLACE VIEW public.v_ai_queue_effective AS
SELECT j.*
FROM public.ai_jobs j
JOIN public.ai_settings s ON s.tenant_id = j.tenant_id
LEFT JOIN (
  SELECT tenant_id, COALESCE(SUM(cost_usd), 0) AS cost_today
  FROM public.ai_jobs
  WHERE created_at::date = now()::date AND status = 'succeeded'
  GROUP BY tenant_id
) c ON c.tenant_id = j.tenant_id
WHERE j.status = 'queued'
  AND s.enabled = true
  AND (c.cost_today IS NULL OR c.cost_today < s.daily_cost_cap_usd)
  AND (
    j.job_type NOT IN ('ocr_extract', 'embed_object')
    OR s.allow_image_processing = true
  );

-- Add ocr_text column to evidence table if not exists
ALTER TABLE public.evidence 
ADD COLUMN IF NOT EXISTS ocr_text TEXT;

-- Create PII redaction function (placeholder - can be enhanced)
CREATE OR REPLACE FUNCTION public.redact_pii(input_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Simple PII redaction - can be enhanced with more sophisticated patterns
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Basic email redaction
  RETURN regexp_replace(
    regexp_replace(
      regexp_replace(
        input_text,
        '\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
        '[EMAIL]',
        'gi'
      ),
      '\b\d{3}-?\d{2}-?\d{4}\b',
      '[SSN]',
      'g'
    ),
    '\b\d{10,16}\b',
    '[PHONE/CARD]',
    'g'
  );
END;
$$;

-- Create function to clean up old idempotency keys (24h TTL)
CREATE OR REPLACE FUNCTION public.cleanup_old_idempotency_keys()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.idempotency_keys
  WHERE created_at < now() - interval '24 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Update ai_jobs trigger to emit AI job events
CREATE OR REPLACE FUNCTION public.emit_ai_job_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status = 'succeeded' THEN
    INSERT INTO public.event_outbox (tenant_id, event_type, payload)
    VALUES (NEW.tenant_id, 'ai.job.succeeded', jsonb_build_object(
      'job_id', NEW.id,
      'job_type', NEW.job_type,
      'subject_id', NEW.subject_id,
      'task_id', NEW.task_id,
      'model', NEW.model,
      'cost_usd', NEW.cost_usd,
      'finished_at', NEW.finished_at
    ));
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for AI job events
DROP TRIGGER IF EXISTS ai_job_events_trigger ON public.ai_jobs;
CREATE TRIGGER ai_job_events_trigger
  AFTER UPDATE ON public.ai_jobs
  FOR EACH ROW EXECUTE FUNCTION public.emit_ai_job_event();