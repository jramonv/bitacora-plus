-- Fix security definer view by removing SECURITY DEFINER and using proper RLS
DROP VIEW IF EXISTS public.v_ai_queue_effective;

-- Create view without SECURITY DEFINER (RLS will handle permissions)
CREATE VIEW public.v_ai_queue_effective AS
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