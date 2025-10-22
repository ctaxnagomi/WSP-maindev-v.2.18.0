-- setup_database.sql
-- Complete database setup script for Streaming Lokal App
-- Run this in your Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables
\i setup_guest_pins.sql
\i setup_profiles_watchlist.sql
\i setup_qr_auth.sql

-- Setup RLS policies
\i setup_rls_policies.sql

-- Verify setup
DO $$
BEGIN
  -- Check tables exist
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'guest_pins') THEN
    RAISE EXCEPTION 'guest_pins table not created';
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    RAISE EXCEPTION 'profiles table not created';
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'watchlist') THEN
    RAISE EXCEPTION 'watchlist table not created';
  END IF;

  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'qr_codes') THEN
    RAISE EXCEPTION 'qr_codes table not created';
  END IF;

  -- Check RLS is enabled
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'guest_pins' AND rowsecurity = true) THEN
    RAISE EXCEPTION 'RLS not enabled on guest_pins';
  END IF;

  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles' AND rowsecurity = true) THEN
    RAISE EXCEPTION 'RLS not enabled on profiles';
  END IF;

  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'watchlist' AND rowsecurity = true) THEN
    RAISE EXCEPTION 'RLS not enabled on watchlist';
  END IF;

  -- Check functions exist
  IF NOT EXISTS (SELECT FROM pg_proc WHERE proname = 'validate_pin') THEN
    RAISE EXCEPTION 'validate_pin function not created';
  END IF;

  IF NOT EXISTS (SELECT FROM pg_proc WHERE proname = 'handle_new_user') THEN
    RAISE EXCEPTION 'handle_new_user function not created';
  END IF;

  IF NOT EXISTS (SELECT FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    RAISE EXCEPTION 'update_updated_at_column function not created';
  END IF;

  IF NOT EXISTS (SELECT FROM pg_proc WHERE proname = 'validate_qr_code') THEN
    RAISE EXCEPTION 'validate_qr_code function not created';
  END IF;

  RAISE NOTICE 'Database setup completed successfully';
END $$;