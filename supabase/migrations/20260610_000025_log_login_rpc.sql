-- Create RPC to log user login events (called from frontend on signin)
create or replace function public.log_login()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_email text;
  v_display_name text;
  v_role text;
begin
  -- Get current user info
  v_user_id := auth.uid();
  
  if v_user_id is null then
    raise exception 'User must be authenticated to log login';
  end if;
  
  -- Get user email from auth
  select email into v_email from auth.users where id = v_user_id;
  
  if v_email is null then
    raise exception 'User email not found';
  end if;
  
  -- Get profile info if exists
  select display_name, role::text into v_display_name, v_role
  from public.profiles
  where id = v_user_id;
  
  -- Log the login
  insert into public.login_history (user_id, email, display_name, role)
  values (v_user_id, v_email, v_display_name, v_role)
  on conflict do nothing;
  
exception when others then
  -- Log error but don't fail authentication
  raise warning 'Error logging login: %', sqlerrm;
end;
$$;

-- Grant execute permission to all authenticated users
grant execute on function public.log_login() to authenticated;
