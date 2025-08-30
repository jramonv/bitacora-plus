-- Create function to get AI jobs for processing with row-level locking
CREATE OR REPLACE FUNCTION public.get_ai_jobs_for_processing(batch_size INTEGER DEFAULT 10)
RETURNS TABLE(
  id UUID,
  tenant_id UUID,
  subject_id UUID,
  task_id UUID,
  job_type TEXT,
  input_ref JSONB,
  attempts INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Use a transaction to select and update jobs atomically
  RETURN QUERY
  UPDATE ai_jobs
  SET 
    status = 'running',
    started_at = now(),
    attempts = COALESCE(attempts, 0) + 1
  WHERE ai_jobs.id IN (
    SELECT j.id
    FROM v_ai_queue_effective j
    ORDER BY j.created_at
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  )
  RETURNING 
    ai_jobs.id,
    ai_jobs.tenant_id,
    ai_jobs.subject_id,
    ai_jobs.task_id,
    ai_jobs.job_type,
    ai_jobs.input_ref,
    ai_jobs.attempts;
END;
$$;