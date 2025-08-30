CREATE OR REPLACE FUNCTION public.dashboard_kpis()
RETURNS TABLE(
  total integer,
  completed integer,
  on_time integer,
  dues_today integer,
  at_risk integer
)
LANGUAGE sql
SECURITY INVOKER
AS $$
  WITH user_tasks AS (
    SELECT * FROM public.tasks
    WHERE tenant_id = public.current_tenant_id()
  ),
  completed_tasks AS (
    SELECT * FROM user_tasks WHERE status = 'completed'
  ),
  on_time_tasks AS (
    SELECT * FROM completed_tasks
    WHERE completed_at IS NOT NULL
      AND due_date IS NOT NULL
      AND completed_at <= due_date
  ),
  dues_today_tasks AS (
    SELECT * FROM user_tasks
    WHERE status <> 'completed'
      AND due_date::date = now()::date
  ),
  at_risk_tasks AS (
    SELECT * FROM user_tasks
    WHERE status <> 'completed'
      AND (due_date < now() OR ai_risk > 70)
  )
  SELECT
    (SELECT count(*) FROM user_tasks) AS total,
    (SELECT count(*) FROM completed_tasks) AS completed,
    (SELECT count(*) FROM on_time_tasks) AS on_time,
    (SELECT count(*) FROM dues_today_tasks) AS dues_today,
    (SELECT count(*) FROM at_risk_tasks) AS at_risk;
$$;
