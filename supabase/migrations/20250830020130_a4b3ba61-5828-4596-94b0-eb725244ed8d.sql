-- 005_ai_settings.sql - AI Settings per tenant
CREATE TABLE IF NOT EXISTS public.ai_settings (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  model text NOT NULL DEFAULT 'gpt-4o',
  daily_cost_cap_usd numeric(12,2) NOT NULL DEFAULT 2.00,
  allow_image_processing boolean NOT NULL DEFAULT false,
  redact_pii boolean NOT NULL DEFAULT true,
  summary_length int NOT NULL DEFAULT 1200,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_set_rw ON public.ai_settings FOR ALL USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());