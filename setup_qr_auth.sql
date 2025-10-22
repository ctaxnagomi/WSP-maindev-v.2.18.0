-- setup_qr_auth.sql
-- Creates tables and functions for animated QR code authentication
-- This is a preparation for future QR code authentication implementation

-- Create table for QR codes
CREATE TABLE IF NOT EXISTS public.qr_codes (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  code_data TEXT NOT NULL,
  animation_hash TEXT NOT NULL,  -- Hash of the animated GIF for validation
  frame_count INTEGER NOT NULL,  -- Number of frames in animation
  animation_duration INTEGER NOT NULL,  -- Duration in milliseconds
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at timestamptz DEFAULT timezone('utc'::text, now() + interval '24 hours'),
  last_used_at timestamptz,
  nickname text,
  metadata JSONB DEFAULT '{}'::jsonb  -- Store additional QR code metadata
);

-- Create unique index on animation hash
CREATE UNIQUE INDEX IF NOT EXISTS idx_qr_codes_animation_hash ON qr_codes(animation_hash) WHERE active = true;

-- Enable RLS
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;

-- Add RLS policy for SELECT access
CREATE POLICY "Allow select for anon and authenticated on qr_codes" ON qr_codes
  FOR SELECT TO anon, authenticated USING (true);

-- Function to validate animated QR code
CREATE OR REPLACE FUNCTION validate_qr_code(
  animation_hash_input text,
  frame_data jsonb DEFAULT NULL,  -- Contains frame validation data
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
  -- TO BE IMPLEMENTED:
  -- 1. Verify animation hash exists and is active
  -- 2. Validate frame sequence from captured animation
  -- 3. Check expiration
  -- 4. Update last_used_at and nickname if valid
  
  -- Placeholder return
  RETURN QUERY SELECT false, 'QR code validation not yet implemented'::text;
  RETURN;
END;
$$;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON qr_codes TO anon, authenticated;
GRANT EXECUTE ON FUNCTION validate_qr_code(text, jsonb, text) TO anon, authenticated;

-- Comments explaining the QR authentication process
COMMENT ON TABLE qr_codes IS 'Stores animated QR codes for authentication. Each code contains multiple frames that must be validated in sequence.';
COMMENT ON COLUMN qr_codes.animation_hash IS 'Secure hash of the complete animated GIF sequence';
COMMENT ON COLUMN qr_codes.frame_count IS 'Number of frames in the animated sequence - used for validation';
COMMENT ON COLUMN qr_codes.animation_duration IS 'Total duration of animation in milliseconds';
COMMENT ON COLUMN qr_codes.metadata IS 'Additional metadata about the QR code (e.g., allowed IP ranges, device restrictions)';

/*
Future Implementation Notes:

1. QR Code Generation:
   - Generate unique animated GIFs with encrypted frame sequences
   - Each frame contains part of the authentication data
   - Animation provides temporal security layer

2. Validation Process:
   - Client captures full animation sequence
   - Extracts and validates frame sequence
   - Checks temporal characteristics of animation
   - Verifies against stored hash and metadata

3. Security Considerations:
   - Animation prevents static QR code copying
   - Frame sequence adds temporal validation
   - Expiration prevents replay attacks
   - Metadata can add contextual security (IP, device, etc.)

4. Client Implementation:
   - Requires camera access
   - Animation frame capture capability
   - Optional: file upload for QR code images
   - Frame sequence analysis
*/