import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarIcon, Search, Filter, Plus, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { SubjectStatus } from "@/types/database";
import { Subject, Task } from "@/types/entities";

const SubjectsList = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | SubjectStatus>("all");
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  // Fetch subjects with filters
  const { data: subjects, isLoading } = useQuery<Subject[]>({
    queryKey: ['subjects', searchTerm, statusFilter, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from<Subject>('subjects')
        .select(`
          id,
          title,
          description,
          status,
          due_date,
          closed_at,
          created_at,
          ai_health,
          tasks (
            id,
            status
          )
        `)
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.ilike('title', `%${searchTerm}%`);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (dateFrom) {
        query = query.gte('due_date', format(dateFrom, 'yyyy-MM-dd'));
      }

      if (dateTo) {
        query = query.lte('due_date', format(dateTo, 'yyyy-MM-dd'));
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Subject[];
    }
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      'draft': { variant: 'outline' as const, label: 'Borrador' },
      'active': { variant: 'default' as const, label: 'Activo' },
      'closed': { variant: 'secondary' as const, label: 'Cerrado' },
      'cancelled': { variant: 'destructive' as const, label: 'Cancelado' }
    };
    
    const config = variants[status as keyof typeof variants] || variants.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTasksStats = (tasks: Task[]) => {
    const total = tasks.length;
    const completed = tasks.filter((t: Task) => t.status === 'completed').length;
    const pending = total - completed;

    return { total, completed, pending };
  };

  const getHealthIndicator = (health: number | null) => {
    if (!health) return { color: 'bg-gray-200', label: 'Sin evaluar' };
    if (health >= 80) return { color: 'bg-green-500', label: 'Excelente' };
    if (health >= 60) return { color: 'bg-yellow-500', label: 'Bueno' };
    return { color: 'bg-red-500', label: 'Crítico' };
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Órdenes de Trabajo</h1>
            <p className="text-muted-foreground">Gestión de proyectos y OTs</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nueva OT
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="mr-2 h-4 w-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as "all" | SubjectStatus)}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="draft">Borrador</SelectItem>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="closed">Cerrado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>

              {/* Date From */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "dd/MM/yyyy", { locale: es }) : "Desde"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              {/* Date To */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "dd/MM/yyyy", { locale: es }) : "Hasta"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>

        {/* Subjects Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Clock className="mr-2 h-4 w-4 animate-spin" />
                Cargando OTs...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>OT</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Tasks</TableHead>
                    <TableHead>Salud IA</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!subjects || subjects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No se encontraron órdenes de trabajo
                      </TableCell>
                    </TableRow>
                  ) : (
                    subjects.map((subject) => {
                      const tasksStats = getTasksStats(subject.tasks || []);
                      const healthIndicator = getHealthIndicator(subject.ai_health);
                      
                      return (
                        <TableRow key={subject.id}>
                          <TableCell>
                            <div>
                              <Link to={`/subjects/${subject.id}`} className="font-medium hover:underline">
                                {subject.title}
                              </Link>
                              {subject.description && (
                                <p className="text-sm text-muted-foreground truncate max-w-xs">
                                  {subject.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(subject.status)}</TableCell>
                          <TableCell>
                            {subject.due_date ? (
                              <div className="text-sm">
                                {format(new Date(subject.due_date), 'dd/MM/yyyy', { locale: es })}
                                {new Date(subject.due_date) < new Date() && subject.status !== 'closed' && (
                                  <Badge variant="destructive" className="ml-2 text-xs">Vencido</Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Sin fecha</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline">{tasksStats.total}</Badge>
                              {tasksStats.pending > 0 && (
                                <Badge variant="secondary">{tasksStats.pending} pendientes</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <div className={`w-3 h-3 rounded-full ${healthIndicator.color}`} />
                              <span className="text-sm">{healthIndicator.label}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Link to={`/subjects/${subject.id}`}>
                                <Button variant="outline" size="sm">
                                  Ver Detalle
                                </Button>
                              </Link>
                              <Button variant="outline" size="sm">
                                Nueva Task
                              </Button>
                            </div>
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

export default SubjectsList;