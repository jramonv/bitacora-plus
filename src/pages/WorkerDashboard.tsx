import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { TaskStatus } from "@/types/database";

interface TaskWithSubject {
  id: string;
  title: string;
  status: TaskStatus;
  due_date: string | null;
  subjects: {
    id: string;
    title: string;
  } | null;
}

const WorkerDashboard = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user.id || null);
      setLoadingUser(false);
    };
    getUser();
  }, []);

  const { data: tasks, isLoading } = useQuery<TaskWithSubject[]>({
    queryKey: ['worker-tasks', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          status,
          due_date,
          subjects (
            id,
            title
          )
        `)
        .eq('assigned_to', userId)
        .order('due_date', { ascending: true });
      if (error) throw error;
      return data as TaskWithSubject[];
    },
    enabled: !!userId
  });

  const getStatusBadge = (status: TaskStatus | string) => {
    const variants = {
      pending: { variant: 'secondary' as const, label: 'Pendiente' },
      in_progress: { variant: 'default' as const, label: 'En Progreso' },
      completed: { variant: 'default' as const, label: 'Completada' },
      blocked: { variant: 'destructive' as const, label: 'Bloqueada' }
    };
    const config = variants[status as keyof typeof variants] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loadingUser) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-8">
          <Clock className="mr-2 h-4 w-4 animate-spin" />
          Cargando...
        </div>
      </Layout>
    );
  }

  if (!userId) {
    return (
      <Layout>
        <div className="text-center py-8 text-muted-foreground">
          Debe iniciar sesión para ver sus tareas
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Mis Tareas</h1>
          <p className="text-muted-foreground">Tareas asignadas a mi usuario</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Listado de Tareas</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No hay tasks asignadas
                      </TableCell>
                    </TableRow>
                  ) : (
                    tasks?.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">
                          <Link to={`/tasks/${task.id}`} className="hover:underline">
                            {task.title}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {task.subjects ? (
                            <Link to={`/subjects/${task.subjects.id}`} className="hover:underline text-primary">
                              {task.subjects.title}
                            </Link>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(task.status)}</TableCell>
                        <TableCell>
                          {task.due_date
                            ? format(new Date(task.due_date), 'dd/MM/yyyy', { locale: es })
                            : 'Sin fecha'}
                        </TableCell>
                      </TableRow>
                    ))
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

export default WorkerDashboard;
