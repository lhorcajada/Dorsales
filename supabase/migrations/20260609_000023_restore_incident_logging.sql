-- Restore and complete incident logging for all dorsal claim/reserve/release operations.
-- This migration fixes the loss of incident logging that occurred in 000008_dorsal_selection_lock.sql

-- ============================================================================
-- 1. Update claim_dorsal to restore incident logging
-- ============================================================================
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
     or coalesce(v_settings.is_paused, false)
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

  if v_dorsal.is_locked and (
    v_dorsal.locked_by_parent_id is distinct from auth.uid()
    or v_dorsal.locked_by_child_id is distinct from p_child_id
  ) then
    if v_dorsal.locked_reason is not null and v_dorsal.locked_reason <> '' then
      raise exception 'El dorsal ya ha sido seleccionado por %', v_dorsal.locked_reason;
    end if;

    raise exception 'El dorsal ya ha sido seleccionado por otro usuario';
  end if;

  if exists (
    select 1
    from public.dorsal_assignments
    where dorsal_number = p_dorsal_number
  ) then
    raise exception 'Dorsal already assigned';
  end if;

  if exists (
    select 1
    from public.dorsal_assignments
    where child_id = p_child_id
  ) then
    raise exception 'Child already has a dorsal';
  end if;

  insert into public.dorsal_assignments (dorsal_number, child_id, assigned_by)
  values (p_dorsal_number, p_child_id, auth.uid())
  returning * into v_assignment;

  update public.dorsals
  set is_locked = false,
      locked_reason = null,
      locked_by_parent_id = null,
      locked_by_child_id = null,
      locked_at = null,
      updated_at = now()
  where number = p_dorsal_number;

  insert into public.assignment_attempts (parent_id, child_id, dorsal_number, success)
  values (auth.uid(), p_child_id, p_dorsal_number, true);

  return v_assignment;
exception
  when others then
    -- Determine incident classification
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
      v_incident_description := 'Se intentó asignar un dorsal bloqueado por la administración.';
    elsif sqlerrm like 'El dorsal ya ha sido seleccionado por%' then
      v_incident_kind := 'dorsal_already_reserved';
      v_incident_status := 'pending';
      v_incident_severity := 'low';
      v_incident_title := 'Dorsal ya reservado';
      v_incident_description := 'Se intentó asignar un dorsal que otro usuario tenía seleccionado.';
    elsif sqlerrm = 'Dorsal already assigned' then
      v_incident_kind := 'duplicate_assignment';
      v_incident_status := 'review';
      v_incident_severity := 'high';
      v_incident_title := 'Dorsal ya asignado';
      v_incident_description := 'Dos intentos de reserva han chocado sobre el mismo dorsal.';
    elsif sqlerrm = 'Child already has a dorsal' then
      v_incident_kind := 'duplicate_child_assignment';
      v_incident_status := 'review';
      v_incident_severity := 'high';
      v_incident_title := 'El menor ya tiene dorsal';
      v_incident_description := 'Se intentó asignar más de un dorsal al mismo menor.';
    else
      v_incident_kind := 'unexpected_error';
      v_incident_status := 'review';
      v_incident_severity := 'high';
      v_incident_title := 'Error en la asignación';
      v_incident_description := sqlerrm;
    end if;

    -- Register incident
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

    -- Record failed attempt
    insert into public.assignment_attempts (parent_id, child_id, dorsal_number, success, failure_reason)
    values (auth.uid(), p_child_id, p_dorsal_number, false, sqlerrm);
    
    raise;
end;
$$;

-- ============================================================================
-- 2. Add incident logging to reserve_dorsal
-- ============================================================================
create or replace function public.reserve_dorsal(p_child_id uuid, p_dorsal_number smallint)
returns public.dorsals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.contest_settings%rowtype;
  v_child public.children%rowtype;
  v_dorsal public.dorsals%rowtype;
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
     or coalesce(v_settings.is_paused, false)
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

  if exists (
    select 1
    from public.dorsal_assignments
    where dorsal_number = p_dorsal_number
  ) then
    raise exception 'Dorsal already assigned';
  end if;

  if v_dorsal.is_locked and (
    v_dorsal.locked_by_parent_id is distinct from auth.uid()
    or v_dorsal.locked_by_child_id is distinct from p_child_id
  ) then
    if v_dorsal.locked_reason is not null and v_dorsal.locked_reason <> '' then
      raise exception 'El dorsal ya ha sido seleccionado por %', v_dorsal.locked_reason;
    end if;

    raise exception 'El dorsal ya ha sido seleccionado por otro usuario';
  end if;

  update public.dorsals
  set is_locked = true,
      locked_reason = v_child.full_name,
      locked_by_parent_id = auth.uid(),
      locked_by_child_id = p_child_id,
      locked_at = now(),
      updated_at = now()
  where number = p_dorsal_number
  returning * into v_dorsal;

  return v_dorsal;
exception
  when others then
    -- Determine incident classification
    if sqlerrm = 'Contest is closed' then
      v_incident_kind := 'contest_closed';
      v_incident_status := 'pending';
      v_incident_severity := 'medium';
      v_incident_title := 'Intento de reserva fuera de ventana';
      v_incident_description := 'Se intentó reservar un dorsal cuando el concurso estaba cerrado.';
    elsif sqlerrm = 'Child not found' then
      v_incident_kind := 'child_missing';
      v_incident_status := 'review';
      v_incident_severity := 'medium';
      v_incident_title := 'Hijo no registrado en reserva';
      v_incident_description := 'Se intentó reservar un dorsal para un hijo no registrado.';
    elsif sqlerrm = 'Child does not belong to the current user' then
      v_incident_kind := 'ownership_mismatch';
      v_incident_status := 'review';
      v_incident_severity := 'high';
      v_incident_title := 'Intento de reserva de dorsal no autorizado';
      v_incident_description := 'Se intentó reservar un dorsal para un hijo de otra cuenta.';
    elsif sqlerrm = 'Dorsal not found' then
      v_incident_kind := 'dorsal_missing';
      v_incident_status := 'review';
      v_incident_severity := 'medium';
      v_incident_title := 'Intento de reserva de dorsal inexistente';
      v_incident_description := 'Se intentó reservar un dorsal que no existe.';
    elsif sqlerrm = 'Dorsal already assigned' then
      v_incident_kind := 'dorsal_already_assigned';
      v_incident_status := 'review';
      v_incident_severity := 'medium';
      v_incident_title := 'Dorsal ya tiene asignación permanente';
      v_incident_description := 'Se intentó reservar un dorsal que ya está permanentemente asignado.';
    elsif sqlerrm like 'El dorsal ya ha sido seleccionado por%' then
      v_incident_kind := 'dorsal_already_reserved';
      v_incident_status := 'pending';
      v_incident_severity := 'low';
      v_incident_title := 'Dorsal ya reservado por otro usuario';
      v_incident_description := 'Se intentó reservar un dorsal que otro usuario ya tiene seleccionado.';
    else
      v_incident_kind := 'unexpected_error';
      v_incident_status := 'review';
      v_incident_severity := 'high';
      v_incident_title := 'Error inesperado en reserva';
      v_incident_description := sqlerrm;
    end if;

    -- Register incident
    perform public.register_incident(
      auth.uid(),
      p_dorsal_number,
      v_incident_kind,
      v_incident_title,
      v_incident_description,
      v_incident_status,
      v_incident_severity,
      'reserve_dorsal',
      jsonb_build_object(
        'child_id', p_child_id,
        'error', sqlerrm
      )
    );

    raise;
end;
$$;

-- ============================================================================
-- 3. Add incident logging to release_dorsal_lock
-- ============================================================================
create or replace function public.release_dorsal_lock(p_dorsal_number smallint)
returns public.dorsals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dorsal public.dorsals%rowtype;
  v_incident_kind text;
  v_incident_status public.incident_status;
  v_incident_severity public.incident_severity;
  v_incident_title text;
  v_incident_description text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into v_dorsal
  from public.dorsals
  where number = p_dorsal_number
  for update;

  if not found then
    raise exception 'Dorsal not found';
  end if;

  if not v_dorsal.is_locked then
    return v_dorsal;
  end if;

  if v_dorsal.locked_by_parent_id is distinct from auth.uid() and not public.is_admin() then
    raise exception 'El dorsal ha sido seleccionado por otro usuario';
  end if;

  update public.dorsals
  set is_locked = false,
      locked_reason = null,
      locked_by_parent_id = null,
      locked_by_child_id = null,
      locked_at = null,
      updated_at = now()
  where number = p_dorsal_number
  returning * into v_dorsal;

  return v_dorsal;
exception
  when others then
    -- Determine incident classification
    if sqlerrm = 'Dorsal not found' then
      v_incident_kind := 'dorsal_missing';
      v_incident_status := 'review';
      v_incident_severity := 'medium';
      v_incident_title := 'Intento de liberar dorsal inexistente';
      v_incident_description := 'Se intentó liberar un dorsal que no existe.';
    elsif sqlerrm = 'El dorsal ha sido seleccionado por otro usuario' then
      v_incident_kind := 'unauthorized_release';
      v_incident_status := 'review';
      v_incident_severity := 'high';
      v_incident_title := 'Intento no autorizado de liberar dorsal';
      v_incident_description := 'Un usuario intentó liberar un dorsal seleccionado por otro usuario.';
    else
      v_incident_kind := 'unexpected_error';
      v_incident_status := 'review';
      v_incident_severity := 'high';
      v_incident_title := 'Error inesperado al liberar dorsal';
      v_incident_description := sqlerrm;
    end if;

    -- Register incident (without dorsal reference for some errors)
    perform public.register_incident(
      auth.uid(),
      p_dorsal_number,
      v_incident_kind,
      v_incident_title,
      v_incident_description,
      v_incident_status,
      v_incident_severity,
      'release_dorsal_lock',
      jsonb_build_object(
        'error', sqlerrm
      )
    );

    raise;
end;
$$;
