-- QRGGIF Expiration Management
-- Add expiration tracking columns
ALTER TABLE IF EXISTS public.qr_codes
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_validated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS expiration_minutes INTEGER DEFAULT 15 CHECK (expiration_minutes >= 15);

-- Function to validate QRGGIF and manage expiration
CREATE OR REPLACE FUNCTION public.validate_qrggif(
  p_animation_hash TEXT,
  p_expiration_minutes INTEGER DEFAULT 15
)
RETURNS TABLE (
  is_valid BOOLEAN,
  message TEXT,
  expires_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_qr_record RECORD;
  v_now TIMESTAMPTZ;
BEGIN
  -- Get current timestamp
  v_now := NOW();
  
  -- Validate expiration minutes
  IF p_expiration_minutes < 15 THEN
    p_expiration_minutes := 15; -- Enforce minimum 15 minutes
  END IF;
  
  -- Look up the QRGGIF
  SELECT * INTO v_qr_record 
  FROM public.qr_codes 
  WHERE animation_hash = p_animation_hash;
  
  -- Check if QRGGIF exists
  IF v_qr_record IS NULL THEN
    RETURN QUERY SELECT 
      FALSE,
      'Invalid QRGGIF code',
      NULL::TIMESTAMPTZ;
    RETURN;
  END IF;
  
  -- Update last validation time and expiration
  UPDATE public.qr_codes
  SET 
    last_validated_at = v_now,
    expires_at = v_now + (p_expiration_minutes || ' minutes')::INTERVAL,
    expiration_minutes = p_expiration_minutes
  WHERE animation_hash = p_animation_hash;
  
  -- Return success with expiration info
  RETURN QUERY SELECT 
    TRUE,
    'QRGGIF validated successfully',
    v_now + (p_expiration_minutes || ' minutes')::INTERVAL;
END;
$$;

-- Function to check QRGGIF status
CREATE OR REPLACE FUNCTION public.check_qrggif_status(
  p_animation_hash TEXT
)
RETURNS TABLE (
  is_valid BOOLEAN,
  message TEXT,
  expires_in_minutes INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_qr_record RECORD;
  v_now TIMESTAMPTZ;
BEGIN
  -- Get current timestamp
  v_now := NOW();
  
  -- Look up the QRGGIF
  SELECT * INTO v_qr_record 
  FROM public.qr_codes 
  WHERE animation_hash = p_animation_hash;
  
  -- Check if QRGGIF exists
  IF v_qr_record IS NULL THEN
    RETURN QUERY SELECT 
      FALSE,
      'Invalid QRGGIF code',
      0;
    RETURN;
  END IF;
  
  -- Check if never validated
  IF v_qr_record.last_validated_at IS NULL THEN
    RETURN QUERY SELECT 
      FALSE,
      'QRGGIF has not been validated',
      0;
    RETURN;
  END IF;
  
  -- Check expiration
  IF v_qr_record.expires_at IS NULL OR v_now > v_qr_record.expires_at THEN
    RETURN QUERY SELECT 
      FALSE,
      'QRGGIF has expired',
      0;
    RETURN;
  END IF;
  
  -- Calculate minutes remaining
  RETURN QUERY SELECT 
    TRUE,
    'QRGGIF is valid',
    EXTRACT(EPOCH FROM (v_qr_record.expires_at - v_now))/60::INTEGER;
END;
$$;

-- Example usage:
COMMENT ON FUNCTION public.validate_qrggif IS 
$doc$
Validates a QRGGIF and sets/updates its expiration time. Examples:

-- Validate with default 15 minute expiration:
SELECT * FROM validate_qrggif('abc123');

-- Validate with custom expiration (minimum 15 minutes):
SELECT * FROM validate_qrggif('abc123', 30);
$doc$;

COMMENT ON FUNCTION public.check_qrggif_status IS
$doc$
Checks the current status of a QRGGIF. Examples:

-- Check status and remaining time:
SELECT * FROM check_qrggif_status('abc123');
$doc$;