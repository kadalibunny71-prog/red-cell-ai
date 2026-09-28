-- Organisation verification details and private operational delivery tracking

alter table public.profiles
  add column if not exists contact_person text,
  add column if not exists phone text,
  add column if not exists address text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists postal_code text,
  add column if not exists registration_number text;

alter table public.items
  add column if not exists delivery_status text not null default 'not_started' check (delivery_status in ('not_started', 'preparing', 'collected', 'in_transit', 'arrived', 'delivered')),
  add column if not exists delivery_last_location text,
  add column if not exists delivery_eta timestamptz,
  add column if not exists delivery_updated_at timestamptz,
  add column if not exists delivery_notes text;

create table if not exists public.delivery_events (
  id uuid primary key default uuid_generate_v4(),
  item_id uuid not null references public.items(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  delivery_status text not null check (delivery_status in ('preparing', 'collected', 'in_transit', 'arrived', 'delivered')),
  location text,
  note text,
  eta timestamptz,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists delivery_events_item_occurred_idx on public.delivery_events(item_id, occurred_at asc);

alter table public.delivery_events enable row level security;

drop policy if exists "delivery_events_read_participants" on public.delivery_events;
drop policy if exists "delivery_events_insert_participants" on public.delivery_events;

-- Delivery locations remain private to the hospital requester and the matched donor centre.
create policy "delivery_events_read_participants" on public.delivery_events
for select to authenticated using (
  exists (
    select 1 from public.items item
    where item.id = item_id
      and (item.user_id = auth.uid() or item.accepted_by = auth.uid())
  )
);

create policy "delivery_events_insert_participants" on public.delivery_events
for insert to authenticated with check (
  actor_id = auth.uid()
  and exists (
    select 1 from public.items item
    where item.id = item_id
      and (item.user_id = auth.uid() or item.accepted_by = auth.uid())
  )
);
