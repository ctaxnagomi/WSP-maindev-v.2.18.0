-- Setup for WSP Sessions Table and RPCs
-- Run this in your Supabase SQL editor (Dashboard > SQL Editor > New Query)
-- Assumes uuid-ossp extension is enabled (as in setup_guest_pins.sql)

-- Create wsp_sessions table
CREATE TABLE IF NOT EXISTS wsp_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,  -- Unique per session
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,    -- For registered users (nullable for guests)
  is_registered BOOLEAN DEFAULT FALSE,                         -- True if user_id is set (registered user?)
  start_timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  end_timestamp TIMESTAMP WITH TIME ZONE,                      -- Set on session close
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'expired')),  -- Session status
  login_type TEXT NOT NULL CHECK (login_type IN ('email', 'oauth_google', 'oauth_github', 'oauth_twitter', 'guest_pin')),  -- Categorize: login_form vs keypad_form
  guest_pin TEXT,                                              -- PIN used (if guest_pin type, else NULL)
  access_data JSONB DEFAULT '{}',                              -- Log metadata: {user_agent: "...", ip_address: "...", referrer: "...", device_type: "...", geolocation: {...}}
  total_visits INTEGER DEFAULT 1,                              -- Accumulate visits (increment on new session for same user)
  total_duration INTERVAL DEFAULT '0 seconds'                  -- Accumulate time spent (add per-session duration)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wsp_sessions_user_id ON wsp_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_wsp_sessions_session_id ON wsp_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_wsp_sessions_start_timestamp ON wsp_sessions(start_timestamp);
CREATE INDEX IF NOT EXISTS idx_wsp_sessions_login_type ON wsp_sessions(login_type);

-- Enable RLS for security
ALTER TABLE wsp_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts on re-run)
DROP POLICY IF EXISTS "Users can insert own sessions" ON wsp_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON wsp_sessions;
DROP POLICY IF EXISTS "Anon can insert guest sessions" ON wsp_sessions;

-- Policies
CREATE POLICY "Users can insert own sessions" ON wsp_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anon can insert guest sessions" ON wsp_sessions FOR INSERT TO anon WITH CHECK (user_id IS NULL AND is_registered = FALSE);
CREATE POLICY "Users can update own sessions" ON wsp_sessions FOR UPDATE TO authenticated, anon USING (auth.uid() = user_id OR user_id IS NULL);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON wsp_sessions TO anon, authenticated;

-- RPC to create session
CREATE OR REPLACE FUNCTION create_session(
  p_login_type TEXT,
  p_guest_pin TEXT DEFAULT NULL,
  p_access_data JSONB DEFAULT '{}'
)
RETURNS UUID  -- Returns session_id
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_session_id UUID;
  existing_user_visits INTEGER := 0;
  existing_duration_seconds NUMERIC := 0;
BEGIN
  -- For registered users, get existing totals from closed sessions
  IF auth.uid() IS NOT NULL THEN
    SELECT COALESCE(SUM(total_visits), 0), COALESCE(SUM(EXTRACT(EPOCH FROM total_duration)), 0)
    INTO existing_user_visits, existing_duration_seconds
    FROM wsp_sessions 
    WHERE user_id = auth.uid() AND status = 'closed';
  END IF;

  new_session_id := uuid_generate_v4();
  
  INSERT INTO wsp_sessions (
    session_id, user_id, is_registered, login_type, guest_pin, access_data,
    total_visits, total_duration
  ) VALUES (
    new_session_id, 
    auth.uid(), 
    auth.uid() IS NOT NULL, 
    p_login_type, 
    p_guest_pin, 
    p_access_data,
    existing_user_visits + 1, 
    (existing_duration_seconds * INTERVAL '1 second')
  );

  RETURN new_session_id;
END;
$$;

-- RPC to close session
CREATE OR REPLACE FUNCTION close_session(p_session_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_duration INTERVAL;
BEGIN
  SELECT (timezone('utc'::text, now()) - start_timestamp) INTO session_duration
  FROM wsp_sessions 
  WHERE session_id = p_session_id AND status = 'active'
    AND (user_id = auth.uid() OR user_id IS NULL);

  IF session_duration IS NOT NULL THEN
    UPDATE wsp_sessions
    SET 
      end_timestamp = timezone('utc'::text, now()),
      status = 'closed',
      total_duration = total_duration + session_duration
    WHERE session_id = p_session_id;
  END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_session(TEXT, TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION close_session(UUID) TO anon, authenticated;