-- Restart contest data and remove non-admin accounts.

create or replace function public.restart_contest()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_ids uuid[];
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can restart the contest';
  end if;

  select coalesce(array_agg(id), '{}'::uuid[])
  into v_user_ids
  from public.profiles
  where role = 'user';

  delete from public.dorsal_assignments
  where id is not null;

  update public.dorsals
  set is_locked = false,
      locked_reason = null,
      locked_by_parent_id = null,
      locked_by_child_id = null,
      locked_at = null
  where is_locked = true
     or locked_reason is not null
     or locked_by_parent_id is not null
     or locked_by_child_id is not null
     or locked_at is not null;

  if array_length(v_user_ids, 1) is not null then
    delete from auth.users
    where id = any(v_user_ids);
  end if;
end;
$$;

grant execute on function public.restart_contest() to authenticated;
