create table if not exists public.system_settings (
  id int primary key default 1 check (id = 1), -- Singleton Schema Pattern
  monotributo_categories jsonb not null default '{}'::jsonb,
  analysis_weights jsonb not null default '{}'::jsonb,
  extra_settings jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.system_settings enable row level security;

-- Policies
create policy "Enable read access for authenticated users" on public.system_settings
  for select using (auth.role() = 'authenticated');

create policy "Enable update access for authenticated users" on public.system_settings
  for update using (auth.role() = 'authenticated');

create policy "Enable insert access for authenticated users" on public.system_settings
  for insert with check (auth.role() = 'authenticated');

-- Insert default row if not exists (using defaults from code could be good, but let's init empty and let frontend handle or init here)
-- We will rely on frontend to populate it or use defaults if null.
insert into public.system_settings (id, monotributo_categories, analysis_weights, extra_settings)
values (1, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb)
on conflict (id) do nothing;
