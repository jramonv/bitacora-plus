-- Webhook subscriptions table
CREATE TABLE public.webhook_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.webhook_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "webhook_subs_rw" ON public.webhook_subscriptions
FOR ALL USING (tenant_id = current_tenant_id())
WITH CHECK (tenant_id = current_tenant_id());

-- Event outbox table
CREATE TABLE public.event_outbox (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  attempts INTEGER DEFAULT 0,
  next_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_outbox ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "event_outbox_rw" ON public.event_outbox
FOR ALL USING (tenant_id = current_tenant_id())
WITH CHECK (tenant_id = current_tenant_id());

-- Index for efficient processing
CREATE INDEX idx_event_outbox_processing 
ON public.event_outbox (status, next_attempt_at) 
WHERE status = 'pending';

-- Automations table
CREATE TABLE public.automations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('schedule', 'event')),
  trigger_spec JSONB NOT NULL DEFAULT '{}',
  action_type TEXT NOT NULL CHECK (action_type IN ('email', 'webhook', 'create_task', 'close_task')),
  action_spec JSONB NOT NULL DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "automations_rw" ON public.automations
FOR ALL USING (tenant_id = current_tenant_id())
WITH CHECK (tenant_id = current_tenant_id());

-- API audit logs table
CREATE TABLE public.api_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  path TEXT NOT NULL,
  method TEXT NOT NULL,
  user_id UUID,
  api_key_id UUID,
  status INTEGER NOT NULL,
  latency_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "api_audit_rw" ON public.api_audit_logs
FOR ALL USING (tenant_id = current_tenant_id())
WITH CHECK (tenant_id = current_tenant_id());

-- Index for efficient querying
CREATE INDEX idx_api_audit_logs_tenant_created 
ON public.api_audit_logs (tenant_id, created_at DESC);

-- Webhook delivery logs table
CREATE TABLE public.webhook_delivery_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID NOT NULL,
  status TEXT NOT NULL,
  http_code INTEGER,
  latency_ms INTEGER,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.webhook_delivery_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies (need to join with subscriptions for tenant check)
CREATE POLICY "webhook_delivery_logs_select" ON public.webhook_delivery_logs
FOR SELECT USING (
  subscription_id IN (
    SELECT id FROM public.webhook_subscriptions 
    WHERE tenant_id = current_tenant_id()
  )
);

-- Functions for API key management
CREATE OR REPLACE FUNCTION public.issue_api_key(p_tenant_id UUID, p_name TEXT)
RETURNS TABLE(api_key TEXT, key_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key_id UUID;
  v_plain_key TEXT;
  v_key_hash TEXT;
  v_active_count INTEGER;
BEGIN
  -- Check if tenant has less than 5 active keys
  SELECT COUNT(*) INTO v_active_count
  FROM public.api_keys
  WHERE tenant_id = p_tenant_id AND active = true;
  
  IF v_active_count >= 5 THEN
    RAISE EXCEPTION 'Maximum of 5 active API keys per tenant';
  END IF;
  
  -- Generate random key (32 bytes = 64 hex chars)
  v_plain_key := 'bta_' || encode(gen_random_bytes(32), 'hex');
  
  -- Hash the key for storage
  v_key_hash := encode(digest(v_plain_key, 'sha256'), 'hex');
  
  -- Insert the key
  INSERT INTO public.api_keys (tenant_id, name, key_hash)
  VALUES (p_tenant_id, p_name, v_key_hash)
  RETURNING id INTO v_key_id;
  
  -- Return the plain key (only time it's visible)
  RETURN QUERY SELECT v_plain_key, v_key_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_api_key(p_key_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.api_keys
  SET active = false
  WHERE id = p_key_id AND tenant_id = current_tenant_id();
  
  RETURN FOUND;
END;
$$;

-- Function to verify API key and get tenant
CREATE OR REPLACE FUNCTION public.verify_api_key(p_api_key TEXT)
RETURNS TABLE(tenant_id UUID, key_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key_hash TEXT;
BEGIN
  -- Hash the provided key
  v_key_hash := encode(digest(p_api_key, 'sha256'), 'hex');
  
  -- Find matching active key and update last_used_at
  UPDATE public.api_keys
  SET last_used_at = now()
  WHERE key_hash = v_key_hash AND active = true
  RETURNING api_keys.tenant_id, api_keys.id
  INTO tenant_id, key_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  RETURN NEXT;
END;
$$;

-- Triggers for event outbox
CREATE OR REPLACE FUNCTION public.emit_subject_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.event_outbox (tenant_id, event_type, payload)
    VALUES (NEW.tenant_id, 'subject.created', jsonb_build_object(
      'id', NEW.id,
      'title', NEW.title,
      'status', NEW.status,
      'created_at', NEW.created_at
    ));
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.emit_task_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.event_outbox (tenant_id, event_type, payload)
    VALUES (NEW.tenant_id, 'task.created', jsonb_build_object(
      'id', NEW.id,
      'subject_id', NEW.subject_id,
      'title', NEW.title,
      'status', NEW.status,
      'created_at', NEW.created_at
    ));
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status = 'completed' THEN
    INSERT INTO public.event_outbox (tenant_id, event_type, payload)
    VALUES (NEW.tenant_id, 'task.closed', jsonb_build_object(
      'id', NEW.id,
      'subject_id', NEW.subject_id,
      'title', NEW.title,
      'status', NEW.status,
      'completed_at', NEW.completed_at,
      'ai_risk', NEW.ai_risk,
      'ai_flags', NEW.ai_flags
    ));
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.emit_evidence_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.event_outbox (tenant_id, event_type, payload)
    VALUES (NEW.tenant_id, 'evidence.added', jsonb_build_object(
      'id', NEW.id,
      'task_id', NEW.task_id,
      'kind', NEW.kind,
      'filename', NEW.filename,
      'created_at', NEW.created_at
    ));
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER subject_events_trigger
  AFTER INSERT ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION public.emit_subject_event();

CREATE TRIGGER task_events_trigger
  AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.emit_task_event();

CREATE TRIGGER evidence_events_trigger
  AFTER INSERT ON public.evidence
  FOR EACH ROW EXECUTE FUNCTION public.emit_evidence_event();