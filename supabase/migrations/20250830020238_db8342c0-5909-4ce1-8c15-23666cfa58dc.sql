-- 006_ai_triggers.sql - Triggers to enqueue AI jobs
CREATE OR REPLACE FUNCTION public.enqueue_normalize_log() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.ai_jobs (tenant_id, subject_id, task_id, job_type)
  VALUES (NEW.tenant_id, NEW.subject_id, NEW.task_id, 'normalize_logs');
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enqueue_normalize_log ON public.log_entries;
CREATE TRIGGER trg_enqueue_normalize_log AFTER INSERT ON public.log_entries
FOR EACH ROW EXECUTE FUNCTION public.enqueue_normalize_log();

CREATE OR REPLACE FUNCTION public.enqueue_evidence_ai() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.ai_jobs (tenant_id, subject_id, task_id, job_type)
  VALUES (NEW.tenant_id, (SELECT subject_id FROM public.tasks WHERE id = NEW.task_id), NEW.task_id, 'ocr_extract');
  INSERT INTO public.ai_jobs (tenant_id, subject_id, task_id, job_type)
  VALUES (NEW.tenant_id, (SELECT subject_id FROM public.tasks WHERE id = NEW.task_id), NEW.task_id, 'embed_object');
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enqueue_evidence_ai ON public.evidence;
CREATE TRIGGER trg_enqueue_evidence_ai AFTER INSERT ON public.evidence
FOR EACH ROW EXECUTE FUNCTION public.enqueue_evidence_ai();

CREATE OR REPLACE FUNCTION public.enqueue_task_close_ai() RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'closed' AND (OLD.status IS DISTINCT FROM 'closed') THEN
    INSERT INTO public.ai_jobs (tenant_id, subject_id, task_id, job_type)
    VALUES (NEW.tenant_id, NEW.subject_id, NEW.id, 'risk_score');
    INSERT INTO public.ai_jobs (tenant_id, subject_id, task_id, job_type)
    VALUES (NEW.tenant_id, NEW.subject_id, NEW.id, 'compliance_summary');
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enqueue_task_close_ai ON public.tasks;
CREATE TRIGGER trg_enqueue_task_close_ai AFTER UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.enqueue_task_close_ai();