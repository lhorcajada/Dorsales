-- Force-create the login lookup function and re-apply permissions.
-- This migration is safe to run multiple times.

do $$
declare
  fn regprocedure;
begin
  execute 'drop function if exists public.is_registered_user_email(text)';

  execute $create$
    create function public.is_registered_user_email(p_email text)
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
    $$
  $create$;

  fn := to_regprocedure('public.is_registered_user_email(text)');

  if fn is null then
    raise exception 'No se pudo crear public.is_registered_user_email(text)';
  end if;

  execute format('grant execute on function %s to anon, authenticated', fn);
end
$$;

notify pgrst, 'reload schema';
