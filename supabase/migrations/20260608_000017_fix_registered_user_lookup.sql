-- Ensures login lookup for registered users runs against public.profiles.
create or replace function public.is_registered_user_email(p_email text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where lower(email) = lower(trim(p_email))
  );
$$;

do $$
declare
  fn regprocedure;
begin
  fn := to_regprocedure('public.is_registered_user_email(text)');

  if fn is null then
    return;
  end if;

  execute format('revoke all on function %s from public', fn);
  execute format('grant execute on function %s to anon, authenticated', fn);
end
$$;

notify pgrst, 'reload schema';
