-- Create bitacora storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('bitacora', 'bitacora', false);

-- RLS policy for reading files within tenant folder
CREATE POLICY bitacora_read ON storage.objects FOR SELECT
USING (bucket_id = 'bitacora' AND (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND (name LIKE p.tenant_id::text || '/%')
  )
));

-- RLS policy for uploading files within tenant folder
CREATE POLICY bitacora_write ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'bitacora' AND (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND (name LIKE p.tenant_id::text || '/%')
  )
));

-- RLS policy for updating files within tenant folder
CREATE POLICY bitacora_update ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'bitacora' AND (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND (name LIKE p.tenant_id::text || '/%')
  )
)) WITH CHECK (bucket_id = 'bitacora' AND (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND (name LIKE p.tenant_id::text || '/%')
  )
));

-- RLS policy for deleting files within tenant folder
CREATE POLICY bitacora_delete ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'bitacora' AND (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND (name LIKE p.tenant_id::text || '/%')
  )
));