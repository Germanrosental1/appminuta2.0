-- =====================================================
-- Configuración de Permisos RBAC
-- =====================================================
-- Este script configura los permisos correctos para cada rol
-- Elimina permisos incorrectos y asigna solo los necesarios

BEGIN;

-- 1. Crear permisos si no existen (usando NOT EXISTS)
INSERT INTO permisos (id, nombre, descripcion)
SELECT gen_random_uuid(), 'verMinutas', 'Acceso básico para ver minutas'
WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE nombre = 'verMinutas');

INSERT INTO permisos (id, nombre, descripcion)
SELECT gen_random_uuid(), 'verTodasMinutas', 'Ver todas las minutas sin restricción'
WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE nombre = 'verTodasMinutas');

INSERT INTO permisos (id, nombre, descripcion)
SELECT gen_random_uuid(), 'generarMinuta', 'Crear nuevas minutas'
WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE nombre = 'generarMinuta');

INSERT INTO permisos (id, nombre, descripcion)
SELECT gen_random_uuid(), 'editarMinuta', 'Editar datos de minutas'
WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE nombre = 'editarMinuta');

INSERT INTO permisos (id, nombre, descripcion)
SELECT gen_random_uuid(), 'aprobarRechazarMinuta', 'Aprobar/Rechazar/Enviar a edición'
WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE nombre = 'aprobarRechazarMinuta');

INSERT INTO permisos (id, nombre, descripcion)
SELECT gen_random_uuid(), 'firmarMinutas', 'Firmar minutas aprobadas'
WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE nombre = 'firmarMinutas');

-- 2. LIMPIAR permisos existentes de los roles
-- Esto asegura que no queden permisos viejos o incorrectos

DELETE FROM "roles-permisos"
WHERE idrol IN (
  SELECT id FROM roles WHERE nombre IN ('administrador', 'firmante', 'viewer', 'comercial')
);

-- 3. ASIGNAR permisos al rol ADMINISTRADOR
INSERT INTO "roles-permisos" (idrol, idpermiso)
SELECT r.id, p.id 
FROM roles r 
CROSS JOIN permisos p
WHERE r.nombre = 'administrador' 
  AND p.nombre IN (
    'verMinutas',
    'verTodasMinutas',
    'editarMinuta',
    'aprobarRechazarMinuta'
  );

-- 4. ASIGNAR permisos al rol FIRMANTE
INSERT INTO "roles-permisos" (idrol, idpermiso)
SELECT r.id, p.id 
FROM roles r 
CROSS JOIN permisos p
WHERE r.nombre = 'firmante' 
  AND p.nombre IN (
    'verMinutas',
    'firmarMinutas'
  );

-- 5. ASIGNAR permisos al rol VIEWER
INSERT INTO "roles-permisos" (idrol, idpermiso)
SELECT r.id, p.id 
FROM roles r 
CROSS JOIN permisos p
WHERE r.nombre = 'viewer' 
  AND p.nombre IN (
    'verMinutas',
    'verTodasMinutas'
  );

-- 6. ASIGNAR permisos al rol COMERCIAL
INSERT INTO "roles-permisos" (idrol, idpermiso)
SELECT r.id, p.id 
FROM roles r 
CROSS JOIN permisos p
WHERE r.nombre = 'comercial' 
  AND p.nombre IN (
    'verMinutas',
    'generarMinuta',
    'editarMinuta'
  );

-- 7. VERIFICAR configuración final
SELECT 
  r.nombre as rol,
  p.nombre as permiso
FROM roles r
INNER JOIN "roles-permisos" rp ON r.id = rp.idrol
INNER JOIN permisos p ON rp.idpermiso = p.id
WHERE r.nombre IN ('administrador', 'firmante', 'viewer', 'comercial')
ORDER BY r.nombre, p.nombre;

COMMIT;
