-- Ensure registration incidents can be logged without a dorsal number.
-- This is safe to run even if the column is already nullable.

alter table public.incidents
  alter column dorsal_number drop not null;

create or replace function public.register_incident(
  p_user_id uuid default null,
  p_dorsal_number smallint default null,
  p_kind text default 'unexpected_error',
  p_title text default 'Incidencia registrada',
  p_description text default 'Se ha registrado una incidencia en el sistema.',
  p_user_email text default null,
  p_status public.incident_status default 'pending',
  p_severity public.incident_severity default 'medium',
  p_source text default 'claim_dorsal',
  p_details jsonb default '{}'::jsonb
)
returns public.incidents
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_incident public.incidents%rowtype;
  v_final_email text;
begin
  v_final_email := p_user_email;

  if p_user_id is not null and v_final_email is null then
    select *
    into v_profile
    from public.profiles
    where id = p_user_id;

    if not found then
      raise exception 'Profile not found';
    end if;

    v_final_email := v_profile.email;
  end if;

  insert into public.incidents (
    kind,
    title,
    description,
    status,
    severity,
    user_id,
    user_email,
    dorsal_number,
    source,
    details
  )
  values (
    p_kind,
    p_title,
    p_description,
    p_status,
    p_severity,
    p_user_id,
    v_final_email,
    p_dorsal_number,
    p_source,
    p_details
  )
  returning * into v_incident;

  return v_incident;
end;
$$;