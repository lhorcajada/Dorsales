-- Fix register_incident signature mismatches and grants.
-- This migration is idempotent and safe to run after previous attempts.

alter table public.incidents
  alter column dorsal_number drop not null;

-- Remove common old overloads to avoid ambiguous or missing-signature grant issues.
drop function if exists public.register_incident(
  uuid,
  smallint,
  text,
  text,
  text,
  public.incident_status,
  public.incident_severity,
  text,
  jsonb
);

drop function if exists public.register_incident(
  uuid,
  integer,
  text,
  text,
  text,
  public.incident_status,
  public.incident_severity,
  text,
  jsonb
);

drop function if exists public.register_incident(
  uuid,
  smallint,
  text,
  text,
  text,
  text,
  public.incident_status,
  public.incident_severity,
  text,
  jsonb
);

drop function if exists public.register_incident(
  uuid,
  integer,
  text,
  text,
  text,
  text,
  public.incident_status,
  public.incident_severity,
  text,
  jsonb
);

create or replace function public.register_incident(
  p_user_id uuid,
  p_dorsal_number integer default null,
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
begin
  select *
  into v_profile
  from public.profiles
  where id = p_user_id;

  if not found and (p_user_email is null or trim(p_user_email) = '') then
    raise exception 'Profile not found and no fallback email provided';
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
    v_profile.id,
    coalesce(v_profile.email, p_user_email),
    p_dorsal_number,
    p_source,
    p_details
  )
  returning * into v_incident;

  return v_incident;
end;
$$;

do $$
declare
  v_register_incident regprocedure;
begin
  select p.oid::regprocedure
  into v_register_incident
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'register_incident'
  order by p.oid desc
  limit 1;

  if v_register_incident is null then
    raise exception 'register_incident function was not created';
  end if;

  execute format('grant execute on function %s to authenticated', v_register_incident);
  execute format('grant execute on function %s to service_role', v_register_incident);
end;
$$;
