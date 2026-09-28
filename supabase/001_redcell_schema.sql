-- red cell.ai schema
-- Applied automatically by server/scripts/setup-db.js when SUPABASE_ACCESS_TOKEN is present.
create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  full_name text not null,
  organization_name text,
  role text not null default 'hospital' check (role in ('hospital', 'donor_center', 'donor')),
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  ai_summary text,
  type text not null default 'request' check (type in ('request', 'availability')),
  blood_group text not null check (blood_group in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  component text not null default 'Whole Blood' check (component in ('Whole Blood', 'Packed Red Cells', 'Platelets', 'Plasma')),
  units_needed integer not null default 1 check (units_needed between 1 and 50),
  hospital_name text,
  location text not null,
  contact_phone text,
  urgency text not null default 'standard' check (urgency in ('critical', 'urgent', 'standard')),
  needed_by timestamptz,
  status text not null default 'open' check (status in ('open', 'matched', 'delivered', 'cancelled')),
  accepted_by uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  delivered_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists items_status_created_idx on public.items(status, created_at desc);
create index if not exists items_blood_group_idx on public.items(blood_group);
create index if not exists items_user_id_idx on public.items(user_id);
create index if not exists sessions_user_id_idx on public.sessions(user_id);
create index if not exists sessions_expires_at_idx on public.sessions(expires_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists items_set_updated_at on public.items;
create trigger items_set_updated_at
before update on public.items
for each row execute function public.set_updated_at();

-- RLS provides a second line of defence for direct Supabase access.
-- The application uses server-side service role access and enforces the same ownership rules in Express.
alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.sessions enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "items_read_network" on public.items;
drop policy if exists "items_insert_own" on public.items;
drop policy if exists "items_update_own" on public.items;
drop policy if exists "items_delete_own" on public.items;

create policy "profiles_select_own" on public.profiles
for select to authenticated using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Authenticated network members can view the live broadcast feed; write ownership stays private.
create policy "items_read_network" on public.items
for select to authenticated using (true);
create policy "items_insert_own" on public.items
for insert to authenticated with check (auth.uid() = user_id);
create policy "items_update_own" on public.items
for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "items_delete_own" on public.items
for delete to authenticated using (auth.uid() = user_id);

-- No client policies exist for sessions. They are accessible only to the server service role.
