import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Notification {
  id: string;
  message: string;
  createdAt: Date;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const channel = supabase
      .channel("tasks-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tasks" },
        (payload) => {
          const task = payload.new as { id: string; status?: string; due_date?: string };
          setNotifications((prev) => [
            {
              id: `${task.id}-${payload.commit_timestamp}`,
              message: `Tarea ${task.id} creada`,
              createdAt: new Date(),
            },
            ...prev,
          ]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tasks" },
        (payload) => {
          const oldTask = payload.old as { status?: string; due_date?: string; id: string };
          const task = payload.new as { id: string; status?: string; due_date?: string };
          const changes: string[] = [];
          if (task.status !== oldTask.status) {
            changes.push(`estado: ${oldTask.status ?? ""} → ${task.status ?? ""}`);
          }
          if (task.due_date !== oldTask.due_date) {
            changes.push(`fecha límite: ${oldTask.due_date ?? ""} → ${task.due_date ?? ""}`);
          }
          if (changes.length > 0) {
            setNotifications((prev) => [
              {
                id: `${task.id}-${payload.commit_timestamp}`,
                message: `Tarea ${task.id} actualizada (${changes.join(", ")})`,
                createdAt: new Date(),
              },
              ...prev,
            ]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { notifications };
}

export type { Notification };
