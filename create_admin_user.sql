-- Script para crear un usuario administrador en la base de datos
-- Este script debe ejecutarse en el SQL Editor de Supabase

-- Primero verificamos si el usuario ya existe en auth.users
DO $$
DECLARE
  user_exists BOOLEAN;
  user_id UUID;
BEGIN
  -- Verificar si el usuario ya existe
  SELECT EXISTS(
    SELECT 1 FROM auth.users 
    WHERE email = 'admin@rosental.com'
  ) INTO user_exists;
  
  IF NOT user_exists THEN
    -- Crear el usuario en auth.users (esto normalmente lo hace Supabase Auth)
    -- Nota: En producción, es mejor crear el usuario a través de la UI de Supabase
    -- o usando la API de autenticación. Este es un enfoque directo para desarrollo.
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) 
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      uuid_generate_v4(),
      'authenticated',
      'authenticated',
      'admin@rosental.com',
      crypt('admin123', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Administrador"}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO user_id;
    
    -- Crear el perfil del usuario con rol de administración
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
      user_id,
      'admin@rosental.com',
      'Administrador',
      'Sistema',
      'administracion',
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'Usuario administrador creado con ID: %', user_id;
  ELSE
    -- El usuario ya existe, actualizar su rol a administración
    SELECT id INTO user_id FROM auth.users WHERE email = 'admin@rosental.com';
    
    -- Actualizar el perfil existente o crearlo si no existe
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
      user_id,
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
    
    RAISE NOTICE 'Usuario administrador actualizado con ID: %', user_id;
  END IF;
  
  -- Verificar que el usuario tenga el rol correcto
  RAISE NOTICE 'Verificando rol del usuario...';
  RAISE NOTICE 'Rol en profiles: %', (SELECT role FROM public.profiles WHERE email = 'admin@rosental.com');
END $$;

-- Mostrar el usuario creado/actualizado
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

-- Instrucciones para el usuario:
/*
INSTRUCCIONES:

1. Ejecuta este script en el SQL Editor de Supabase.
2. Verifica que el usuario se haya creado correctamente.
3. Credenciales de acceso:
   - Email: admin@rosental.com
   - Contraseña: admin123
4. Inicia sesión en la aplicación con estas credenciales.
5. Deberías ser redirigido automáticamente al panel de administración.

NOTA: Este enfoque es para desarrollo. En producción, es mejor usar
la interfaz de Supabase o las APIs de autenticación para crear usuarios.
*/
