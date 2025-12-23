-- =====================================================
-- Script de Seed para Permisos y Roles
-- =====================================================

-- 1. Insertar permisos base (solo si no existen ya)
DO $$
BEGIN
  -- view_units
  IF NOT EXISTS (SELECT 1 FROM permisos WHERE nombre = 'view_units') THEN
    INSERT INTO permisos (nombre, descripcion) VALUES ('view_units', 'Ver unidades del proyecto');
  END IF;
  
  -- create_unit
  IF NOT EXISTS (SELECT 1 FROM permisos WHERE nombre = 'create_unit') THEN
    INSERT INTO permisos (nombre, descripcion) VALUES ('create_unit', 'Crear nuevas unidades');
  END IF;
  
  -- edit_unit
  IF NOT EXISTS (SELECT 1 FROM permisos WHERE nombre = 'edit_unit') THEN
    INSERT INTO permisos (nombre, descripcion) VALUES ('edit_unit', 'Editar todos los campos de unidades');
  END IF;
  
  -- delete_unit
  IF NOT EXISTS (SELECT 1 FROM permisos WHERE nombre = 'delete_unit') THEN
    INSERT INTO permisos (nombre, descripcion) VALUES ('delete_unit', 'Eliminar unidades');
  END IF;
  
  -- manage_users
  IF NOT EXISTS (SELECT 1 FROM permisos WHERE nombre = 'manage_users') THEN
    INSERT INTO permisos (nombre, descripcion) VALUES ('manage_users', 'Gestionar usuarios del proyecto');
  END IF;
  
  -- export_data
  IF NOT EXISTS (SELECT 1 FROM permisos WHERE nombre = 'export_data') THEN
    INSERT INTO permisos (nombre, descripcion) VALUES ('export_data', 'Exportar datos del proyecto');
  END IF;
  
  -- view_reports
  IF NOT EXISTS (SELECT 1 FROM permisos WHERE nombre = 'view_reports') THEN
    INSERT INTO permisos (nombre, descripcion) VALUES ('view_reports', 'Ver reportes y estadísticas');
  END IF;
END $$;

-- =====================================================
-- 2. Asignar permisos a SUPERADMINMV (todos los permisos)
-- =====================================================
INSERT INTO "roles-permisos" (idrol, idpermiso)
SELECT 
  '797d8521-aa70-4367-b93b-0d304a1a61e4'::uuid,  -- superadminmv
  id 
FROM permisos
WHERE NOT EXISTS (
  SELECT 1 FROM "roles-permisos" 
  WHERE idrol = '797d8521-aa70-4367-b93b-0d304a1a61e4'::uuid 
  AND idpermiso = permisos.id
);

-- =====================================================
-- 3. Asignar permisos a ADMINMV (ver y reportes únicamente)
--    Admin solo puede cambiar estado, no tiene permiso EDIT_UNIT completo
-- =====================================================
INSERT INTO "roles-permisos" (idrol, idpermiso)
SELECT 
  'c9e1a5a3-4df8-406f-b6f3-399d19e53610'::uuid,  -- adminmv
  id 
FROM permisos
WHERE nombre IN ('view_units', 'view_reports')
AND NOT EXISTS (
  SELECT 1 FROM "roles-permisos" 
  WHERE idrol = 'c9e1a5a3-4df8-406f-b6f3-399d19e53610'::uuid 
  AND idpermiso = permisos.id
);

-- =====================================================
-- 4. Asignar permisos a VIEWERINMOBILIARIAMV (solo reportes)
--    El filtrado de campos se hace en el backend
-- =====================================================
INSERT INTO "roles-permisos" (idrol, idpermiso)
SELECT 
  'ae22536a-5ead-420a-b1f0-5c91c7a45ecc'::uuid,  -- viewerinmobiliariamv
  id 
FROM permisos
WHERE nombre IN ('view_reports')
AND NOT EXISTS (
  SELECT 1 FROM "roles-permisos" 
  WHERE idrol = 'ae22536a-5ead-420a-b1f0-5c91c7a45ecc'::uuid 
  AND idpermiso = permisos.id
);

-- =====================================================
-- 5. Asignar permisos a VIEWERMV (ver unidades y reportes)
-- =====================================================
INSERT INTO "roles-permisos" (idrol, idpermiso)
SELECT 
  '7fa427b5-ee1e-4783-a67c-33f4e848d7c7'::uuid,  -- viewermv
  id 
FROM permisos
WHERE nombre IN ('view_units', 'view_reports')
AND NOT EXISTS (
  SELECT 1 FROM "roles-permisos" 
  WHERE idrol = '7fa427b5-ee1e-4783-a67c-33f4e848d7c7'::uuid 
  AND idpermiso = permisos.id
);

-- =====================================================
-- Verificar permisos asignados
-- =====================================================
SELECT 
  r.nombre as rol,
  p.nombre as permiso,
  p.descripcion
FROM roles r
JOIN "roles-permisos" rp ON r.id = rp.idrol
JOIN permisos p ON p.id = rp.idpermiso
ORDER BY r.nombre, p.nombre;
