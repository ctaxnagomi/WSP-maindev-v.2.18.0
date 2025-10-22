-- setup_qr_admin.sql
-- Adds admin helper function to insert QRGGIF entries (server-side) using Supabase SQL

CREATE OR REPLACE FUNCTION insert_qr_code(
  _animation_hash text,
  _nickname text DEFAULT NULL,
  _expires_at timestamptz DEFAULT timezone('utc'::text, now() + interval '24 hours')
)
RETURNS SETOF qr_codes
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO qr_codes (animation_hash, nickname, expires_at)
  VALUES (_animation_hash, _nickname, _expires_at)
  RETURNING *;
END;
$$;

GRANT EXECUTE ON FUNCTION insert_qr_code(text, text, timestamptz) TO authenticated, anon;
