-- Ejecutar este script DIRECTAMENTE en el SQL Editor de Supabase (no como migración).
create or replace function public.is_registered_user_email(p_email text)
returns boolean
language plpgsql
security definer
as $body$
begin
  return exists (
    select 1
    from public.profiles
    where lower(profiles.email) = lower(trim(p_email))
  );
end;
$body$;

grant execute on function public.is_registered_user_email(text) to anon;
grant execute on function public.is_registered_user_email(text) to authenticated;

-- Verificación inmediata: debe devolver true/false sin error
select public.is_registered_user_email('correo-que-no-existe@demo.local');
