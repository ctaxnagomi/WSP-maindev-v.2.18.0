-- setup_rls_policies.sql
-- Centralized RLS policy setup for all tables
-- Run this after table creation scripts

-- Enable RLS on all tables
ALTER TABLE public.guest_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

-- Guest Pins policies
-- Note: Mutations only happen through validate_pin RPC function
DROP POLICY IF EXISTS "guest_pins_select" ON public.guest_pins;
CREATE POLICY "guest_pins_select" ON public.guest_pins
  FOR SELECT TO anon, authenticated USING (true);

-- Profiles policies
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Watchlist policies
DROP POLICY IF EXISTS "watchlist_select" ON public.watchlist;
DROP POLICY IF EXISTS "watchlist_insert" ON public.watchlist;
DROP POLICY IF EXISTS "watchlist_delete" ON public.watchlist;
DROP POLICY IF EXISTS "watchlist_update" ON public.watchlist;

CREATE POLICY "watchlist_select" ON public.watchlist
  FOR SELECT USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "watchlist_insert" ON public.watchlist
  FOR INSERT WITH CHECK (
    profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "watchlist_update" ON public.watchlist
  FOR UPDATE USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "watchlist_delete" ON public.watchlist
  FOR DELETE USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Grant base table permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.guest_pins TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.watchlist TO authenticated;