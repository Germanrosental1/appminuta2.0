-- Script para crear usuarios de demostración en Supabase
-- IMPORTANTE: Este script debe ejecutarse en el SQL Editor de Supabase con privilegios de servicio

-- ========================================
-- USUARIO 1: Administración
-- ========================================
-- Email: Paco.seminoAdmin@gmail.com
-- Password: Macluctoc&510
-- Rol: administracion

DO $$
DECLARE
  user_id_admin UUID;
BEGIN
  -- Crear usuario en auth.users (requiere extensión auth)
  -- Nota: En Supabase, los usuarios normalmente se crean desde el dashboard o API
  -- Este script crea el perfil asumiendo que el usuario ya existe en auth.users
  
  -- Buscar si ya existe un usuario con este email
  SELECT id INTO user_id_admin 
  FROM auth.users 
  WHERE email = 'paco.seminoadmin@gmail.com';
  
  IF user_id_admin IS NOT NULL THEN
    RAISE NOTICE 'Usuario admin ya existe con ID: %', user_id_admin;
    
    -- Actualizar o crear perfil
    INSERT INTO profiles (id, email, nombre, apellido, role, activo, require_password_change, first_login)
    VALUES (
      user_id_admin,
      'paco.seminoadmin@gmail.com',
      'Paco',
      'Semino Admin',
      'administracion',
      true,
      false,
      false
    )
    ON CONFLICT (id) 
    DO UPDATE SET
      email = EXCLUDED.email,
      nombre = EXCLUDED.nombre,
      apellido = EXCLUDED.apellido,
      role = EXCLUDED.role,
      activo = EXCLUDED.activo,
      updated_at = NOW();
      
    RAISE NOTICE 'Perfil de administración creado/actualizado';
  ELSE
    RAISE NOTICE 'Usuario con email paco.seminoadmin@gmail.com no existe en auth.users';
    RAISE NOTICE 'Por favor, créalo primero desde el dashboard de Supabase o usando la API';
  END IF;
END $$;

-- ========================================
-- USUARIO 2: Comercial
-- ========================================
-- Email: Paco.seminoComercial@gmail.com
-- Password: Macluctoc&510
-- Rol: comercial

DO $$
DECLARE
  user_id_comercial UUID;
BEGIN
  -- Buscar si ya existe un usuario con este email
  SELECT id INTO user_id_comercial 
  FROM auth.users 
  WHERE email = 'paco.seminocomercial@gmail.com';
  
  IF user_id_comercial IS NOT NULL THEN
    RAISE NOTICE 'Usuario comercial ya existe con ID: %', user_id_comercial;
    
    -- Actualizar o crear perfil
    INSERT INTO profiles (id, email, nombre, apellido, role, activo, require_password_change, first_login)
    VALUES (
      user_id_comercial,
      'paco.seminocomercial@gmail.com',
      'Paco',
      'Semino Comercial',
      'comercial',
      true,
      false,
      false
    )
    ON CONFLICT (id) 
    DO UPDATE SET
      email = EXCLUDED.email,
      nombre = EXCLUDED.nombre,
      apellido = EXCLUDED.apellido,
      role = EXCLUDED.role,
      activo = EXCLUDED.activo,
      updated_at = NOW();
      
    RAISE NOTICE 'Perfil de comercial creado/actualizado';
  ELSE
    RAISE NOTICE 'Usuario con email paco.seminocomercial@gmail.com no existe en auth.users';
    RAISE NOTICE 'Por favor, créalo primero desde el dashboard de Supabase o usando la API';
  END IF;
END $$;

-- ========================================
-- Verificar usuarios creados
-- ========================================
SELECT 
  p.id,
  p.email,
  p.nombre,
  p.apellido,
  p.role,
  p.activo,
  p.created_at,
  p.updated_at
FROM profiles p
WHERE p.email IN ('paco.seminoadmin@gmail.com', 'paco.seminocomercial@gmail.com')
ORDER BY p.email;
