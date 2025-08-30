-- 003_ai_tables.sql - AI Tables with RLS
CREATE TABLE public.ai_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  job_type ai_job_type NOT NULL,
  status ai_job_status NOT NULL DEFAULT 'queued',
  model text, 
  input_ref jsonb, 
  output_ref uuid, 
  error text,
  tokens_in int DEFAULT 0, 
  tokens_out int DEFAULT 0, 
  cost_usd numeric(12,4) DEFAULT 0,
  created_at timestamptz DEFAULT now(), 
  started_at timestamptz, 
  finished_at timestamptz
);

CREATE TABLE public.ai_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  output_type ai_output_type NOT NULL,
  content jsonb NOT NULL, 
  version text NOT NULL DEFAULT 'v1',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.ai_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  object_type text NOT NULL CHECK (object_type IN ('log_entry','evidence','task','subject')),
  object_id uuid NOT NULL,
  embedding vector(1536),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.ai_jobs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_outputs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_jobs_rw    ON public.ai_jobs       FOR ALL USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY ai_outputs_rw ON public.ai_outputs    FOR ALL USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY ai_emb_rw     ON public.ai_embeddings FOR ALL USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());

CREATE INDEX ON public.ai_jobs (tenant_id, status, job_type);
CREATE INDEX ON public.ai_outputs (tenant_id, output_type, created_at DESC);
CREATE INDEX ai_emb_tenant_obj ON public.ai_embeddings (tenant_id, object_type);