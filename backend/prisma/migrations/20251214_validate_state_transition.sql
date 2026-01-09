-- Migración: Validación de Transiciones de Estado de Minutas
-- Fecha: 2025-12-14
-- Propósito: Prevenir transiciones de estado inválidas a nivel de base de datos

-- Crear función para validar transiciones de estado
CREATE OR REPLACE FUNCTION validate_minuta_state_transition()
RETURNS TRIGGER AS $$
BEGIN
    -- Si es un INSERT, permitir cualquier estado inicial
    IF TG_OP = 'INSERT' THEN
        RETURN NEW;
    END IF;

    -- Validar transiciones según el estado actual
    CASE OLD.estado
        -- Desde 'Definitiva' no se puede cambiar
        WHEN 'Definitiva' THEN
            IF NEW.estado != 'Definitiva' THEN
                RAISE EXCEPTION 'No se puede cambiar el estado de una minuta definitiva. Estado actual: %, Estado solicitado: %', OLD.estado, NEW.estado;
            END IF;

        -- Desde 'Provisoria' solo puede ir a 'En Revisión' o 'Rechazada'
        WHEN 'Provisoria' THEN
            IF NEW.estado NOT IN ('Provisoria', 'En Revisión', 'Rechazada') THEN
                RAISE EXCEPTION 'Transición de estado inválida desde Provisoria. Solo se permite: En Revisión, Rechazada. Estado solicitado: %', NEW.estado;
            END IF;

        -- Desde 'En Revisión' puede ir a 'Definitiva', 'Provisoria' o 'Rechazada'
        WHEN 'En Revisión' THEN
            IF NEW.estado NOT IN ('En Revisión', 'Definitiva', 'Provisoria', 'Rechazada') THEN
                RAISE EXCEPTION 'Transición de estado inválida desde En Revisión. Solo se permite: Definitiva, Provisoria, Rechazada. Estado solicitado: %', NEW.estado;
            END IF;

        -- Desde 'Rechazada' solo puede volver a 'Provisoria'
        WHEN 'Rechazada' THEN
            IF NEW.estado NOT IN ('Rechazada', 'Provisoria') THEN
                RAISE EXCEPTION 'Transición de estado inválida desde Rechazada. Solo se permite: Provisoria. Estado solicitado: %', NEW.estado;
            END IF;

        -- Estado desconocido
        ELSE
            RAISE EXCEPTION 'Estado actual desconocido: %', OLD.estado;
    END CASE;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Eliminar trigger si existe (para permitir re-ejecución)
DROP TRIGGER IF EXISTS check_minuta_state_transition ON minutas_definitivas;

-- Crear trigger para validar transiciones de estado
CREATE TRIGGER check_minuta_state_transition
    BEFORE UPDATE ON minutas_definitivas
    FOR EACH ROW
    EXECUTE FUNCTION validate_minuta_state_transition();

-- Comentarios para documentación
COMMENT ON FUNCTION validate_minuta_state_transition() IS 
'Valida que las transiciones de estado de minutas sigan las reglas de negocio:
- Provisoria → En Revisión, Rechazada
- En Revisión → Definitiva, Provisoria, Rechazada
- Definitiva → (sin cambios permitidos)
- Rechazada → Provisoria';

COMMENT ON TRIGGER check_minuta_state_transition ON minutas_definitivas IS
'Trigger que previene transiciones de estado inválidas en minutas';
