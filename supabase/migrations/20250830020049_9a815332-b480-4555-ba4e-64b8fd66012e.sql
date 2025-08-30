-- 004_ai_fields.sql - Add AI fields to existing tables
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS ai_flags jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS ai_risk numeric(5,2),
  ADD COLUMN IF NOT EXISTS ai_last_summary_id uuid REFERENCES public.ai_outputs(id);

ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS ai_health numeric(5,2),
  ADD COLUMN IF NOT EXISTS ai_top_issues jsonb DEFAULT '[]';