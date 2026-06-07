-- Allow a child to replace its current dorsal with a new one in a single RPC call.

create or replace function public.claim_dorsal(p_child_id uuid, p_dorsal_number smallint)
returns public.dorsal_assignments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.contest_settings%rowtype;
  v_child public.children%rowtype;
  v_dorsal public.dorsals%rowtype;
  v_assignment public.dorsal_assignments%rowtype;
  v_incident_status public.incident_status;
  v_incident_severity public.incident_severity;
  v_incident_kind text;
  v_incident_title text;
  v_incident_description text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into v_settings
  from public.contest_settings
  where id = 1;

  if not coalesce(v_settings.is_enabled, false)
     or v_settings.opens_at is null
     or v_settings.closes_at is null
     or now() < v_settings.opens_at
     or now() > v_settings.closes_at then
    raise exception 'Contest is closed';
  end if;

  select *
  into v_child
  from public.children
  where id = p_child_id;

  if not found then
    raise exception 'Child not found';
  end if;

  if v_child.parent_id <> auth.uid() and not public.is_admin() then
    raise exception 'Child does not belong to the current user';
  end if;

  select *
  into v_dorsal
  from public.dorsals
  where number = p_dorsal_number
  for update;

  if not found then
    raise exception 'Dorsal not found';
  end if;

  if v_dorsal.is_locked then
    raise exception 'Dorsal is locked';
  end if;

  if exists (
    select 1
    from public.dorsal_assignments
    where dorsal_number = p_dorsal_number
      and child_id <> p_child_id
  ) then
    raise exception 'Dorsal already assigned';
  end if;

  insert into public.dorsal_assignments (dorsal_number, child_id, assigned_by)
  values (p_dorsal_number, p_child_id, auth.uid())
  on conflict (child_id) do update
    set dorsal_number = excluded.dorsal_number,
        assigned_by = excluded.assigned_by,
        assigned_at = now(),
        updated_at = now()
  returning * into v_assignment;

  insert into public.assignment_attempts (parent_id, child_id, dorsal_number, success)
  values (auth.uid(), p_child_id, p_dorsal_number, true);

  return v_assignment;
exception
  when others then
    if sqlerrm = 'Contest is closed' then
      v_incident_kind := 'contest_closed';
      v_incident_status := 'pending';
      v_incident_severity := 'medium';
      v_incident_title := 'Intento fuera de ventana';
      v_incident_description := 'Se intentó asignar un dorsal cuando el concurso estaba cerrado.';
    elsif sqlerrm = 'Child not found' then
      v_incident_kind := 'child_missing';
      v_incident_status := 'review';
      v_incident_severity := 'medium';
      v_incident_title := 'Hijo no registrado';
      v_incident_description := 'La cuenta intentó resolver una asignación sin un hijo asociado.';
    elsif sqlerrm = 'Child does not belong to the current user' then
      v_incident_kind := 'ownership_mismatch';
      v_incident_status := 'review';
      v_incident_severity := 'high';
      v_incident_title := 'Hijo no vinculado al usuario';
      v_incident_description := 'La incidencia apunta a un menor que no pertenece a la cuenta activa.';
    elsif sqlerrm = 'Dorsal not found' then
      v_incident_kind := 'dorsal_missing';
      v_incident_status := 'review';
      v_incident_severity := 'medium';
      v_incident_title := 'Dorsal inexistente';
      v_incident_description := 'Se solicitó un dorsal que no existe en el catálogo.';
    elsif sqlerrm = 'Dorsal is locked' then
      v_incident_kind := 'dorsal_locked';
      v_incident_status := 'pending';
      v_incident_severity := 'low';
      v_incident_title := 'Dorsal bloqueado';
      v_incident_description := 'Se intentó reservar un dorsal bloqueado por la administración.';
    elsif sqlerrm = 'Dorsal already assigned' then
      v_incident_kind := 'duplicate_assignment';
      v_incident_status := 'review';
      v_incident_severity := 'high';
      v_incident_title := 'Dorsal ya asignado';
      v_incident_description := 'Dos intentos de reserva han chocado sobre el mismo dorsal.';
    else
      v_incident_kind := 'unexpected_error';
      v_incident_status := 'review';
      v_incident_severity := 'high';
      v_incident_title := 'Error en la asignación';
      v_incident_description := sqlerrm;
    end if;

    perform public.register_incident(
      auth.uid(),
      p_dorsal_number,
      v_incident_kind,
      v_incident_title,
      v_incident_description,
      v_incident_status,
      v_incident_severity,
      'claim_dorsal',
      jsonb_build_object(
        'child_id', p_child_id,
        'error', sqlerrm
      )
    );

    insert into public.assignment_attempts (parent_id, child_id, dorsal_number, success, failure_reason)
    values (auth.uid(), p_child_id, p_dorsal_number, false, sqlerrm);
    raise;
end;
$$;