-- Create cron job to run AI dispatcher every 5 minutes
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule AI dispatcher to run every 5 minutes
SELECT cron.schedule(
  'ai-dispatcher-job',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://eeprxrlmcbtywuuwnuex.supabase.co/functions/v1/ai-dispatcher',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || 
               (SELECT value FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY') || '"}',
    body := '{"trigger": "cron"}'
  );
  $$
);

-- Also create a manual trigger function for testing
CREATE OR REPLACE FUNCTION public.trigger_ai_dispatcher()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  -- This would typically call the edge function
  -- For now, return a simple response
  SELECT jsonb_build_object(
    'message', 'AI dispatcher triggered manually',
    'timestamp', now()
  ) INTO result;
  
  RETURN result;
END;
$$;