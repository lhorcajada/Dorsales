-- Persist temporary dorsal selections so other users can see who reserved them.

alter table public.dorsals
  add column if not exists locked_by_parent_id uuid references public.profiles (id) on delete set null,
  add column if not exists locked_by_child_id uuid references public.children (id) on delete set null,
  add column if not exists locked_at timestamptz;

update public.dorsals
set locked_by_parent_id = null,
    locked_by_child_id = null,
    locked_at = null
where is_locked = false;

create or replace function public.reserve_dorsal(p_child_id uuid, p_dorsal_number smallint)
returns public.dorsals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.contest_settings%rowtype;
  v_child public.children%rowtype;
  v_dorsal public.dorsals%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into v_settings
  from public.contest_settings
  where id = 1;

  if not coalesce(v_settings.is_enabled, false)
     or coalesce(v_settings.is_paused, false)
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

  if exists (
    select 1
    from public.dorsal_assignments
    where dorsal_number = p_dorsal_number
  ) then
    raise exception 'Dorsal already assigned';
  end if;

  if v_dorsal.is_locked and (
    v_dorsal.locked_by_parent_id is distinct from auth.uid()
    or v_dorsal.locked_by_child_id is distinct from p_child_id
  ) then
    if v_dorsal.locked_reason is not null and v_dorsal.locked_reason <> '' then
      raise exception 'El dorsal ya ha sido seleccionado por %', v_dorsal.locked_reason;
    end if;

    raise exception 'El dorsal ya ha sido seleccionado por otro usuario';
  end if;

  update public.dorsals
  set is_locked = true,
      locked_reason = v_child.full_name,
      locked_by_parent_id = auth.uid(),
      locked_by_child_id = p_child_id,
      locked_at = now(),
      updated_at = now()
  where number = p_dorsal_number
  returning * into v_dorsal;

  return v_dorsal;
exception
  when others then
    raise;
end;
$$;

create or replace function public.release_dorsal_lock(p_dorsal_number smallint)
returns public.dorsals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dorsal public.dorsals%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into v_dorsal
  from public.dorsals
  where number = p_dorsal_number
  for update;

  if not found then
    raise exception 'Dorsal not found';
  end if;

  if not v_dorsal.is_locked then
    return v_dorsal;
  end if;

  if v_dorsal.locked_by_parent_id is distinct from auth.uid() and not public.is_admin() then
    raise exception 'El dorsal ha sido seleccionado por otro usuario';
  end if;

  update public.dorsals
  set is_locked = false,
      locked_reason = null,
      locked_by_parent_id = null,
      locked_by_child_id = null,
      locked_at = null,
      updated_at = now()
  where number = p_dorsal_number
  returning * into v_dorsal;

  return v_dorsal;
end;
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
     or coalesce(v_settings.is_paused, false)
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

  if v_dorsal.is_locked and (
    v_dorsal.locked_by_parent_id is distinct from auth.uid()
    or v_dorsal.locked_by_child_id is distinct from p_child_id
  ) then
    if v_dorsal.locked_reason is not null and v_dorsal.locked_reason <> '' then
      raise exception 'El dorsal ya ha sido seleccionado por %', v_dorsal.locked_reason;
    end if;

    raise exception 'El dorsal ya ha sido seleccionado por otro usuario';
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

  update public.dorsals
  set is_locked = false,
      locked_reason = null,
      locked_by_parent_id = null,
      locked_by_child_id = null,
      locked_at = null,
      updated_at = now()
  where number = p_dorsal_number;

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

drop view if exists public.dorsal_catalog;

create view public.dorsal_catalog as
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
  d.locked_by_parent_id,
  d.locked_by_child_id,
  d.locked_at,
  d.created_at,
  d.updated_at
from public.dorsals d
left join public.dorsal_assignments a
  on a.dorsal_number = d.number
left join public.children c
  on c.id = a.child_id;

grant execute on function public.reserve_dorsal(uuid, smallint) to authenticated;
grant execute on function public.release_dorsal_lock(smallint) to authenticated;