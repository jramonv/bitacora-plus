-- 008_fix_security_functions.sql - Fix function security issues
CREATE OR REPLACE FUNCTION public.enqueue_normalize_log() 
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.ai_jobs (tenant_id, subject_id, task_id, job_type)
  VALUES (NEW.tenant_id, NEW.subject_id, NEW.task_id, 'normalize_logs');
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.enqueue_evidence_ai() 
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.ai_jobs (tenant_id, subject_id, task_id, job_type)
  VALUES (NEW.tenant_id, (SELECT subject_id FROM public.tasks WHERE id = NEW.task_id), NEW.task_id, 'ocr_extract');
  INSERT INTO public.ai_jobs (tenant_id, subject_id, task_id, job_type)
  VALUES (NEW.tenant_id, (SELECT subject_id FROM public.tasks WHERE id = NEW.task_id), NEW.task_id, 'embed_object');
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.enqueue_task_close_ai() 
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.status = 'closed' AND (OLD.status IS DISTINCT FROM 'closed') THEN
    INSERT INTO public.ai_jobs (tenant_id, subject_id, task_id, job_type)
    VALUES (NEW.tenant_id, NEW.subject_id, NEW.id, 'risk_score');
    INSERT INTO public.ai_jobs (tenant_id, subject_id, task_id, job_type)
    VALUES (NEW.tenant_id, NEW.subject_id, NEW.id, 'compliance_summary');
  END IF;
  RETURN NEW;
END $$;