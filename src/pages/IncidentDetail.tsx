import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { Clock } from "lucide-react";
import { IncidentStatus } from "@/types/database";

const IncidentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isNew = id === "new";
  const subjectIdFromQuery = searchParams.get("subject_id") || "";
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    subject_id: subjectIdFromQuery,
    category: "",
    description: "",
    status: "open" as IncidentStatus,
  });

  const { data: incident, isLoading } = useQuery({
    queryKey: ["incident", id],
    queryFn: async () => {
      if (isNew) return null;
      const { data, error } = await supabase
        .from("incidents")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !isNew,
  });

  useEffect(() => {
    if (incident) {
      setFormData({
        subject_id: incident.subject_id,
        category: incident.category,
        description: incident.description || "",
        status: incident.status as IncidentStatus,
      });
    }
  }, [incident]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        subject_id: formData.subject_id,
        category: formData.category,
        description: formData.description,
        status: formData.status,
        resolved_at: formData.status === "resolved" ? new Date().toISOString() : null,
      };
      if (isNew) {
        const { error } = await supabase.from("incidents").insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("incidents")
          .update(payload)
          .eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incident", id] });
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["subject-incidents", formData.subject_id] });
      toast({
        title: "Incidencia guardada",
        description: `Estado actualizado a ${formData.status}`,
      });
      if (isNew && formData.subject_id) {
        navigate(`/subjects/${formData.subject_id}`);
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo guardar la incidencia",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    mutation.mutate();
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-8">
          <Clock className="mr-2 h-4 w-4 animate-spin" /> Cargando incidencia...
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <CardTitle>{isNew ? "Nueva incidencia" : "Detalle de incidencia"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Categoría</label>
            <Input
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Descripción</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Estado</label>
            <Select
              value={formData.status}
              onValueChange={(value) =>
                setFormData({ ...formData, status: value as IncidentStatus })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Abierta</SelectItem>
                <SelectItem value="in_progress">En Progreso</SelectItem>
                <SelectItem value="resolved">Resuelta</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSave}>Guardar</Button>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default IncidentDetail;

