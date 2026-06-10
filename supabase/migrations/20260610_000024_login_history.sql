-- Add login history table to track user authentication events
create table if not exists public.login_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  role text,
  logged_in_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Create index for efficient querying by date
create index if not exists login_history_user_id_idx on public.login_history (user_id);
create index if not exists login_history_logged_in_at_idx on public.login_history (logged_in_at desc);

-- Enable RLS
alter table public.login_history enable row level security;

-- Only admins can view login history
create policy "Admins can view all login history"
  on public.login_history
  for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Function to log user login (called from auth trigger or webhook)
create or replace function public.log_user_login()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  -- Get the profile info if exists
  select * into v_profile from public.profiles where id = new.id;
  
  -- Log the login
  insert into public.login_history (user_id, email, display_name, role)
  values (
    new.id,
    new.email,
    v_profile.display_name,
    (v_profile.role)::text
  );
  
  return new;
end;
$$;

-- Trigger on auth.users insert (new user creation/signup)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.log_user_login();

-- Note: A webhook from Supabase auth should also log on actual signin/refresh events
-- This trigger only catches new user creation. Webhooks must handle signin/refresh logins.
