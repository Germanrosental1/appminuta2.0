-- Script para verificar los usuarios existentes y sus roles

-- Mostrar todos los usuarios con sus perfiles
SELECT 
  u.id, 
  u.email, 
  p.role, 
  p.nombre, 
  p.apellido,
  u.created_at,
  u.last_sign_in_at
FROM 
  auth.users u
  LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY 
  u.created_at DESC;

-- Contar usuarios por rol
SELECT 
  p.role, 
  COUNT(*) as total
FROM 
  public.profiles p
GROUP BY 
  p.role
ORDER BY 
  total DESC;

-- Verificar estructura de la tabla profiles
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM 
  information_schema.columns
WHERE 
  table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY 
  ordinal_position;

-- Verificar políticas RLS en la tabla profiles
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check
FROM 
  pg_policies
WHERE 
  tablename = 'profiles'
ORDER BY 
  policyname;
