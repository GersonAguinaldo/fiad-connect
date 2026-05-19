
-- Extend profiles
alter table public.profiles
  add column if not exists city text,
  add column if not exists category text not null default 'Ordinaire',
  add column if not exists status text not null default 'Actif';

-- Formations
create table public.formations (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  instructor text,
  schedule text,
  status text not null default 'En cours',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.formations enable row level security;
create policy "Formations viewable by authenticated"
  on public.formations for select to authenticated using (true);
create policy "Admins manage formations insert"
  on public.formations for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins manage formations update"
  on public.formations for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins manage formations delete"
  on public.formations for delete to authenticated using (public.has_role(auth.uid(), 'admin'));
create trigger formations_updated_at before update on public.formations
  for each row execute function public.handle_updated_at();

create table public.formation_enrollments (
  id uuid primary key default gen_random_uuid(),
  formation_id uuid not null references public.formations(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  unique (formation_id, user_id)
);
alter table public.formation_enrollments enable row level security;
create policy "Users view own enrollments"
  on public.formation_enrollments for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create policy "Users enroll themselves"
  on public.formation_enrollments for insert to authenticated with check (auth.uid() = user_id);
create policy "Users cancel own enrollment"
  on public.formation_enrollments for delete to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

-- Events
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date timestamptz not null,
  location text,
  type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.events enable row level security;
create policy "Events viewable by authenticated"
  on public.events for select to authenticated using (true);
create policy "Admins insert events"
  on public.events for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins update events"
  on public.events for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete events"
  on public.events for delete to authenticated using (public.has_role(auth.uid(), 'admin'));
create trigger events_updated_at before update on public.events
  for each row execute function public.handle_updated_at();

create table public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);
alter table public.event_registrations enable row level security;
create policy "Users view own registrations"
  on public.event_registrations for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create policy "Users register themselves"
  on public.event_registrations for insert to authenticated with check (auth.uid() = user_id);
create policy "Users cancel own registration"
  on public.event_registrations for delete to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

-- Transactions
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  reason text not null,
  amount numeric(12,2) not null,
  currency text not null default 'XOF',
  method text,
  status text not null default 'En attente',
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.transactions enable row level security;
create policy "Users view own transactions"
  on public.transactions for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create policy "Admins insert transactions"
  on public.transactions for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins update transactions"
  on public.transactions for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete transactions"
  on public.transactions for delete to authenticated using (public.has_role(auth.uid(), 'admin'));
