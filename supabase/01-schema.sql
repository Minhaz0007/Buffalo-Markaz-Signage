-- =====================================================
-- SUPABASE SCHEMA FOR BUFFALO MARKAZ SIGNAGE
-- =====================================================
-- This script creates all tables needed for real-time sync across devices
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. MAIN SETTINGS TABLE
-- =====================================================
-- Stores all app settings with JSONB for flexibility

CREATE TABLE IF NOT EXISTS mosque_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mosque_id TEXT DEFAULT 'buffalo-markaz' NOT NULL,
  setting_key TEXT NOT NULL,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(mosque_id, setting_key)
);

-- Add comments for documentation
COMMENT ON TABLE mosque_settings IS 'Stores all mosque signage settings with real-time sync';
COMMENT ON COLUMN mosque_settings.mosque_id IS 'Identifier for the mosque (allows multi-tenant future)';
COMMENT ON COLUMN mosque_settings.setting_key IS 'Setting name (e.g., app_theme, maghrib_offset)';
COMMENT ON COLUMN mosque_settings.setting_value IS 'JSONB value allowing any data structure';

-- =====================================================
-- 2. EXCEL SCHEDULE TABLE
-- =====================================================
-- Stores individual prayer time schedules by date

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

-- =====================================================
-- 3. MANUAL OVERRIDES TABLE
-- =====================================================
-- Stores manual prayer time overrides for date ranges

CREATE TABLE IF NOT EXISTS prayer_overrides (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mosque_id TEXT DEFAULT 'buffalo-markaz' NOT NULL,
  override_id TEXT NOT NULL, -- Client-side ID for matching
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

-- =====================================================
-- 4. ANNOUNCEMENTS TABLE
-- =====================================================
-- Stores announcement items for the ticker

CREATE TABLE IF NOT EXISTS announcements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mosque_id TEXT DEFAULT 'buffalo-markaz' NOT NULL,
  item_id TEXT NOT NULL, -- Client-side ID
  text TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#000000',
  animation TEXT NOT NULL DEFAULT 'none' CHECK (animation IN ('none', 'pulse', 'blink')),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(mosque_id, item_id)
);

COMMENT ON TABLE announcements IS 'Ticker announcement items';

-- =====================================================
-- 5. SLIDES CONFIGURATION TABLE
-- =====================================================
-- Stores slideshow slide configurations

CREATE TABLE IF NOT EXISTS slides (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mosque_id TEXT DEFAULT 'buffalo-markaz' NOT NULL,
  slide_id TEXT NOT NULL, -- Client-side ID
  slide_type TEXT NOT NULL CHECK (slide_type IN ('CLOCK', 'ANNOUNCEMENT', 'SCHEDULE')),
  enabled BOOLEAN DEFAULT true,
  duration INTEGER DEFAULT 10,
  display_order INTEGER DEFAULT 0,
  config JSONB DEFAULT '{}'::jsonb, -- Additional slide-specific config
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(mosque_id, slide_id)
);

COMMENT ON TABLE slides IS 'Slideshow configuration';
COMMENT ON COLUMN slides.config IS 'Slide-specific settings (content, styles, etc.)';

-- =====================================================
-- 6. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Settings table indexes
CREATE INDEX IF NOT EXISTS idx_settings_mosque_key ON mosque_settings(mosque_id, setting_key);
CREATE INDEX IF NOT EXISTS idx_settings_updated ON mosque_settings(updated_at DESC);

-- Prayer schedule indexes
CREATE INDEX IF NOT EXISTS idx_schedule_mosque_date ON prayer_schedule(mosque_id, date);
CREATE INDEX IF NOT EXISTS idx_schedule_date_range ON prayer_schedule(date);

-- Override indexes
CREATE INDEX IF NOT EXISTS idx_overrides_mosque ON prayer_overrides(mosque_id);
CREATE INDEX IF NOT EXISTS idx_overrides_date_range ON prayer_overrides(start_date, end_date);

-- Announcement indexes
CREATE INDEX IF NOT EXISTS idx_announcements_mosque ON announcements(mosque_id);
CREATE INDEX IF NOT EXISTS idx_announcements_order ON announcements(mosque_id, display_order);

-- Slides indexes
CREATE INDEX IF NOT EXISTS idx_slides_mosque ON slides(mosque_id);
CREATE INDEX IF NOT EXISTS idx_slides_order ON slides(mosque_id, display_order);

-- =====================================================
-- 7. AUTOMATIC UPDATED_AT TRIGGER
-- =====================================================

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables
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
