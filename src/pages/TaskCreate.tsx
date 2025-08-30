import { useState, FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";

const TaskCreate = () => {
  const [searchParams] = useSearchParams();
  const subjectId = searchParams.get("subjectId");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
  });

  const createTaskMutation = useMutation({
    mutationFn: async () => {
      if (!subjectId) throw new Error("Subject ID is required");
      const { error } = await supabase.from("tasks").insert({
        subject_id: subjectId,
        title: formData.title,
        description: formData.description,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subject", subjectId] });
      toast({ title: "Task creada", description: "La task se creó correctamente." });
      navigate(`/subjects/${subjectId}`);
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo crear la task.", variant: "destructive" });
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    createTaskMutation.mutate();
  };

  if (!subjectId) {
    return (
      <Layout>
        <div className="text-center py-8 text-muted-foreground">
          Faltan parámetros para crear la task
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Nueva Task</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                Título
              </label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Descripción
              </label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <Button type="submit" disabled={createTaskMutation.isPending}>
              Guardar
            </Button>
          </CardContent>
        </Card>
      </form>
    </Layout>
  );
};

export default TaskCreate;
