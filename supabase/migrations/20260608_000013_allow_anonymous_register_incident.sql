-- Allow public signup flow to log incidents before authentication.

DO $$
DECLARE
  v_register_incident regprocedure;
BEGIN
  SELECT p.oid::regprocedure
  INTO v_register_incident
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'register_incident'
  ORDER BY p.oid DESC
  LIMIT 1;

  IF v_register_incident IS NULL THEN
    RAISE EXCEPTION 'register_incident function was not found';
  END IF;

  EXECUTE format('grant execute on function %s to anon', v_register_incident);
END;
$$;
