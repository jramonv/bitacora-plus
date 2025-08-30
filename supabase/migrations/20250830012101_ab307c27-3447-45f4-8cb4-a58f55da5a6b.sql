-- Fix function security issue by setting search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Enable RLS on all tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_runs ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's tenant
CREATE OR REPLACE FUNCTION public.current_tenant_id() 
RETURNS uuid 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid();
$$;

-- Tenants: owner can only see their own tenant
DROP POLICY IF EXISTS tenants_select ON public.tenants;
CREATE POLICY tenants_select ON public.tenants FOR SELECT USING (
  id = public.current_tenant_id()
);

-- Profiles: users can only see their own profile
DROP POLICY IF EXISTS profiles_me ON public.profiles;
CREATE POLICY profiles_me ON public.profiles FOR SELECT USING (
  user_id = auth.uid()
);

-- Subjects policies
DROP POLICY IF EXISTS subjects_rw ON public.subjects;
DROP POLICY IF EXISTS subjects_ins ON public.subjects;
DROP POLICY IF EXISTS subjects_upd ON public.subjects;

CREATE POLICY subjects_rw ON public.subjects FOR SELECT USING (
  tenant_id = public.current_tenant_id()
);
CREATE POLICY subjects_ins ON public.subjects FOR INSERT WITH CHECK (
  tenant_id = public.current_tenant_id()
);
CREATE POLICY subjects_upd ON public.subjects FOR UPDATE USING (
  tenant_id = public.current_tenant_id()
) WITH CHECK (
  tenant_id = public.current_tenant_id()
);

-- Tasks policies
DROP POLICY IF EXISTS tasks_sel ON public.tasks;
DROP POLICY IF EXISTS tasks_ins ON public.tasks;
DROP POLICY IF EXISTS tasks_upd ON public.tasks;

CREATE POLICY tasks_sel ON public.tasks FOR SELECT USING (tenant_id = public.current_tenant_id());
CREATE POLICY tasks_ins ON public.tasks FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY tasks_upd ON public.tasks FOR UPDATE USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());

-- Log entries policies
DROP POLICY IF EXISTS logs_sel ON public.log_entries;
DROP POLICY IF EXISTS logs_ins ON public.log_entries;

CREATE POLICY logs_sel ON public.log_entries FOR SELECT USING (tenant_id = public.current_tenant_id());
CREATE POLICY logs_ins ON public.log_entries FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());

-- Evidence policies
DROP POLICY IF EXISTS ev_sel ON public.evidence;
DROP POLICY IF EXISTS ev_ins ON public.evidence;

CREATE POLICY ev_sel ON public.evidence FOR SELECT USING (tenant_id = public.current_tenant_id());
CREATE POLICY ev_ins ON public.evidence FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());

-- Checklist templates policies
DROP POLICY IF EXISTS ct_sel ON public.checklist_templates;
DROP POLICY IF EXISTS ct_ins ON public.checklist_templates;
DROP POLICY IF EXISTS ct_upd ON public.checklist_templates;

CREATE POLICY ct_sel ON public.checklist_templates FOR SELECT USING (tenant_id = public.current_tenant_id());
CREATE POLICY ct_ins ON public.checklist_templates FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY ct_upd ON public.checklist_templates FOR UPDATE USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());

-- Checklist runs policies
DROP POLICY IF EXISTS cr_sel ON public.checklist_runs;
DROP POLICY IF EXISTS cr_ins ON public.checklist_runs;
DROP POLICY IF EXISTS cr_upd ON public.checklist_runs;

CREATE POLICY cr_sel ON public.checklist_runs FOR SELECT USING (tenant_id = public.current_tenant_id());
CREATE POLICY cr_ins ON public.checklist_runs FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY cr_upd ON public.checklist_runs FOR UPDATE USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());