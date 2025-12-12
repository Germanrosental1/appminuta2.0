-- Function to handle new user roles and update JWT metadata
-- This function runs on INSERT or DELETE on public."usuarios-roles" table
-- It updates the auth.users.raw_app_meta_data field with the current roles of the user

create or replace function public.handle_new_user_role()
returns trigger as $$
declare
  _user_id uuid;
  _roles jsonb;
begin
  -- Determine the user_id based on operation
  if (TG_OP = 'DELETE') then
    _user_id := OLD.idusuario;
  else
    _user_id := NEW.idusuario;
  end if;

  -- Select all roles for this user as a JSON array
  -- structure: [{ "nombre": "admin", "id": "..." }, ...]
  select jsonb_agg(
    jsonb_build_object(
      'nombre', r.nombre,
      'id', r.id
    )
  )
  into _roles
  from public."usuarios-roles" ur
  join public.roles r on ur.idrol = r.id
  where ur.idusuario = _user_id;

  -- If no roles, set to empty array
  if _roles is null then
    _roles := '[]'::jsonb;
  end if;

  -- Update auth.users metadata
  -- This requires the function to run with security definer (postgres role)
  update auth.users
  set raw_app_meta_data = 
    coalesce(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('roles', _roles)
  where id = _user_id;

  return null;
end;
$$ language plpgsql security definer;

-- Trigger to fire on insert or delete of roles
drop trigger if exists on_auth_user_role_change on public."usuarios-roles";
create trigger on_auth_user_role_change
  after insert or delete on public."usuarios-roles"
  for each row execute procedure public.handle_new_user_role();

-- Helper: Sync existing users (Run this manually once if needed)
-- This block is just for reference, triggers don't run on existing data automatically.
-- To backfill:
-- do $$
-- declare
--   user_record record;
-- begin
--   for user_record in select distinct idusuario from public."usuarios-roles" loop
--     -- update dummy to fire trigger? No, better to call logic directly.
--     -- Or just let them log out and back in if we implement "login hook" (auth hook).
--     -- Unlike Firebase, Supabase doesn't have "login hooks" easily accessible without extra setup.
--     -- But updating the user metadata directly works.
--     null; -- Placeholder
--   end loop;
-- end;
-- $$;
