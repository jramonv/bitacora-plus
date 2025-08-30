import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, AlertTriangle, CheckCircle, Clock, Plus } from "lucide-react";
import KpiCard from "@/components/KpiCard";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { TaskStatus } from "@/types/database";

const Dashboard = () => {
  const subjectTypes = [
    { key: 'project', label: 'Proyectos' },
    { key: 'research', label: 'Investigación' },
    { key: 'maintenance', label: 'Mantenimiento' },
    { key: 'health', label: 'Salud' },
    { key: 'education', label: 'Educación' },
    { key: 'personal', label: 'Personal' },
  ];
  // Fetch KPI data
  const { data: kpiData, isLoading: kpiLoading } = useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: async () => {
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          status,
          due_date,
          completed_at,
          ai_risk,
          subjects (
            id,
            title,
            status,
            subject_type
          )
        `);

      if (error) throw error;

      const today = new Date();

      const overallCounts = {
        total: 0,
        completed: 0,
        onTime: 0,
        duesToday: 0,
        atRisk: 0,
        riskyTasks: [] as any[],
      };

      const typeCounts: Record<string, typeof overallCounts> = {};

      tasks?.forEach((t) => {
        const type = t.subjects?.subject_type || 'other';
        if (!typeCounts[type]) {
          typeCounts[type] = {
            total: 0,
            completed: 0,
            onTime: 0,
            duesToday: 0,
            atRisk: 0,
            riskyTasks: [],
          };
        }

        const buckets = [overallCounts, typeCounts[type]];
        buckets.forEach((b) => {
          b.total++;
          if (t.status === 'completed') {
            b.completed++;
            if (
              t.completed_at &&
              t.due_date &&
              new Date(t.completed_at) <= new Date(t.due_date)
            ) {
              b.onTime++;
            }
          } else {
            if (
              t.due_date &&
              format(new Date(t.due_date), 'yyyy-MM-dd') ===
                format(today, 'yyyy-MM-dd')
            ) {
              b.duesToday++;
            }
            if (
              (t.due_date && new Date(t.due_date) < today) ||
              (t.ai_risk && t.ai_risk > 70)
            ) {
              b.atRisk++;
              b.riskyTasks.push(t);
            }
          }
        });
      });

      const overall = {
        onTimePercentage:
          overallCounts.completed > 0
            ? Math.round((overallCounts.onTime / overallCounts.completed) * 100)
            : 0,
        compliancePercentage:
          overallCounts.total > 0
            ? Math.round((overallCounts.completed / overallCounts.total) * 100)
            : 0,
        duesToday: overallCounts.duesToday,
        atRisk: overallCounts.atRisk,
        riskyTasks: overallCounts.riskyTasks.slice(0, 10),
      };

      const byType: Record<string, typeof overall> = {};
      Object.entries(typeCounts).forEach(([type, counts]) => {
        byType[type] = {
          onTimePercentage:
            counts.completed > 0
              ? Math.round((counts.onTime / counts.completed) * 100)
              : 0,
          compliancePercentage:
            counts.total > 0
              ? Math.round((counts.completed / counts.total) * 100)
              : 0,
          duesToday: counts.duesToday,
          atRisk: counts.atRisk,
          riskyTasks: counts.riskyTasks.slice(0, 10),
        };
      });

      return { overall, byType };
    },
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

  const getRiskLevel = (task: any) => {
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
                {kpiLoading ? '-' : `${kpiData?.overall.onTimePercentage || 0}%`}
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
                {kpiLoading ? '-' : `${kpiData?.overall.compliancePercentage || 0}%`}
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
                {kpiLoading ? '-' : kpiData?.overall.duesToday || 0}
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
                {kpiLoading ? '-' : kpiData?.overall.atRisk || 0}
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
                  {kpiData?.overall?.riskyTasks?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No hay tasks en riesgo
                      </TableCell>
                    </TableRow>
                  ) : (
                    kpiData?.overall?.riskyTasks?.map((task) => {
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

        {subjectTypes.map(({ key, label }) => (
          <div key={key} className="space-y-4">
            <h2 className="text-xl font-bold">{label}</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                title="On-time %"
                value={
                  kpiLoading
                    ? '-'
                    : `${kpiData?.byType[key]?.onTimePercentage || 0}%`
                }
                description="Tareas completadas a tiempo"
                icon={<CheckCircle className="h-4 w-4 text-green-600" />}
              />
              <KpiCard
                title="Compliance-ok %"
                value={
                  kpiLoading
                    ? '-'
                    : `${kpiData?.byType[key]?.compliancePercentage || 0}%`
                }
                description="Cumplimiento general"
                icon={<CheckCircle className="h-4 w-4 text-blue-600" />}
              />
              <KpiCard
                title="SLAs Hoy"
                value={
                  kpiLoading ? '-' : kpiData?.byType[key]?.duesToday || 0
                }
                description="Vencen hoy"
                icon={<Calendar className="h-4 w-4 text-yellow-600" />}
              />
              <KpiCard
                title="En Riesgo"
                value={
                  kpiLoading ? '-' : kpiData?.byType[key]?.atRisk || 0
                }
                description="Tareas críticas"
                icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
              />
            </div>
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
                      {kpiData?.byType[key]?.riskyTasks?.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="text-center py-8 text-muted-foreground"
                          >
                            No hay tasks en riesgo
                          </TableCell>
                        </TableRow>
                      ) : (
                        kpiData?.byType[key]?.riskyTasks?.map((task) => {
                          const risk = getRiskLevel(task);
                          return (
                            <TableRow key={task.id}>
                              <TableCell className="font-medium">
                                <Link
                                  to={`/tasks/${task.id}`}
                                  className="hover:underline"
                                >
                                  {task.title}
                                </Link>
                              </TableCell>
                              <TableCell>
                                <Link
                                  to={`/subjects/${task.subjects.id}`}
                                  className="hover:underline text-primary"
                                >
                                  {task.subjects.title}
                                </Link>
                              </TableCell>
                              <TableCell>{getStatusBadge(task.status)}</TableCell>
                              <TableCell>
                                {task.due_date
                                  ? format(
                                      new Date(task.due_date),
                                      'dd/MM/yyyy',
                                      { locale: es }
                                    )
                                  : 'Sin fecha'}
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
        ))}
      </div>
    </Layout>
  );
};

export default Dashboard;

