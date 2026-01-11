-- =====================================================
-- COMPLETE SUPABASE SETUP FOR BUFFALO MARKAZ SIGNAGE
-- =====================================================
-- COPY THIS ENTIRE FILE AND PASTE INTO SUPABASE SQL EDITOR
-- Then click "RUN" to execute everything at once
-- =====================================================

-- =====================================================
-- PART 1: SCHEMA - CREATE TABLES
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. MAIN SETTINGS TABLE
CREATE TABLE IF NOT EXISTS mosque_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mosque_id TEXT DEFAULT 'buffalo-markaz' NOT NULL,
  setting_key TEXT NOT NULL,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(mosque_id, setting_key)
);

COMMENT ON TABLE mosque_settings IS 'Stores all mosque signage settings with real-time sync';
COMMENT ON COLUMN mosque_settings.mosque_id IS 'Identifier for the mosque (allows multi-tenant future)';
COMMENT ON COLUMN mosque_settings.setting_key IS 'Setting name (e.g., app_theme, maghrib_offset)';
COMMENT ON COLUMN mosque_settings.setting_value IS 'JSONB value allowing any data structure';

-- 2. EXCEL SCHEDULE TABLE
CREATE TABLE IF NOT EXISTS prayer_schedule (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mosque_id TEXT DEFAULT 'buffalo-markaz' NOT NULL,
  date DATE NOT NULL,
  fajr_start TEXT NOT NULL,
  fajr_iqamah TEXT NOT NULL,
  dhuhr_start TEXT NOT NULL,
  dhuhr_iqamah TEXT NOT NULL,
  asr_start TEXT NOT NULL,
  asr_iqamah TEXT NOT NULL,
  maghrib_start TEXT NOT NULL,
  maghrib_iqamah TEXT NOT NULL,
  isha_start TEXT NOT NULL,
  isha_iqamah TEXT NOT NULL,
  jumuah_iqamah TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(mosque_id, date)
);

COMMENT ON TABLE prayer_schedule IS 'Daily prayer times from Excel uploads';

-- 3. MANUAL OVERRIDES TABLE
CREATE TABLE IF NOT EXISTS prayer_overrides (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mosque_id TEXT DEFAULT 'buffalo-markaz' NOT NULL,
  override_id TEXT NOT NULL,
  prayer_key TEXT NOT NULL CHECK (prayer_key IN ('fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'jumuah')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TEXT NOT NULL,
  iqamah_time TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(mosque_id, override_id)
);

COMMENT ON TABLE prayer_overrides IS 'Manual prayer time overrides for specific date ranges';

-- 4. ANNOUNCEMENTS TABLE
CREATE TABLE IF NOT EXISTS announcements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mosque_id TEXT DEFAULT 'buffalo-markaz' NOT NULL,
  item_id TEXT NOT NULL,
  text TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#000000',
  animation TEXT NOT NULL DEFAULT 'none' CHECK (animation IN ('none', 'pulse', 'blink')),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(mosque_id, item_id)
);

COMMENT ON TABLE announcements IS 'Ticker announcement items';

-- 5. SLIDES CONFIGURATION TABLE
CREATE TABLE IF NOT EXISTS slides (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mosque_id TEXT DEFAULT 'buffalo-markaz' NOT NULL,
  slide_id TEXT NOT NULL,
  slide_type TEXT NOT NULL CHECK (slide_type IN ('CLOCK', 'ANNOUNCEMENT', 'SCHEDULE')),
  enabled BOOLEAN DEFAULT true,
  duration INTEGER DEFAULT 10,
  display_order INTEGER DEFAULT 0,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(mosque_id, slide_id)
);

COMMENT ON TABLE slides IS 'Slideshow configuration';
COMMENT ON COLUMN slides.config IS 'Slide-specific settings (content, styles, etc.)';

-- CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_settings_mosque_key ON mosque_settings(mosque_id, setting_key);
CREATE INDEX IF NOT EXISTS idx_settings_updated ON mosque_settings(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_schedule_mosque_date ON prayer_schedule(mosque_id, date);
CREATE INDEX IF NOT EXISTS idx_schedule_date_range ON prayer_schedule(date);
CREATE INDEX IF NOT EXISTS idx_overrides_mosque ON prayer_overrides(mosque_id);
CREATE INDEX IF NOT EXISTS idx_overrides_date_range ON prayer_overrides(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_announcements_mosque ON announcements(mosque_id);
CREATE INDEX IF NOT EXISTS idx_announcements_order ON announcements(mosque_id, display_order);
CREATE INDEX IF NOT EXISTS idx_slides_mosque ON slides(mosque_id);
CREATE INDEX IF NOT EXISTS idx_slides_order ON slides(mosque_id, display_order);

-- AUTOMATIC UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_mosque_settings_updated_at
  BEFORE UPDATE ON mosque_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prayer_schedule_updated_at
  BEFORE UPDATE ON prayer_schedule
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prayer_overrides_updated_at
  BEFORE UPDATE ON prayer_overrides
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_slides_updated_at
  BEFORE UPDATE ON slides
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PART 2: SECURITY - ROW LEVEL SECURITY
-- =====================================================

-- ENABLE RLS ON ALL TABLES
ALTER TABLE mosque_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE slides ENABLE ROW LEVEL SECURITY;

-- POLICIES FOR mosque_settings
CREATE POLICY "Allow public read access to settings"
  ON mosque_settings FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow public insert to settings"
  ON mosque_settings FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow public update to settings"
  ON mosque_settings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow public delete from settings"
  ON mosque_settings FOR DELETE TO anon, authenticated USING (true);

-- POLICIES FOR prayer_schedule
CREATE POLICY "Allow public read access to schedule"
  ON prayer_schedule FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow public insert to schedule"
  ON prayer_schedule FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow public update to schedule"
  ON prayer_schedule FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow public delete from schedule"
  ON prayer_schedule FOR DELETE TO anon, authenticated USING (true);

-- POLICIES FOR prayer_overrides
CREATE POLICY "Allow public read access to overrides"
  ON prayer_overrides FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow public insert to overrides"
  ON prayer_overrides FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow public update to overrides"
  ON prayer_overrides FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow public delete from overrides"
  ON prayer_overrides FOR DELETE TO anon, authenticated USING (true);

-- POLICIES FOR announcements
CREATE POLICY "Allow public read access to announcements"
  ON announcements FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow public insert to announcements"
  ON announcements FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow public update to announcements"
  ON announcements FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow public delete from announcements"
  ON announcements FOR DELETE TO anon, authenticated USING (true);

-- POLICIES FOR slides
CREATE POLICY "Allow public read access to slides"
  ON slides FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow public insert to slides"
  ON slides FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow public update to slides"
  ON slides FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow public delete from slides"
  ON slides FOR DELETE TO anon, authenticated USING (true);

-- =====================================================
-- PART 3: REAL-TIME - ENABLE SUBSCRIPTIONS
-- =====================================================

-- ENABLE REAL-TIME FOR ALL TABLES
ALTER PUBLICATION supabase_realtime ADD TABLE mosque_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE prayer_schedule;
ALTER PUBLICATION supabase_realtime ADD TABLE prayer_overrides;
ALTER PUBLICATION supabase_realtime ADD TABLE announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE slides;

-- HELPER FUNCTIONS

-- Function to get all settings for a mosque
CREATE OR REPLACE FUNCTION get_all_settings(p_mosque_id TEXT DEFAULT 'buffalo-markaz')
RETURNS TABLE (
  setting_key TEXT,
  setting_value JSONB,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT ms.setting_key, ms.setting_value, ms.updated_at
  FROM mosque_settings ms
  WHERE ms.mosque_id = p_mosque_id
  ORDER BY ms.setting_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_all_settings IS 'Returns all settings for a mosque';

-- Function to upsert a setting
CREATE OR REPLACE FUNCTION upsert_setting(
  p_mosque_id TEXT,
  p_setting_key TEXT,
  p_setting_value JSONB
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO mosque_settings (mosque_id, setting_key, setting_value)
  VALUES (p_mosque_id, p_setting_key, p_setting_value)
  ON CONFLICT (mosque_id, setting_key)
  DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION upsert_setting IS 'Insert or update a setting value';

-- Function to get prayer schedule for a date range
CREATE OR REPLACE FUNCTION get_prayer_schedule(
  p_mosque_id TEXT DEFAULT 'buffalo-markaz',
  p_start_date DATE DEFAULT CURRENT_DATE,
  p_end_date DATE DEFAULT CURRENT_DATE + INTERVAL '30 days'
)
RETURNS TABLE (
  date DATE, fajr_start TEXT, fajr_iqamah TEXT,
  dhuhr_start TEXT, dhuhr_iqamah TEXT,
  asr_start TEXT, asr_iqamah TEXT,
  maghrib_start TEXT, maghrib_iqamah TEXT,
  isha_start TEXT, isha_iqamah TEXT, jumuah_iqamah TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT ps.date, ps.fajr_start, ps.fajr_iqamah,
    ps.dhuhr_start, ps.dhuhr_iqamah,
    ps.asr_start, ps.asr_iqamah,
    ps.maghrib_start, ps.maghrib_iqamah,
    ps.isha_start, ps.isha_iqamah, ps.jumuah_iqamah
  FROM prayer_schedule ps
  WHERE ps.mosque_id = p_mosque_id
    AND ps.date BETWEEN p_start_date AND p_end_date
  ORDER BY ps.date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_prayer_schedule IS 'Get prayer schedule for a date range';

-- Function to bulk insert prayer schedule
CREATE OR REPLACE FUNCTION bulk_insert_schedule(
  p_mosque_id TEXT,
  p_schedule JSONB
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_item JSONB;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_schedule)
  LOOP
    INSERT INTO prayer_schedule (
      mosque_id, date, fajr_start, fajr_iqamah,
      dhuhr_start, dhuhr_iqamah, asr_start, asr_iqamah,
      maghrib_start, maghrib_iqamah, isha_start, isha_iqamah, jumuah_iqamah
    ) VALUES (
      p_mosque_id, (v_item->>'date')::DATE,
      v_item->>'fajr_start', v_item->>'fajr_iqamah',
      v_item->>'dhuhr_start', v_item->>'dhuhr_iqamah',
      v_item->>'asr_start', v_item->>'asr_iqamah',
      v_item->>'maghrib_start', v_item->>'maghrib_iqamah',
      v_item->>'isha_start', v_item->>'isha_iqamah',
      v_item->>'jumuah_iqamah'
    )
    ON CONFLICT (mosque_id, date)
    DO UPDATE SET
      fajr_start = EXCLUDED.fajr_start, fajr_iqamah = EXCLUDED.fajr_iqamah,
      dhuhr_start = EXCLUDED.dhuhr_start, dhuhr_iqamah = EXCLUDED.dhuhr_iqamah,
      asr_start = EXCLUDED.asr_start, asr_iqamah = EXCLUDED.asr_iqamah,
      maghrib_start = EXCLUDED.maghrib_start, maghrib_iqamah = EXCLUDED.maghrib_iqamah,
      isha_start = EXCLUDED.isha_start, isha_iqamah = EXCLUDED.isha_iqamah,
      jumuah_iqamah = EXCLUDED.jumuah_iqamah, updated_at = NOW();
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION bulk_insert_schedule IS 'Bulk insert/update prayer schedule from Excel';

-- =====================================================
-- PART 4: SEED DATA (OPTIONAL - DEFAULT SETTINGS)
-- =====================================================

-- DEFAULT SETTINGS
INSERT INTO mosque_settings (mosque_id, setting_key, setting_value)
VALUES ('buffalo-markaz', 'app_theme', '"starry"'::jsonb)
ON CONFLICT (mosque_id, setting_key) DO NOTHING;

INSERT INTO mosque_settings (mosque_id, setting_key, setting_value)
VALUES ('buffalo-markaz', 'maghrib_offset', '10'::jsonb)
ON CONFLICT (mosque_id, setting_key) DO NOTHING;

INSERT INTO mosque_settings (mosque_id, setting_key, setting_value)
VALUES ('buffalo-markaz', 'ticker_bg', '"white"'::jsonb)
ON CONFLICT (mosque_id, setting_key) DO NOTHING;

INSERT INTO mosque_settings (mosque_id, setting_key, setting_value)
VALUES ('buffalo-markaz', 'auto_alert_settings', '{
  "enabled": true,
  "template": "⚠️ NOTICE: Iqamah changes tomorrow for {prayers}",
  "color": "#ef4444",
  "animation": "pulse"
}'::jsonb)
ON CONFLICT (mosque_id, setting_key) DO NOTHING;

INSERT INTO mosque_settings (mosque_id, setting_key, setting_value)
VALUES ('buffalo-markaz', 'mobile_alert_settings', '{
  "enabled": true,
  "mode": "panel",
  "triggerMinutes": 0.5,
  "backgroundColor": "#ef4444",
  "text": "Please silence your cell phones.",
  "icon": "phone-off",
  "animation": "pulse",
  "beepEnabled": true,
  "beepType": "single",
  "beepVolume": 75
}'::jsonb)
ON CONFLICT (mosque_id, setting_key) DO NOTHING;

INSERT INTO mosque_settings (mosque_id, setting_key, setting_value)
VALUES ('buffalo-markaz', 'announcement_title', '"ANNOUNCEMENTS"'::jsonb)
ON CONFLICT (mosque_id, setting_key) DO NOTHING;

-- DEFAULT ANNOUNCEMENTS
INSERT INTO announcements (mosque_id, item_id, text, color, animation, display_order)
VALUES
  ('buffalo-markaz', 'default-1', 'Please park responsibly.', '#000000', 'none', 1),
  ('buffalo-markaz', 'default-2', 'Do not block neighbor driveways during Jumuah prayer.', '#0B1E3B', 'pulse', 2),
  ('buffalo-markaz', 'default-3', 'Donate generously for the masjid construction.', '#000000', 'none', 3)
ON CONFLICT (mosque_id, item_id) DO NOTHING;

-- DEFAULT SLIDESHOW CONFIGURATION
INSERT INTO slides (mosque_id, slide_id, slide_type, enabled, duration, display_order, config)
VALUES (
  'buffalo-markaz', 'clock-main', 'CLOCK', true, 15, 1, '{}'::jsonb
)
ON CONFLICT (mosque_id, slide_id) DO NOTHING;

INSERT INTO slides (mosque_id, slide_id, slide_type, enabled, duration, display_order, config)
VALUES (
  'buffalo-markaz', 'special-announcement', 'ANNOUNCEMENT', false, 10, 2,
  '{
    "content": "Special Event Tonight!\\nJoin us for dinner after Isha.",
    "styles": {
      "backgroundColor": "#0B1E3B",
      "textColor": "#FFFFFF",
      "textAnimation": "gradient-flow",
      "fontSize": "large"
    }
  }'::jsonb
)
ON CONFLICT (mosque_id, slide_id) DO NOTHING;

INSERT INTO slides (mosque_id, slide_id, slide_type, enabled, duration, display_order, config)
VALUES (
  'buffalo-markaz', 'schedule-list', 'SCHEDULE', false, 10, 3,
  '{"daysToShow": 7}'::jsonb
)
ON CONFLICT (mosque_id, slide_id) DO NOTHING;

-- =====================================================
-- VERIFICATION - CHECK EVERYTHING WORKED
-- =====================================================

-- List all tables created
SELECT 'Tables Created:' as status;
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN (
  'mosque_settings', 'prayer_schedule', 'prayer_overrides', 'announcements', 'slides'
)
ORDER BY table_name;

-- Check real-time is enabled
SELECT 'Real-time Enabled:' as status;
SELECT tablename FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- Check seed data was inserted
SELECT 'Seed Data Inserted:' as status;
SELECT COUNT(*) as settings_count FROM mosque_settings;
SELECT COUNT(*) as announcements_count FROM announcements;
SELECT COUNT(*) as slides_count FROM slides;

-- =====================================================
-- SETUP COMPLETE! ✅
-- =====================================================
-- You should see:
-- - 5 tables created
-- - 5 tables with real-time enabled
-- - Settings, announcements, and slides populated
--
-- Next steps:
-- 1. Copy your Supabase URL and Anon Key
-- 2. Add them to Vercel environment variables
-- 3. Install: npm install @supabase/supabase-js
-- =====================================================
