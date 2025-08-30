import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TaskStatus } from "@/types/database";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Clock } from "lucide-react";

const OperadorDashboard = () => {
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['operador-tasks'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('tasks')
        .select(`id, title, status, due_date, subjects ( id, title )`)
        .eq('due_date', today)
        .neq('status', 'completed');
      if (error) throw error;
      return data;
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

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Tareas del Día</h1>
        <Card>
          <CardHeader>
            <CardTitle>Mis Tareas</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Clock className="mr-2 h-4 w-4 animate-spin" />
                Cargando...
              </div>
            ) : tasks && tasks.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>OT</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => (
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
                      <TableCell>
                        {task.due_date ? format(new Date(task.due_date), 'dd/MM/yyyy', { locale: es }) : 'Sin fecha'}
                      </TableCell>
                      <TableCell>{getStatusBadge(task.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No tienes tareas para hoy
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default OperadorDashboard;
