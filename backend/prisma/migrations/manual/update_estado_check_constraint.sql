-- ⚡ MIGRACIÓN: Actualizar CHECK constraint para incluir 'en_edicion'
-- Ejecutar manualmente en Supabase SQL Editor

-- 1. Eliminar el constraint existente
ALTER TABLE minutas_definitivas DROP CONSTRAINT IF EXISTS minutas_definitivas_estado_check;

-- 2. Crear nuevo constraint con 'en_edicion' incluido
ALTER TABLE minutas_definitivas ADD CONSTRAINT minutas_definitivas_estado_check 
CHECK (estado IN (
    'borrador', 
    'pendiente', 
    'en_edicion',
    'aprobada', 
    'rechazada', 
    'firmada', 
    'cancelada',
    -- Estados legacy (mayúsculas)
    'Borrador',
    'Pendiente', 
    'En Edición',
    'Aprobada', 
    'Rechazada', 
    'Firmada', 
    'Cancelada',
    -- Estados legacy adicionales
    'Provisoria',
    'En Revisión',
    'Definitiva'
));

-- Verificar que el constraint se creó correctamente:
-- SELECT conname, pg_get_constraintdef(oid) 
-- FROM pg_constraint 
-- WHERE conrelid = 'minutas_definitivas'::regclass AND contype = 'c';
