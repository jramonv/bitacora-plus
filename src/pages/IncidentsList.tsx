import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Plus, AlertTriangle, Clock } from "lucide-react";

const getStatusBadge = (status: string) => {
  const variants: Record<string, { variant: any; label: string }> = {
    open: { variant: "secondary", label: "Abierta" },
    in_progress: { variant: "default", label: "En Progreso" },
    resolved: { variant: "default", label: "Resuelta" },
  };
  const config = variants[status] || variants.open;
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

const IncidentsList = () => {
  const { data: incidents, isLoading } = useQuery({
    queryKey: ["incidents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incidents")
        .select(
          `id, subject_id, category, description, status, created_at, resolved_at, subjects ( id, title )`
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-8">
          <Clock className="mr-2 h-4 w-4 animate-spin" /> Cargando incidencias...
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Incidencias</h1>
            <p className="text-muted-foreground">Listado de incidencias registradas</p>
          </div>
          <Link to="/incidents/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Nueva incidencia
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="mr-2 h-4 w-4" /> Incidencias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>OT</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Creada</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!incidents || incidents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No hay incidencias registradas
                    </TableCell>
                  </TableRow>
                ) : (
                  incidents.map((inc: any) => (
                    <TableRow key={inc.id}>
                      <TableCell>{inc.subjects?.title || inc.subject_id}</TableCell>
                      <TableCell>{inc.category}</TableCell>
                      <TableCell>{getStatusBadge(inc.status)}</TableCell>
                      <TableCell>
                        {inc.created_at ? format(new Date(inc.created_at), "dd/MM/yyyy", { locale: es }) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link to={`/incidents/${inc.id}`}>
                          <Button variant="outline" size="sm">
                            Ver
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
      </div>
    </Layout>
  );
};

export default IncidentsList;

