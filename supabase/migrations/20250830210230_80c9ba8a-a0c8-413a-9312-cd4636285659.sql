-- 011_bitacora_storage_policies.sql - Add RLS policies for bitacora bucket
-- Policy for reading files within tenant folder
CREATE POLICY bitacora_read ON storage.objects FOR SELECT
USING (bucket_id = 'bitacora' AND (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND (name LIKE p.tenant_id::text || '/%')
  )
));

-- Policy for writing files within tenant folder  
CREATE POLICY bitacora_write ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'bitacora' AND (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND (name LIKE p.tenant_id::text || '/%')
  )
));

-- Policy for updating files within tenant folder
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

-- Policy for deleting files within tenant folder
CREATE POLICY bitacora_delete ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'bitacora' AND (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND (name LIKE p.tenant_id::text || '/%')
  )
));