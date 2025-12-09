-- Verificar la estructura actual de la tabla minutas_provisorias
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'minutas_provisorias'
ORDER BY 
    ordinal_position;
