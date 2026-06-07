-- Normalize the profile role naming to match the frontend role model.

do $$
begin
  update public.profiles
  set role = 'admin'
  where email = 'lucio.horcajada@gmail.com';
exception
  when undefined_table then
    null;
end
$$;

do $$
begin
  if exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'user_role'
      and e.enumlabel = 'parent'
  ) then
    alter type public.user_role rename value 'parent' to 'user';
  end if;
end
$$;

alter table public.profiles
  alter column role set default 'user';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display_name text;
  v_role public.user_role := case when new.email = 'lucio.horcajada@gmail.com' then 'admin' else 'user' end;
begin
  v_display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, email, display_name, role)
  values (new.id, new.email, v_display_name, v_role)
  on conflict (id) do update
    set email = excluded.email,
        display_name = excluded.display_name,
        role = excluded.role,
        updated_at = now();

  return new;
end;
$$;