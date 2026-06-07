-- Supabase initial schema for the dorsal assignment app.
-- This migration keeps the data model close to the current frontend types
-- while adding the database-side constraints needed for fairness and safety.

create extension if not exists pgcrypto;

create type public.user_role as enum ('user', 'admin');
create type public.dorsal_status as enum ('available', 'assigned', 'locked');

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text not null,
  role public.user_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles (id) on delete cascade,
  full_name text not null,
  birth_date date,
  team_name text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint children_parent_name_unique unique (parent_id, full_name)
);

create table if not exists public.contest_settings (
  id smallint primary key default 1,
  contest_name text not null default 'Asignación de dorsales',
  is_enabled boolean not null default false,
  is_paused boolean not null default false,
  opens_at timestamptz,
  closes_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint contest_settings_single_row check (id = 1)
);

create table if not exists public.dorsals (
  number smallint primary key,
  is_locked boolean not null default false,
  locked_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dorsals_number_range check (number between 1 and 100)
);

create table if not exists public.dorsal_assignments (
  id uuid primary key default gen_random_uuid(),
  dorsal_number smallint not null references public.dorsals (number) on delete restrict,
  child_id uuid not null unique references public.children (id) on delete cascade,
  assigned_by uuid not null references public.profiles (id) on delete restrict,
  assigned_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dorsal_assignments_dorsal_unique unique (dorsal_number)
);

create table if not exists public.assignment_attempts (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.profiles (id) on delete set null,
  child_id uuid references public.children (id) on delete set null,
  dorsal_number smallint,
  success boolean not null default false,
  failure_reason text,
  attempted_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display_name text;
begin
  v_display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, email, display_name, role)
  values (new.id, new.email, v_display_name, 'user')
  on conflict (id) do update
    set email = excluded.email,
        display_name = excluded.display_name,
        updated_at = now();

  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.claim_dorsal(p_child_id uuid, p_dorsal_number smallint)
returns public.dorsal_assignments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.contest_settings%rowtype;
  v_child public.children%rowtype;
  v_dorsal public.dorsals%rowtype;
  v_assignment public.dorsal_assignments%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into v_settings
  from public.contest_settings
  where id = 1;

  if not coalesce(v_settings.is_enabled, false)
     or v_settings.opens_at is null
     or v_settings.closes_at is null
     or now() < v_settings.opens_at
     or now() > v_settings.closes_at then
    raise exception 'Contest is closed';
  end if;

  select *
  into v_child
  from public.children
  where id = p_child_id;

  if not found then
    raise exception 'Child not found';
  end if;

  if v_child.parent_id <> auth.uid() and not public.is_admin() then
    raise exception 'Child does not belong to the current user';
  end if;

  select *
  into v_dorsal
  from public.dorsals
  where number = p_dorsal_number
  for update;

  if not found then
    raise exception 'Dorsal not found';
  end if;

  if v_dorsal.is_locked then
    raise exception 'Dorsal is locked';
  end if;

  if exists (
    select 1
    from public.dorsal_assignments
    where dorsal_number = p_dorsal_number
  ) then
    raise exception 'Dorsal already assigned';
  end if;

  if exists (
    select 1
    from public.dorsal_assignments
    where child_id = p_child_id
  ) then
    raise exception 'Child already has a dorsal';
  end if;

  insert into public.dorsal_assignments (dorsal_number, child_id, assigned_by)
  values (p_dorsal_number, p_child_id, auth.uid())
  returning * into v_assignment;

  insert into public.assignment_attempts (parent_id, child_id, dorsal_number, success)
  values (auth.uid(), p_child_id, p_dorsal_number, true);

  return v_assignment;
exception
  when others then
    insert into public.assignment_attempts (parent_id, child_id, dorsal_number, success, failure_reason)
    values (auth.uid(), p_child_id, p_dorsal_number, false, sqlerrm);
    raise;
end;
$$;

create or replace view public.dorsal_catalog as
select
  d.number,
  case
    when a.id is not null then 'assigned'::public.dorsal_status
    when d.is_locked then 'locked'::public.dorsal_status
    else 'available'::public.dorsal_status
  end as status,
  a.child_id as assigned_child_id,
  c.full_name as assigned_child_name,
  d.is_locked,
  d.locked_reason,
  d.created_at,
  d.updated_at
from public.dorsals d
left join public.dorsal_assignments a
  on a.dorsal_number = d.number
left join public.children c
  on c.id = a.child_id;

insert into public.contest_settings (id, contest_name, is_enabled, is_paused, opens_at, closes_at)
values (1, 'Asignación de dorsales', false, false, null, null)
on conflict (id) do nothing;

insert into public.dorsals (number)
select gs
from generate_series(1, 100) as gs
on conflict do nothing;

alter table public.profiles enable row level security;
alter table public.children enable row level security;
alter table public.contest_settings enable row level security;
alter table public.dorsals enable row level security;
alter table public.dorsal_assignments enable row level security;
alter table public.assignment_attempts enable row level security;

create policy profiles_select_self_or_admin
  on public.profiles
  for select
  using (id = auth.uid() or public.is_admin());

create policy profiles_update_self_or_admin
  on public.profiles
  for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

create policy children_select_own_or_admin
  on public.children
  for select
  using (parent_id = auth.uid() or public.is_admin());

create policy children_insert_own_or_admin
  on public.children
  for insert
  with check (parent_id = auth.uid() or public.is_admin());

create policy children_update_own_or_admin
  on public.children
  for update
  using (parent_id = auth.uid() or public.is_admin())
  with check (parent_id = auth.uid() or public.is_admin());

create policy children_delete_own_or_admin
  on public.children
  for delete
  using (parent_id = auth.uid() or public.is_admin());

create policy contest_settings_select_authenticated
  on public.contest_settings
  for select
  using (auth.uid() is not null);

create policy contest_settings_manage_admin
  on public.contest_settings
  for all
  using (public.is_admin())
  with check (public.is_admin());

create policy dorsals_select_authenticated
  on public.dorsals
  for select
  using (auth.uid() is not null);

create policy dorsals_manage_admin
  on public.dorsals
  for all
  using (public.is_admin())
  with check (public.is_admin());

create policy dorsal_assignments_select_own_or_admin
  on public.dorsal_assignments
  for select
  using (
    public.is_admin()
    or exists (
      select 1
      from public.children c
      where c.id = dorsal_assignments.child_id
        and c.parent_id = auth.uid()
    )
  );

create policy dorsal_assignments_manage_admin
  on public.dorsal_assignments
  for all
  using (public.is_admin())
  with check (public.is_admin());

create policy assignment_attempts_select_own_or_admin
  on public.assignment_attempts
  for select
  using (
    public.is_admin()
    or parent_id = auth.uid()
  );

create policy assignment_attempts_manage_admin
  on public.assignment_attempts
  for all
  using (public.is_admin())
  with check (public.is_admin());

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

create trigger set_children_updated_at
before update on public.children
for each row execute function public.touch_updated_at();

create trigger set_contest_settings_updated_at
before update on public.contest_settings
for each row execute function public.touch_updated_at();

create trigger set_dorsals_updated_at
before update on public.dorsals
for each row execute function public.touch_updated_at();

create trigger set_dorsal_assignments_updated_at
before update on public.dorsal_assignments
for each row execute function public.touch_updated_at();

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

grant usage on schema public to authenticated;
grant select on public.dorsal_catalog to authenticated;
grant execute on function public.claim_dorsal(uuid, smallint) to authenticated;
