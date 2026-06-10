-- Add child_name to login_history to track linked child/player
alter table public.login_history
add column if not exists child_name text;

-- Update the log_login RPC to capture the linked child's name
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
  v_child_name text;
begin
  -- Get current user info
  v_user_id := auth.uid();
  
  if v_user_id is null then
    return;
  end if;
  
  -- Get user email from auth
  select email into v_email from auth.users where id = v_user_id;
  
  if v_email is null then
    return;
  end if;
  
  -- Get profile info if exists
  select display_name, role::text into v_display_name, v_role
  from public.profiles
  where id = v_user_id;
  
  -- Get linked child's name only for non-admin users
  -- Use coalesce to safely check the role value
  if coalesce(v_role, '') != 'admin' then
    begin
      select c.full_name into v_child_name
      from public.children c
      where c.parent_id = v_user_id
      limit 1;
    exception when others then
      -- If child lookup fails, just continue with null child_name
      v_child_name := null;
    end;
  end if;
  
  -- Log the login - always attempt to insert
  begin
    insert into public.login_history (user_id, email, display_name, role, child_name)
    values (v_user_id, v_email, v_display_name, v_role, v_child_name);
  exception when others then
    -- Silently ignore if insert fails (e.g., duplicate)
    null;
  end;

end;
$$;

