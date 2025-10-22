-- setup_guest_pins.sql
-- Creates guest_pins table, inserts test pins, and provides an RPC to validate pins.
-- Paste this entire file into the Supabase SQL editor and run.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the guest_pins table
CREATE TABLE IF NOT EXISTS guest_pins (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  pin text UNIQUE NOT NULL,
  nickname text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at timestamptz DEFAULT timezone('utc'::text, now() + interval '24 hours'),
  last_used_at timestamptz
);

-- Ensure pin length is 5 characters
ALTER TABLE guest_pins
  ADD CONSTRAINT guest_pins_pin_length CHECK (char_length(pin) = 5);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_guest_pins_pin_active ON guest_pins(pin) WHERE active = true;

-- Enable Row Level Security
ALTER TABLE guest_pins ENABLE ROW LEVEL SECURITY;

-- Add RLS policy for SELECT access (needed for validate_pin RPC)
DROP POLICY IF EXISTS "Allow select for anon and authenticated on guest_pins" ON guest_pins;
CREATE POLICY "Allow select for anon and authenticated on guest_pins" ON guest_pins
  FOR SELECT TO anon, authenticated USING (true);

-- Test data: clear then insert a few pins that expire in 24 hours
TRUNCATE TABLE guest_pins RESTART IDENTITY;

INSERT INTO guest_pins (pin, active, expires_at) VALUES
('12345', true, timezone('utc'::text, now() + interval '24 hours')),
('54321', true, timezone('utc'::text, now() + interval '24 hours')),
('11111', true, timezone('utc'::text, now() + interval '24 hours'))
ON CONFLICT (pin) DO NOTHING;

-- RPC to validate a PIN and optionally set/update a nickname. Returns valid flag and message.
CREATE OR REPLACE FUNCTION validate_pin(
  pin_input text,
  nickname_input text DEFAULT NULL
)
RETURNS TABLE (
  valid boolean,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Basic validation: exact 5-digit length
  IF pin_input IS NULL OR char_length(pin_input) <> 5 THEN
    RETURN QUERY SELECT false, 'Invalid PIN format'::text;
    RETURN;
  END IF;

  -- Check existence, active flag and expiry
  IF EXISTS (
    SELECT 1 FROM guest_pins gp
    WHERE gp.pin = pin_input 
    AND gp.active = true
    AND (gp.expires_at IS NULL OR gp.expires_at > timezone('utc'::text, now()))
  ) THEN
    -- Update last_used_at and optionally store nickname (do not overwrite existing nickname if blank)
    UPDATE guest_pins
    SET last_used_at = timezone('utc'::text, now()),
        nickname = CASE 
          WHEN nickname_input IS NOT NULL AND char_length(trim(nickname_input)) > 0 
          THEN nickname_input 
          ELSE nickname 
        END
    WHERE pin = pin_input;

    RETURN QUERY SELECT true, 'PIN validated successfully'::text;
    RETURN;
  ELSE
    RETURN QUERY SELECT false, 'Invalid or expired PIN'::text;
    RETURN;
  END IF;
END;
$$;

-- Grant permissions so anon users can call the RPC and read the guest_pins table
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON guest_pins TO anon, authenticated;
GRANT EXECUTE ON FUNCTION validate_pin(text, text) TO anon, authenticated;

-- Helpful select to verify inserted pins (optional)
-- SELECT pin, active, expires_at, nickname FROM guest_pins;