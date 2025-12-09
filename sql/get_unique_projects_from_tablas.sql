-- Función para obtener proyectos únicos de la tabla 'tablas'
CREATE OR REPLACE FUNCTION public.get_unique_projects_from_tablas()
RETURNS TABLE (proyecto text)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT DISTINCT proyecto 
  FROM public.tablas 
  WHERE proyecto IS NOT NULL 
  ORDER BY proyecto;
$$;

-- Asegúrate de otorgar permisos de ejecución a la función
GRANT EXECUTE ON FUNCTION public.get_unique_projects_from_tablas() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unique_projects_from_tablas() TO anon;
GRANT EXECUTE ON FUNCTION public.get_unique_projects_from_tablas() TO service_role;
