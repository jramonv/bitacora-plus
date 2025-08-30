CREATE TABLE public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

CREATE INDEX ON public.task_comments (task_id, created_at);

-- Allow users to read comments for tasks in their tenant
CREATE POLICY task_comments_select ON public.task_comments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_comments.task_id
      AND t.tenant_id = public.current_tenant_id()
  )
);

-- Allow users to insert comments for tasks in their tenant
CREATE POLICY task_comments_insert ON public.task_comments
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_comments.task_id
      AND t.tenant_id = public.current_tenant_id()
  ) AND user_id = auth.uid()
);
