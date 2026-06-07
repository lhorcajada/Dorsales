-- Allow authenticated users to create their own profile row when a legacy account
-- reaches the client-side recovery path during sign-in.

create policy profiles_insert_self_or_admin
  on public.profiles
  for insert
  with check (id = auth.uid() or public.is_admin());