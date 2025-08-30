import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface TaskCommentsProps {
  taskId: string;
}

interface TaskComment {
  id?: string;
  user_id: string;
  message: string;
  created_at: string;
}

export const TaskComments = ({ taskId }: TaskCommentsProps) => {
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();

  const { data: comments, isLoading } = useQuery<TaskComment[]>({
    queryKey: ['task_comments', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_comments')
        .select('id, user_id, message, created_at')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as TaskComment[];
    }
  });

  const addComment = useMutation({
    mutationFn: async (text: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');
      const { error } = await supabase
        .from('task_comments')
        .insert({
          task_id: taskId,
          user_id: user.id,
          message: text
        });
      if (error) throw error;
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ['task_comments', taskId] });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    addComment.mutate(message.trim());
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comentarios</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : comments && comments.length > 0 ? (
            comments.map((comment) => (
              <div key={comment.id ?? comment.created_at} className="border-b pb-2">
                <p className="text-sm">{comment.message}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(comment.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No hay comentarios</p>
          )}
        </div>
        <form onSubmit={handleSubmit} className="flex space-x-2 mt-4">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Escribe un comentario"
          />
          <Button type="submit" disabled={addComment.isPending || !message.trim()}>Enviar</Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default TaskComments;
