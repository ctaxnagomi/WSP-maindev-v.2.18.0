-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create rate_limits table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  ip_address text PRIMARY KEY,
  count integer DEFAULT 0 NOT NULL,
  last_request timestamptz DEFAULT now() NOT NULL
);

-- Create auth_logs table  
CREATE TABLE IF NOT EXISTS public.auth_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  login_type text NOT NULL,
  access_data jsonb NOT NULL,
  qrggif_used boolean DEFAULT false NOT NULL,
  success boolean NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create qr_codes table
CREATE TABLE IF NOT EXISTS public.qr_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_name text,
  hash text NOT NULL UNIQUE,
  metadata jsonb,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  expiry_date timestamptz
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_qr_codes_hash ON public.qr_codes (hash);
CREATE INDEX IF NOT EXISTS idx_auth_logs_user ON public.auth_logs (user_id);