-- Add webhook settings to tenants table
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- Update existing tenants with default settings
UPDATE public.tenants 
SET settings = COALESCE(settings, '{}') 
WHERE settings IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.tenants.settings IS 'JSON configuration for tenant-specific settings like webhook URLs, notification preferences, etc.';

-- Example of what settings might contain:
-- {
--   "alert_webhook_url": "https://hooks.zapier.com/hooks/catch/...",
--   "base_url": "https://your-app.com",
--   "timezone": "America/New_York",
--   "alert_schedule": "09:00"
-- }