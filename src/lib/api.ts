import { supabase } from "@/integrations/supabase/client";

export async function invokeFunction(path: string, init?: RequestInit) {
  const { error, response } = await supabase.functions.invoke(path, {
    method: (init?.method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH') || 'POST',
    headers: init?.headers as Record<string, string> | undefined,
    body: init?.body as any,
  });

  if (error || !response) {
    throw error || new Error("Failed to invoke function");
  }

  return response;
}
