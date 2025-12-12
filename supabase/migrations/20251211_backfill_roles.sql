-- BACKFILL SCRIPT
-- Run this ONCE in Supabase SQL Editor to populate roles for ALL existing users.
-- This ensures 'instant login' works immediately for everyone without waiting for role changes.

do $$
declare
  user_record record;
  _roles jsonb;
begin
  -- Iterate over all users who have roles assigned
  for user_record in select distinct idusuario from public."usuarios-roles" loop
    
    -- 1. Fetch their roles as JSON
    select jsonb_agg(
      jsonb_build_object(
        'nombre', r.nombre,
        'id', r.id
      )
    )
    into _roles
    from public."usuarios-roles" ur
    join public.roles r on ur.idrol = r.id
    where ur.idusuario = user_record.idusuario;

    -- Handle empty case (shouldn't happen due to loop source, but safety first)
    if _roles is null then 
      _roles := '[]'::jsonb; 
    end if;

    -- 2. Update the user's metadata in auth.users
    update auth.users
    set raw_app_meta_data = 
      coalesce(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object('roles', _roles)
    where id = user_record.idusuario;
    
    raise notice 'Updated roles for user %', user_record.idusuario;
  end loop;
end;
$$;
