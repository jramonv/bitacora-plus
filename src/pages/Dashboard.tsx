import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, AlertTriangle, CheckCircle, Clock, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { TaskStatus, castAIFlags } from "@/types/database";
import { EmptyState } from "@/components/EmptyState";

const Dashboard = () => {
  // Fetch KPI data
  const { data: kpiData, isLoading: kpiLoading } = useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: async () => {
      const now = new Date().toISOString();

      const [{ data: kpis, error: kpiError }, { data: riskyTasks, error: riskyError }] =
        await Promise.all([
          supabase.rpc('dashboard_kpis'),
          supabase
            .from('tasks')
            .select(`
              id,
              title,
              status,
              due_date,
              ai_risk,
              subjects (
                id,
                title,
                status
              )
            `)
            .neq('status', 'completed')
            .or(`due_date.lt.${now},ai_risk.gt.70`)
            .order('due_date', { ascending: true })
            .limit(10)
        ]);

      if (kpiError) throw kpiError;
      if (riskyError) throw riskyError;

      const metrics = kpis?.[0] || {
        total: 0,
        completed: 0,
        on_time: 0,
        dues_today: 0,
        at_risk: 0
      };

      return {
        onTimePercentage:
          metrics.completed > 0 ? Math.round((metrics.on_time / metrics.completed) * 100) : 0,
        compliancePercentage:
          metrics.total > 0 ? Math.round((metrics.completed / metrics.total) * 100) : 0,
        duesToday: metrics.dues_today,
        atRisk: metrics.at_risk,
        riskyTasks: riskyTasks || []
      };
    }
  });

  const getStatusBadge = (status: TaskStatus | string) => {
    const variants = {
      'pending': { variant: 'secondary' as const, label: 'Pendiente' },
      'in_progress': { variant: 'default' as const, label: 'En Progreso' },
      'completed': { variant: 'default' as const, label: 'Completada' },
      'blocked': { variant: 'destructive' as const, label: 'Bloqueada' }
    };
    
    const config = variants[status as keyof typeof variants] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getRiskLevel = (task: { due_date?: string | null; ai_risk?: number | null }) => {
    const isOverdue = task.due_date && new Date(task.due_date) < new Date();
    const hasHighRisk = task.ai_risk && task.ai_risk > 70;
    
    if (isOverdue) return { level: 'Vencida', color: 'text-destructive' };
    if (hasHighRisk) return { level: 'Alto Riesgo', color: 'text-orange-500' };
    return { level: 'En Riesgo', color: 'text-yellow-600' };
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Resumen operativo y KPIs de cumplimiento</p>
          </div>
          <Link to="/subjects">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva OT
            </Button>
          </Link>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">On-time %</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpiLoading ? '-' : `${kpiData?.onTimePercentage || 0}%`}
              </div>
              <p className="text-xs text-muted-foreground">
                Tareas completadas a tiempo
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Compliance-ok %</CardTitle>
              <CheckCircle className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpiLoading ? '-' : `${kpiData?.compliancePercentage || 0}%`}
              </div>
              <p className="text-xs text-muted-foreground">
                Cumplimiento general
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">SLAs Hoy</CardTitle>
              <Calendar className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpiLoading ? '-' : kpiData?.duesToday || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Vencen hoy
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En Riesgo</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpiLoading ? '-' : kpiData?.atRisk || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Tareas críticas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tasks en Riesgo Table */}
        <Card>
          <CardHeader>
            <CardTitle>Tasks en Riesgo</CardTitle>
          </CardHeader>
          <CardContent>
            {kpiLoading ? (
              <div className="flex items-center justify-center py-8">
                <Clock className="mr-2 h-4 w-4 animate-spin" />
                Cargando...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>OT</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Nivel de Riesgo</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kpiData?.riskyTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <EmptyState
                          icon={CheckCircle}
                          message="No hay tasks en riesgo"
                          action={
                            <Link to="/subjects">
                              <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Nueva OT
                              </Button>
                            </Link>
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    kpiData?.riskyTasks.map((task) => {
                      const risk = getRiskLevel(task);
                      return (
                        <TableRow key={task.id}>
                          <TableCell className="font-medium">
                            <Link to={`/tasks/${task.id}`} className="hover:underline">
                              {task.title}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Link to={`/subjects/${task.subjects.id}`} className="hover:underline text-primary">
                              {task.subjects.title}
                            </Link>
                          </TableCell>
                          <TableCell>{getStatusBadge(task.status)}</TableCell>
                          <TableCell>
                            {task.due_date ? format(new Date(task.due_date), 'dd/MM/yyyy', { locale: es }) : 'Sin fecha'}
                          </TableCell>
                          <TableCell>
                            <span className={risk.color}>{risk.level}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Link to={`/tasks/${task.id}`}>
                              <Button variant="outline" size="sm">
                                Ver Detalle
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;