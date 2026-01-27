create table if not exists public.analyses (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.clients(id) on delete cascade not null,
  name text not null,
  status text default 'En Proceso',
  financial_data jsonb default '{}'::jsonb,
  analysis_settings jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.analyses enable row level security;

-- Policy for authenticated users
create policy "Enable all access for authenticated users" on public.analyses
  for all using (auth.role() = 'authenticated');

-- Add analysis_id to documents
alter table public.documents 
add column if not exists analysis_id uuid references public.analyses(id) on delete set null;
