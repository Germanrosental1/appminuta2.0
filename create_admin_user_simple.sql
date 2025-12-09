-- Script simplificado para crear un usuario administrador
-- Este enfoque asume que el usuario ya fue creado a través de la UI de Supabase o la API de autenticación

-- Primero, buscar el ID del usuario por email
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Obtener el ID del usuario
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@rosental.com';
  
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'El usuario admin@rosental.com no existe. Créalo primero usando la UI de Supabase.';
  ELSE
    -- Actualizar o insertar el perfil con rol de administración
    INSERT INTO public.profiles (
      id,
      email,
      nombre,
      apellido,
      role,
      created_at,
      updated_at
    )
    VALUES (
      admin_user_id,
      'admin@rosental.com',
      'Administrador',
      'Sistema',
      'administracion',
      NOW(),
      NOW()
    )
    ON CONFLICT (id) 
    DO UPDATE SET 
      role = 'administracion',
      updated_at = NOW();
    
    RAISE NOTICE 'Usuario administrador configurado con ID: %', admin_user_id;
  END IF;
END $$;

-- Mostrar el usuario actualizado
SELECT 
  u.id, 
  u.email, 
  p.role, 
  p.nombre, 
  p.apellido
FROM 
  auth.users u
  JOIN public.profiles p ON u.id = p.id
WHERE 
  u.email = 'admin@rosental.com';

-- INSTRUCCIONES:
/*
Para usar este script:

1. Primero crea un usuario con email 'admin@rosental.com' usando:
   - La interfaz de usuario de Supabase (Authentication > Users > Invite)
   - O la API de autenticación de Supabase

2. Ejecuta este script en el SQL Editor de Supabase.

3. Verifica que el usuario tenga el rol 'administracion' en la tabla profiles.

4. Inicia sesión con las credenciales del usuario.
*/
