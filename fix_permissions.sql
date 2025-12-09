-- Script para verificar y corregir permisos de la tabla mapadeventas

-- 1. Verificar si RLS está habilitado para la tabla
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'mapadeventas';

-- 2. Desactivar RLS para la tabla mapadeventas (si está habilitado)
ALTER TABLE public.mapadeventas DISABLE ROW LEVEL SECURITY;

-- 3. Crear una política que permita a todos los usuarios autenticados leer los datos
CREATE POLICY mapadeventas_select_policy 
ON public.mapadeventas 
FOR SELECT 
USING (true);

-- 4. Habilitar RLS con la nueva política
ALTER TABLE public.mapadeventas ENABLE ROW LEVEL SECURITY;

-- 5. Verificar las políticas existentes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'mapadeventas';

-- 6. Verificar permisos de la tabla
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'mapadeventas' AND table_schema = 'public';

-- 7. Otorgar permisos de lectura a todos los usuarios autenticados
GRANT SELECT ON public.mapadeventas TO authenticated;
GRANT SELECT ON public.mapadeventas TO anon;

-- 8. Verificar si hay datos en la tabla
SELECT COUNT(*) FROM public.mapadeventas;
