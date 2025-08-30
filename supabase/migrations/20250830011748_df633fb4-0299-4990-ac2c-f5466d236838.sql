-- Performance indexes
CREATE INDEX ON public.subjects (tenant_id, status);
CREATE INDEX ON public.tasks (tenant_id, subject_id, status);
CREATE INDEX ON public.tasks USING GIN (required_evidence);
CREATE INDEX ON public.log_entries (tenant_id, subject_id, created_at DESC);
CREATE INDEX ON public.evidence (tenant_id, task_id, created_at DESC);
CREATE INDEX ON public.checklist_runs USING GIN (result);

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
CREATE OR REPLACE FUNCTION public.current_tenant_id() RETURNS uuid LANGUAGE sql STABLE AS $$
SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid();
$$;

-- Tenants: owner can only see their own tenant
CREATE POLICY tenants_select ON public.tenants FOR SELECT USING (
  id = public.current_tenant_id()
);

-- Profiles: users can only see their own profile
CREATE POLICY profiles_me ON public.profiles FOR SELECT USING (
  user_id = auth.uid()
);

-- Subjects policies
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
CREATE POLICY tasks_sel ON public.tasks FOR SELECT USING (tenant_id = public.current_tenant_id());
CREATE POLICY tasks_ins ON public.tasks FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY tasks_upd ON public.tasks FOR UPDATE USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());

-- Log entries policies
CREATE POLICY logs_sel ON public.log_entries FOR SELECT USING (tenant_id = public.current_tenant_id());
CREATE POLICY logs_ins ON public.log_entries FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());

-- Evidence policies
CREATE POLICY ev_sel ON public.evidence FOR SELECT USING (tenant_id = public.current_tenant_id());
CREATE POLICY ev_ins ON public.evidence FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());

-- Checklist templates policies
CREATE POLICY ct_sel ON public.checklist_templates FOR SELECT USING (tenant_id = public.current_tenant_id());
CREATE POLICY ct_ins ON public.checklist_templates FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY ct_upd ON public.checklist_templates FOR UPDATE USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());

-- Checklist runs policies
CREATE POLICY cr_sel ON public.checklist_runs FOR SELECT USING (tenant_id = public.current_tenant_id());
CREATE POLICY cr_ins ON public.checklist_runs FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY cr_upd ON public.checklist_runs FOR UPDATE USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());