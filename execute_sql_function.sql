-- Función para ejecutar consultas SQL dinámicas
CREATE OR REPLACE FUNCTION public.execute_sql(sql_query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  EXECUTE 'SELECT json_agg(t) FROM (' || sql_query || ') t' INTO result;
  RETURN result;
END;
$$;
