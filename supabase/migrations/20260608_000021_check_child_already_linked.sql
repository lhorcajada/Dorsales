-- Exposes a child-link lookup so registration can be blocked before auth user creation.
create or replace function public.is_child_already_linked(p_child_name text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.children
    where lower(trim(full_name)) = lower(trim(p_child_name))
  );
$$;

do $$
declare
  fn regprocedure;
begin
  fn := to_regprocedure('public.is_child_already_linked(text)');

  if fn is null then
    return;
  end if;

  execute format('revoke all on function %s from public', fn);
  execute format('grant execute on function %s to anon, authenticated', fn);
end
$$;

notify pgrst, 'reload schema';
