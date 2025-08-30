import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Clock, FileText, Image, BarChart3, Download, Plus, FileDown, MapPin } from "lucide-react";
import { MapView } from "@/components/MapView";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { TaskStatus, SubjectStatus, castAIFlags } from "@/types/database";
import { useToast } from "@/hooks/use-toast";

const SubjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  // Fetch subject details
  const { data: subject, isLoading } = useQuery({
    queryKey: ['subject', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select(`
          *,
          tasks (
            id,
            title,
            status,
            due_date,
            completed_at,
            ai_risk,
            ai_flags
          ),
          log_entries (
            id,
            event_type,
            message,
            created_at,
            created_by,
            metadata
          )
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  // Fetch evidence for this subject
  const { data: evidence } = useQuery({
    queryKey: ['subject-evidence', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evidence')
        .select(`
          id,
          filename,
          file_path,
          kind,
          latitude,
          longitude,
          created_by,
          created_at,
          metadata,
          tasks (
            id,
            title
          )
        `)
        .in('task_id', subject?.tasks?.map(t => t.id) || []);
      
      if (error) throw error;
      return data;
    },
    enabled: !!subject?.tasks
  });

  const getStatusBadge = (status: TaskStatus | SubjectStatus | string) => {
    const variants = {
      'draft': { variant: 'outline' as const, label: 'Borrador' },
      'active': { variant: 'default' as const, label: 'Activo' },
      'closed': { variant: 'secondary' as const, label: 'Cerrado' },
      'cancelled': { variant: 'destructive' as const, label: 'Cancelado' },
      'pending': { variant: 'secondary' as const, label: 'Pendiente' },
      'in_progress': { variant: 'default' as const, label: 'En Progreso' },
      'completed': { variant: 'default' as const, label: 'Completada' },
      'blocked': { variant: 'destructive' as const, label: 'Bloqueada' }
    };
    
    const config = variants[status as keyof typeof variants] || variants.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getComplianceChips = (task: any) => {
    const flags = castAIFlags(task.ai_flags);
    const chips = [];
    
    if (flags.includes('missing_geotag')) chips.push({ label: 'Sin Geotag', variant: 'destructive' as const });
    if (flags.includes('insufficient_photos')) chips.push({ label: 'Fotos Insuf.', variant: 'destructive' as const });
    if (flags.includes('missing_signature')) chips.push({ label: 'Sin Firma', variant: 'destructive' as const });
    if (flags.includes('checklist_incomplete')) chips.push({ label: 'Checklist Inc.', variant: 'destructive' as const });
    if (chips.length === 0) chips.push({ label: 'Compliant', variant: 'default' as const });
    
    return chips;
  };

  const exportToPDF = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Error",
          description: "Debe iniciar sesión para exportar PDF",
          variant: "destructive",
        });
        return;
      }

      // Get all task IDs from the subject
      const taskIds = subject?.tasks?.map(t => t.id) || [];
      if (taskIds.length === 0) {
        toast({
          title: "Sin tareas",
          description: "No hay tareas para exportar",
          variant: "destructive",
        });
        return;
      }

      // For now, export the first task. Later we can implement multi-task export
      const firstTaskId = taskIds[0];
      
      const response = await fetch(`https://eeprxrlmcbtywuuwnuex.supabase.co/functions/v1/export-task-pdf/${firstTaskId}.pdf`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al generar PDF');
      }

      // Download the PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `subject-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "PDF exportado",
        description: "El archivo se descargó correctamente",
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: "Error",
        description: "No se pudo exportar el PDF",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-8">
          <Clock className="mr-2 h-4 w-4 animate-spin" />
          Cargando detalles de la OT...
        </div>
      </Layout>
    );
  }

  if (!subject) {
    return (
      <Layout>
        <div className="text-center py-8">
          <p className="text-muted-foreground">OT no encontrada</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-4 mb-2">
              <h1 className="text-3xl font-bold">{subject.title}</h1>
              {getStatusBadge(subject.status)}
            </div>
            {subject.description && (
              <p className="text-muted-foreground">{subject.description}</p>
            )}
            <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
              {subject.due_date && (
                <div className="flex items-center">
                  <Calendar className="mr-1 h-4 w-4" />
                  Vence: {format(new Date(subject.due_date), 'dd/MM/yyyy', { locale: es })}
                </div>
              )}
              {subject.ai_health && (
                <div className="flex items-center">
                  <BarChart3 className="mr-1 h-4 w-4" />
                  Salud IA: {subject.ai_health}%
                </div>
              )}
            </div>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={exportToPDF}>
              <Download className="mr-2 h-4 w-4" />
              Exportar PDF
            </Button>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Task
            </Button>
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="timeline" className="space-y-4">
          <TabsList>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="evidence">Evidencias</TabsTrigger>
            <TabsTrigger value="map">Mapa</TabsTrigger>
            <TabsTrigger value="kpis">KPIs</TabsTrigger>
          </TabsList>

          {/* Timeline Tab */}
          <TabsContent value="timeline">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="mr-2 h-4 w-4" />
                  Timeline de Eventos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {!subject.log_entries || subject.log_entries.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">
                      No hay eventos registrados
                    </p>
                  ) : (
                    subject.log_entries
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .map((log) => (
                        <div key={log.id} className="flex items-start space-x-4 border-l-2 border-muted pl-4 pb-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">{log.event_type}</p>
                              <time className="text-xs text-muted-foreground">
                                {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                              </time>
                            </div>
                            {log.message && (
                              <p className="text-sm text-muted-foreground mt-1">{log.message}</p>
                            )}
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="mr-2 h-4 w-4" />
                  Lista de Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Vencimiento</TableHead>
                      <TableHead>Cumplimiento</TableHead>
                      <TableHead>Riesgo IA</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!subject.tasks || subject.tasks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No hay tasks asignadas
                        </TableCell>
                      </TableRow>
                    ) : (
                      subject.tasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell>
                            <Link to={`/tasks/${task.id}`} className="font-medium hover:underline">
                              {task.title}
                            </Link>
                          </TableCell>
                          <TableCell>{getStatusBadge(task.status)}</TableCell>
                          <TableCell>
                            {task.due_date ? format(new Date(task.due_date), 'dd/MM/yyyy', { locale: es }) : 'Sin fecha'}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {getComplianceChips(task).map((chip, idx) => (
                                <Badge key={idx} variant={chip.variant} className="text-xs">
                                  {chip.label}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            {task.ai_risk ? (
                              <div className="flex items-center">
                                <div className={`w-2 h-2 rounded-full mr-2 ${
                                  task.ai_risk > 70 ? 'bg-red-500' : 
                                  task.ai_risk > 40 ? 'bg-yellow-500' : 'bg-green-500'
                                }`} />
                                {task.ai_risk}%
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Link to={`/tasks/${task.id}`}>
                              <Button variant="outline" size="sm">
                                Ver Detalle
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Evidence Tab */}
          <TabsContent value="evidence">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Image className="mr-2 h-4 w-4" />
                  Galería de Evidencias
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!evidence || evidence.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    No hay evidencias registradas
                  </p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {evidence.map((item) => (
                      <div key={item.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="aspect-square bg-muted rounded-md mb-2 flex items-center justify-center">
                          {item.kind === 'photo' ? (
                            <Image className="h-8 w-8 text-muted-foreground" />
                          ) : (
                            <FileText className="h-8 w-8 text-muted-foreground" />
                          )}
                        </div>
                        <p className="text-sm font-medium truncate">{item.filename}</p>
                        <p className="text-xs text-muted-foreground">
                          Task: {item.tasks?.title || 'Sin task'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(item.created_at), 'dd/MM/yyyy', { locale: es })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Map Tab */}
          <TabsContent value="map">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="mr-2 h-4 w-4" />
                  Mapa de Evidencias
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MapView evidence={evidence || []} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* KPIs Tab */}
          <TabsContent value="kpis">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  KPIs y Métricas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {/* Tasks Stats */}
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{subject.tasks?.length || 0}</div>
                    <p className="text-sm text-muted-foreground">Total Tasks</p>
                  </div>
                  
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {subject.tasks?.filter(t => t.status === 'completed').length || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">Completadas</p>
                  </div>
                  
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">
                      {subject.tasks?.filter(t => t.status !== 'completed').length || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">Pendientes</p>
                  </div>
                  
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{subject.ai_health || 0}%</div>
                    <p className="text-sm text-muted-foreground">Salud IA</p>
                  </div>
                </div>
                
                {/* Placeholder for charts */}
                <div className="mt-6 p-8 border-2 border-dashed rounded-lg text-center text-muted-foreground">
                  Gráficos de KPIs (próximamente)
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default SubjectDetail;