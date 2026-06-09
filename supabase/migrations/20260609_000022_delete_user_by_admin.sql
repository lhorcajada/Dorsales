-- Allow admins to delete a single non-admin user (auth + cascaded profile/children).

create or replace function public.delete_user_by_admin(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can delete users';
  end if;

  -- Prevent deleting other admins
  if exists (
    select 1 from public.profiles
    where id = p_user_id and role = 'admin'
  ) then
    raise exception 'Cannot delete admin users';
  end if;

  delete from auth.users where id = p_user_id;
end;
$$;

grant execute on function public.delete_user_by_admin(uuid) to authenticated;
