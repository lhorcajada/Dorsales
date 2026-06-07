alter table public.contest_settings
  add column if not exists is_paused boolean not null default false;

update public.contest_settings
set is_paused = false
where is_paused is null;

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
