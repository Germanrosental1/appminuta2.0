-- Función para obtener proyectos únicos de la tabla mapadeventas
CREATE OR REPLACE FUNCTION public.get_unique_projects()
RETURNS SETOF text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT DISTINCT proyecto 
  FROM public.mapadeventas 
  WHERE proyecto IS NOT NULL 
  ORDER BY proyecto;
$$;
