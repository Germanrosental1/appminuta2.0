-- Script para actualizar la estructura de la base de datos
-- Este script modifica la tabla minutas_definitivas para adaptarla al nuevo flujo

-- Primero, verificamos si la tabla minutas_definitivas existe
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'minutas_definitivas') THEN
    -- La tabla existe, verificamos su estructura
    RAISE NOTICE 'La tabla minutas_definitivas existe, verificando estructura...';
  ELSE
    -- La tabla no existe, la creamos
    RAISE NOTICE 'La tabla minutas_definitivas no existe, creándola...';
    
    CREATE TABLE public.minutas_definitivas (
      id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
      proyecto text NOT NULL,
      unidad_codigo text NOT NULL,
      usuario_id uuid NOT NULL,
      fecha_creacion timestamp with time zone NULL DEFAULT now(),
      datos jsonb NOT NULL,
      datos_mapa_ventas jsonb NULL,
      estado text NOT NULL,
      comentarios text NULL,
      url_documento text NULL,
      created_at timestamp with time zone NULL DEFAULT now(),
      updated_at timestamp with time zone NULL DEFAULT now(),
      CONSTRAINT minutas_definitivas_pkey PRIMARY KEY (id),
      CONSTRAINT minutas_definitivas_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users (id),
      CONSTRAINT minutas_definitivas_estado_check CHECK (
        (estado = ANY (ARRAY['pendiente'::text, 'aprobada'::text, 'firmada'::text, 'cancelada'::text]))
      )
    );
    
    -- Crear índices para mejorar el rendimiento
    CREATE INDEX idx_minutas_definitivas_usuario_id ON public.minutas_definitivas (usuario_id);
    CREATE INDEX idx_minutas_definitivas_unidad_id ON public.minutas_definitivas (unidad_id);
    CREATE INDEX idx_minutas_definitivas_proyecto ON public.minutas_definitivas (proyecto);
    CREATE INDEX idx_minutas_definitivas_estado ON public.minutas_definitivas (estado);
    
    -- Habilitar RLS
    ALTER TABLE public.minutas_definitivas ENABLE ROW LEVEL SECURITY;
    
    -- Crear políticas de seguridad
    CREATE POLICY "Usuarios pueden ver sus propias minutas" 
      ON public.minutas_definitivas FOR SELECT 
      USING (auth.uid() = usuario_id);
      
    CREATE POLICY "Comerciales pueden crear minutas" 
      ON public.minutas_definitivas FOR INSERT 
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() AND role = 'comercial'
        )
      );
      
    CREATE POLICY "Administradores pueden ver todas las minutas" 
      ON public.minutas_definitivas FOR SELECT 
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() AND role = 'administracion'
        )
      );
      
    CREATE POLICY "Administradores pueden actualizar minutas" 
      ON public.minutas_definitivas FOR UPDATE 
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() AND role = 'administracion'
        )
      );
  END IF;
  
  -- Verificar si la columna minuta_provisoria_id existe y eliminarla si es necesario
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'minutas_definitivas' 
    AND column_name = 'minuta_provisoria_id'
  ) THEN
    RAISE NOTICE 'Eliminando políticas que dependen de minuta_provisoria_id...';
    -- Eliminar todas las políticas que dependen de minuta_provisoria_id
    DROP POLICY IF EXISTS "Los usuarios comerciales pueden ver minutas definitivas relacio" ON public.minutas_definitivas;
    
    -- Ahora podemos eliminar la columna usando CASCADE
    RAISE NOTICE 'Eliminando columna minuta_provisoria_id con CASCADE...';
    ALTER TABLE public.minutas_definitivas DROP COLUMN minuta_provisoria_id CASCADE;
  END IF;
  
  -- Verificar si la columna proyecto existe y agregarla si es necesario
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'minutas_definitivas' 
    AND column_name = 'proyecto'
  ) THEN
    RAISE NOTICE 'Agregando columna proyecto...';
    ALTER TABLE public.minutas_definitivas ADD COLUMN proyecto text NOT NULL DEFAULT 'Sin proyecto';
  END IF;
  
  -- Verificar si la columna comentarios existe y agregarla si es necesario
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'minutas_definitivas' 
    AND column_name = 'comentarios'
  ) THEN
    RAISE NOTICE 'Agregando columna comentarios...';
    ALTER TABLE public.minutas_definitivas ADD COLUMN comentarios text NULL;
  END IF;
  
  -- Verificar si la columna datos_mapa_ventas existe y agregarla si es necesario
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'minutas_definitivas' 
    AND column_name = 'datos_mapa_ventas'
  ) THEN
    RAISE NOTICE 'Agregando columna datos_mapa_ventas...';
    ALTER TABLE public.minutas_definitivas ADD COLUMN datos_mapa_ventas jsonb NULL;
  END IF;
  
  -- Verificar si existe la columna unidad_id y renombrarla a unidad_codigo
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'minutas_definitivas' 
    AND column_name = 'unidad_id'
  ) THEN
    RAISE NOTICE 'Renombrando columna unidad_id a unidad_codigo...';
    ALTER TABLE public.minutas_definitivas RENAME COLUMN unidad_id TO unidad_codigo;
  END IF;
  
  -- Verificar si la columna unidad_codigo existe y agregarla si es necesario
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'minutas_definitivas' 
    AND column_name = 'unidad_codigo'
  ) THEN
    RAISE NOTICE 'Agregando columna unidad_codigo...';
    ALTER TABLE public.minutas_definitivas ADD COLUMN unidad_codigo text NOT NULL DEFAULT '';
  END IF;
  
  -- Verificar si la restricción de estado es correcta y actualizarla si es necesario
  -- Primero eliminamos la restricción existente si existe
  BEGIN
    ALTER TABLE public.minutas_definitivas DROP CONSTRAINT IF EXISTS minutas_definitivas_estado_check;
    
    -- Luego creamos la nueva restricción
    ALTER TABLE public.minutas_definitivas ADD CONSTRAINT minutas_definitivas_estado_check 
      CHECK (estado = ANY (ARRAY['pendiente'::text, 'aprobada'::text, 'firmada'::text, 'cancelada'::text]));
    
    RAISE NOTICE 'Restricción de estado actualizada';
  EXCEPTION
    WHEN others THEN
      RAISE NOTICE 'Error al actualizar la restricción de estado: %', SQLERRM;
  END;
  
  -- Limpiar y reorganizar las políticas RLS
  BEGIN
    -- Eliminar políticas redundantes o conflictivas
    DROP POLICY IF EXISTS "Los usuarios comerciales pueden ver minutas definitivas relacio" ON public.minutas_definitivas;
    
    -- Verificar y actualizar las políticas existentes
    -- 1. Política para que los usuarios vean sus propias minutas
    IF EXISTS (SELECT FROM pg_policies WHERE schemaname = 'public' AND tablename = 'minutas_definitivas' AND policyname = 'Usuarios pueden ver sus propias minutas') THEN
      DROP POLICY "Usuarios pueden ver sus propias minutas" ON public.minutas_definitivas;
    END IF;
    CREATE POLICY "Usuarios pueden ver sus propias minutas" 
      ON public.minutas_definitivas FOR SELECT 
      USING (auth.uid() = usuario_id);
    RAISE NOTICE 'Política "Usuarios pueden ver sus propias minutas" actualizada';
    
    -- 2. Política para que los comerciales puedan crear minutas
    IF EXISTS (SELECT FROM pg_policies WHERE schemaname = 'public' AND tablename = 'minutas_definitivas' AND policyname = 'Comerciales pueden crear minutas') THEN
      DROP POLICY "Comerciales pueden crear minutas" ON public.minutas_definitivas;
    END IF;
    CREATE POLICY "Comerciales pueden crear minutas" 
      ON public.minutas_definitivas FOR INSERT 
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() AND role = 'comercial'
        )
      );
    RAISE NOTICE 'Política "Comerciales pueden crear minutas" actualizada';
    
    -- 3. Política para que los administradores puedan ver todas las minutas
    IF EXISTS (SELECT FROM pg_policies WHERE schemaname = 'public' AND tablename = 'minutas_definitivas' AND policyname = 'Administradores pueden ver todas las minutas') THEN
      DROP POLICY "Administradores pueden ver todas las minutas" ON public.minutas_definitivas;
    END IF;
    CREATE POLICY "Administradores pueden ver todas las minutas" 
      ON public.minutas_definitivas FOR SELECT 
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() AND role = 'administracion'
        )
      );
    RAISE NOTICE 'Política "Administradores pueden ver todas las minutas" actualizada';
    
    -- 4. Política para que los administradores puedan actualizar minutas
    IF EXISTS (SELECT FROM pg_policies WHERE schemaname = 'public' AND tablename = 'minutas_definitivas' AND policyname = 'Administradores pueden actualizar minutas') THEN
      DROP POLICY "Administradores pueden actualizar minutas" ON public.minutas_definitivas;
    END IF;
    CREATE POLICY "Administradores pueden actualizar minutas" 
      ON public.minutas_definitivas FOR UPDATE 
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() AND role = 'administracion'
        )
      );
    RAISE NOTICE 'Política "Administradores pueden actualizar minutas" actualizada';
    
    -- 5. Eliminar políticas redundantes
    IF EXISTS (SELECT FROM pg_policies WHERE schemaname = 'public' AND tablename = 'minutas_definitivas' AND policyname = 'Los administradores pueden crear minutas definitivas') THEN
      DROP POLICY "Los administradores pueden crear minutas definitivas" ON public.minutas_definitivas;
      RAISE NOTICE 'Política redundante "Los administradores pueden crear minutas definitivas" eliminada';
    END IF;
    
    IF EXISTS (SELECT FROM pg_policies WHERE schemaname = 'public' AND tablename = 'minutas_definitivas' AND policyname = 'Los administradores pueden ver minutas definitivas') THEN
      DROP POLICY "Los administradores pueden ver minutas definitivas" ON public.minutas_definitivas;
      RAISE NOTICE 'Política redundante "Los administradores pueden ver minutas definitivas" eliminada';
    END IF;
    
    RAISE NOTICE 'Políticas RLS recreadas correctamente';
  EXCEPTION
    WHEN others THEN
      RAISE NOTICE 'Error al recrear políticas RLS: %', SQLERRM;
  END;
END $$;

-- Mostrar la estructura actual de la tabla
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM 
  information_schema.columns
WHERE 
  table_schema = 'public' 
  AND table_name = 'minutas_definitivas'
ORDER BY 
  ordinal_position;

-- Mostrar las restricciones de la tabla
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(c.oid) AS constraint_definition
FROM 
  pg_constraint c
  JOIN pg_namespace n ON n.oid = c.connamespace
  JOIN pg_class cl ON cl.oid = c.conrelid
WHERE 
  n.nspname = 'public'
  AND cl.relname = 'minutas_definitivas';

-- Mostrar las políticas RLS
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
  tablename = 'minutas_definitivas'
ORDER BY 
  policyname;
