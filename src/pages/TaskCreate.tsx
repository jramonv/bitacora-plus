import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import Layout from "@/components/Layout";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const TaskCreate = () => {
  const [searchParams] = useSearchParams();
  const subjectIdParam = searchParams.get("subjectId") || "";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [formData, setFormData] = useState<{ 
    subject_id: string;
    title: string;
    description: string;
    due_date?: Date;
  }>({
    subject_id: subjectIdParam,
    title: "",
    description: "",
    due_date: undefined,
  });

  const { data: subjects } = useQuery({
    queryKey: ["subjects-simple"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("id,title")
        .order("title", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tasks").insert({
        subject_id: formData.subject_id,
        title: formData.title,
        description: formData.description,
        due_date: formData.due_date ? formData.due_date.toISOString() : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Task creada", description: "La task fue creada correctamente." });
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      if (formData.subject_id) {
        queryClient.invalidateQueries({ queryKey: ["subject", formData.subject_id] });
        navigate(`/subjects/${formData.subject_id}`);
      } else {
        navigate("/subjects");
      }
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo crear la task.", variant: "destructive" });
    },
  });

  const handleSave = () => {
    createTaskMutation.mutate();
  };

  return (
    <Layout>
      <Card>
        <CardHeader>
          <CardTitle>Nueva Task</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <Select
              value={formData.subject_id}
              onValueChange={(value) => setFormData({ ...formData, subject_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar OT" />
              </SelectTrigger>
              <SelectContent>
                {subjects?.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="Título"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />

            <Textarea
              placeholder="Descripción"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !formData.due_date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.due_date
                    ? format(formData.due_date, "dd/MM/yyyy", { locale: es })
                    : "Fecha límite"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.due_date}
                  onSelect={(date) => setFormData({ ...formData, due_date: date || undefined })}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={createTaskMutation.isPending}>
                {createTaskMutation.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default TaskCreate;
