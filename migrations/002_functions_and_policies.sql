-- migrations/002_functions_and_policies.sql
-- Create RPC functions used by the Edge Function and enable example RLS policies

BEGIN;

-- validate_qrggif: checks incoming qrggif_data->>'hash' against qr_codes table
CREATE OR REPLACE FUNCTION public.validate_qrggif(p_qrggif_data jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_hash text := NULL;
  v_exists boolean := false;
BEGIN
  IF p_qrggif_data IS NULL THEN
    RETURN false;
  END IF;
  v_hash := (p_qrggif_data ->> 'hash');
  IF v_hash IS NULL OR length(trim(v_hash)) = 0 THEN
    RETURN false;
  END IF;
  SELECT EXISTS(
    SELECT 1 FROM public.qr_codes q
    WHERE q.hash = v_hash
      AND q.is_active = true
      AND (q.expiry_date IS NULL OR q.expiry_date > now())
  ) INTO v_exists;
  RETURN v_exists;
END;
$$;

-- create_session: minimal session stub that returns a JSON with a generated session id
CREATE OR REPLACE FUNCTION public.create_session(
  p_login_type text,
  p_guest_pin text,
  p_qrggif_data jsonb,
  p_access_data jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id uuid := gen_random_uuid();
  v_result jsonb;
BEGIN
  v_result := jsonb_build_object(
    'session_id', v_session_id::text,
    'login_type', p_login_type,
    'created_at', now()
  );
  RETURN v_result;
END;
$$;

-- Enable Row Level Security and example policies
-- auth_logs: allow authenticated users to insert logs
ALTER TABLE public.auth_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_logs_insert_authenticated" ON public.auth_logs;
CREATE POLICY "auth_logs_insert_authenticated" ON public.auth_logs
FOR INSERT
WITH CHECK ( auth.role() = 'authenticated' );

-- qr_codes: enable RLS; public can SELECT (read) but only authenticated can modify
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "qr_codes_select_public" ON public.qr_codes;
CREATE POLICY "qr_codes_select_public" ON public.qr_codes
FOR SELECT
USING ( true );

DROP POLICY IF EXISTS "qr_codes_insert_authenticated" ON public.qr_codes;
CREATE POLICY "qr_codes_insert_authenticated" ON public.qr_codes
FOR INSERT
WITH CHECK ( auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "qr_codes_update_authenticated" ON public.qr_codes;
CREATE POLICY "qr_codes_update_authenticated" ON public.qr_codes
FOR UPDATE
USING ( auth.role() = 'authenticated' )
WITH CHECK ( auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "qr_codes_delete_authenticated" ON public.qr_codes;
CREATE POLICY "qr_codes_delete_authenticated" ON public.qr_codes
FOR DELETE
USING ( auth.role() = 'authenticated' );

-- rate_limits: enable RLS; allow authenticated users to insert/update
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rate_limits_insert_authenticated" ON public.rate_limits;
CREATE POLICY "rate_limits_insert_authenticated" ON public.rate_limits
FOR INSERT
WITH CHECK ( auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "rate_limits_update_authenticated" ON public.rate_limits;
CREATE POLICY "rate_limits_update_authenticated" ON public.rate_limits
FOR UPDATE
USING ( auth.role() = 'authenticated' )
WITH CHECK ( auth.role() = 'authenticated' );

COMMIT;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.qr_codes TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_qrggif(jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_session(text, text, jsonb, jsonb) TO anon, authenticated;