-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================
-- This script sets up security policies for all tables
-- Run this AFTER 01-schema.sql

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE mosque_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE slides ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLICIES FOR mosque_settings
-- =====================================================

-- Allow anonymous read access (for public displays)
CREATE POLICY "Allow public read access to settings"
  ON mosque_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow anonymous write access (for now - you can add auth later)
CREATE POLICY "Allow public insert to settings"
  ON mosque_settings
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update to settings"
  ON mosque_settings
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete from settings"
  ON mosque_settings
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- =====================================================
-- POLICIES FOR prayer_schedule
-- =====================================================

CREATE POLICY "Allow public read access to schedule"
  ON prayer_schedule
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert to schedule"
  ON prayer_schedule
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update to schedule"
  ON prayer_schedule
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete from schedule"
  ON prayer_schedule
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- =====================================================
-- POLICIES FOR prayer_overrides
-- =====================================================

CREATE POLICY "Allow public read access to overrides"
  ON prayer_overrides
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert to overrides"
  ON prayer_overrides
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update to overrides"
  ON prayer_overrides
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete from overrides"
  ON prayer_overrides
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- =====================================================
-- POLICIES FOR announcements
-- =====================================================

CREATE POLICY "Allow public read access to announcements"
  ON announcements
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert to announcements"
  ON announcements
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update to announcements"
  ON announcements
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete from announcements"
  ON announcements
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- =====================================================
-- POLICIES FOR slides
-- =====================================================

CREATE POLICY "Allow public read access to slides"
  ON slides
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert to slides"
  ON slides
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update to slides"
  ON slides
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete from slides"
  ON slides
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- =====================================================
-- NOTES ON SECURITY
-- =====================================================
--
-- CURRENT SETUP: Public access (no authentication required)
-- - Good for: Single mosque, trusted network, rapid deployment
-- - Risk: Anyone with your URL can modify settings
--
-- TO ADD AUTHENTICATION LATER:
-- 1. Remove "anon" from all policies above
-- 2. Set up Supabase Auth (email/password or magic link)
-- 3. Add user management in your app
-- 4. Update policies to check user roles
--
-- EXAMPLE AUTHENTICATED POLICY:
-- CREATE POLICY "Admins can write"
--   ON mosque_settings
--   FOR ALL
--   TO authenticated
--   USING (auth.jwt() ->> 'role' = 'admin');
--
-- =====================================================
