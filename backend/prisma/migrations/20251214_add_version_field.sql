-- Migración: Agregar campo version a minutas_definitivas
-- Fecha: 2025-12-14
-- Propósito: Implementar optimistic locking para prevenir race conditions

-- Agregar campo version con valor por defecto 1
ALTER TABLE minutas_definitivas 
ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Comentario para documentación
COMMENT ON COLUMN minutas_definitivas.version IS 
'Campo para optimistic locking. Se incrementa en cada actualización para detectar conflictos de concurrencia.';

-- Verificar que se agregó correctamente
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'minutas_definitivas' 
        AND column_name = 'version'
    ) THEN
        RAISE NOTICE 'Campo version agregado exitosamente a minutas_definitivas';
    ELSE
        RAISE EXCEPTION 'Error: No se pudo agregar el campo version';
    END IF;
END $$;
