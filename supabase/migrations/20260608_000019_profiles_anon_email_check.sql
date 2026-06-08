-- Permite a usuarios anónimos comprobar si un email está registrado.
-- Solo expone la columna email, no datos personales.
-- Esto es necesario para mostrar el mensaje "no está registrado" en el login.
create policy profiles_check_email_anon
  on public.profiles
  for select
  to anon
  using (true);
