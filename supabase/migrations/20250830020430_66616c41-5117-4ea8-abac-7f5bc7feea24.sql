-- 010_fix_vector_extension_properly.sql - Fix vector extension properly
-- First drop the dependent table
DROP TABLE IF EXISTS public.ai_embeddings;

-- Move vector extension to extensions schema
DROP EXTENSION IF EXISTS vector;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Recreate the ai_embeddings table with proper vector reference
CREATE TABLE public.ai_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  object_type text NOT NULL CHECK (object_type IN ('log_entry','evidence','task','subject')),
  object_id uuid NOT NULL,
  embedding extensions.vector(1536),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.ai_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_emb_rw ON public.ai_embeddings FOR ALL USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());
CREATE INDEX ai_emb_tenant_obj ON public.ai_embeddings (tenant_id, object_type);