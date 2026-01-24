-- ============================================================
-- Buffalo Markaz Signage - Supabase Database Schema
-- ============================================================
-- This schema provides persistent storage for all settings
-- Run this in Supabase SQL Editor to enable cloud persistence
-- ============================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. EXCEL SCHEDULE TABLE
-- Stores prayer times imported from Excel files
-- Supports year-round extrapolation logic
-- ============================================================
CREATE TABLE IF NOT EXISTS excel_schedule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL UNIQUE, -- YYYY-MM-DD format

    -- Fajr times
    fajr_start VARCHAR(20) NOT NULL,
    fajr_iqamah VARCHAR(20) NOT NULL,

    -- Dhuhr times
    dhuhr_start VARCHAR(20) NOT NULL,
    dhuhr_iqamah VARCHAR(20) NOT NULL,

    -- Asr times
    asr_start VARCHAR(20) NOT NULL,
    asr_iqamah VARCHAR(20) NOT NULL,

    -- Maghrib times
    maghrib_start VARCHAR(20) NOT NULL,
    maghrib_iqamah VARCHAR(20) NOT NULL,

    -- Isha times
    isha_start VARCHAR(20) NOT NULL,
    isha_iqamah VARCHAR(20) NOT NULL,

    -- Jumuah
    jumuah_start VARCHAR(20),
    jumuah_iqamah VARCHAR(20),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient date lookups
CREATE INDEX IF NOT EXISTS idx_excel_schedule_date ON excel_schedule(date);

-- Index for month-day lookups (for year-round extrapolation)
CREATE INDEX IF NOT EXISTS idx_excel_schedule_month_day ON excel_schedule(EXTRACT(MONTH FROM date), EXTRACT(DAY FROM date));

-- ============================================================
-- 2. MANUAL OVERRIDES TABLE
-- Stores user-defined date range overrides for specific prayers
-- ============================================================
CREATE TABLE IF NOT EXISTS manual_overrides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prayer_key VARCHAR(20) NOT NULL CHECK (prayer_key IN ('fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'jumuah')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time VARCHAR(20) NOT NULL,
    iqamah_time VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient date range queries
CREATE INDEX IF NOT EXISTS idx_manual_overrides_dates ON manual_overrides(start_date, end_date);

-- ============================================================
-- 3. ANNOUNCEMENT ITEMS TABLE
-- Stores ticker messages and alerts
-- ============================================================
CREATE TABLE IF NOT EXISTS announcement_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    text TEXT NOT NULL,
    color VARCHAR(7) NOT NULL, -- Hex color code
    animation VARCHAR(20) NOT NULL CHECK (animation IN ('none', 'pulse', 'blink')),
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 4. SLIDESHOW CONFIGURATION TABLE
-- Stores right panel slideshow settings
-- ============================================================
CREATE TABLE IF NOT EXISTS slideshow_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slide_id VARCHAR(100) NOT NULL UNIQUE,
    slide_type VARCHAR(20) NOT NULL CHECK (slide_type IN ('CLOCK', 'ANNOUNCEMENT', 'SCHEDULE')),
    enabled BOOLEAN NOT NULL DEFAULT true,
    duration INTEGER NOT NULL DEFAULT 10, -- Seconds
    display_order INTEGER NOT NULL DEFAULT 0,

    -- For ANNOUNCEMENT slides
    content TEXT,
    background_color VARCHAR(7),
    text_color VARCHAR(7),
    text_animation VARCHAR(20),
    font_size VARCHAR(20),

    -- For SCHEDULE slides
    days_to_show INTEGER,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 5. GLOBAL SETTINGS TABLE
-- Stores all other configuration values (single row)
-- ============================================================
CREATE TABLE IF NOT EXISTS global_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Theme settings
    theme VARCHAR(20) NOT NULL DEFAULT 'starry' CHECK (theme IN ('starry', 'arabesque', 'lattice')),
    ticker_bg VARCHAR(20) NOT NULL DEFAULT 'white' CHECK (ticker_bg IN ('white', 'navy')),

    -- Prayer time settings
    maghrib_offset INTEGER NOT NULL DEFAULT 10, -- Minutes

    -- Auto alert settings
    auto_alert_enabled BOOLEAN NOT NULL DEFAULT true,
    auto_alert_template TEXT NOT NULL DEFAULT '⚠️ NOTICE: Iqamah changes tomorrow for {prayers}',
    auto_alert_color VARCHAR(7) NOT NULL DEFAULT '#ef4444',
    auto_alert_animation VARCHAR(20) NOT NULL DEFAULT 'pulse',

    -- Mobile silent alert settings
    mobile_alert_enabled BOOLEAN NOT NULL DEFAULT false,
    mobile_alert_mode VARCHAR(20) NOT NULL DEFAULT 'panel' CHECK (mobile_alert_mode IN ('fullscreen', 'panel')),
    mobile_alert_trigger_minutes DECIMAL(3,1) NOT NULL DEFAULT 2.0,
    mobile_alert_background_color VARCHAR(7) NOT NULL DEFAULT '#0B1E3B',
    mobile_alert_text TEXT NOT NULL DEFAULT 'PRAYER STARTING SOON',
    mobile_alert_icon VARCHAR(20) NOT NULL DEFAULT 'phone-off',
    mobile_alert_animation VARCHAR(20) NOT NULL DEFAULT 'pulse',
    mobile_alert_beep_enabled BOOLEAN NOT NULL DEFAULT true,
    mobile_alert_beep_type VARCHAR(20) NOT NULL DEFAULT 'single',
    mobile_alert_beep_volume INTEGER NOT NULL DEFAULT 50,
    mobile_alert_disable_for_jumuah BOOLEAN NOT NULL DEFAULT true,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure only one row exists
    CONSTRAINT single_row CHECK (id = uuid_generate_v4())
);

-- Insert default settings row
INSERT INTO global_settings (theme, ticker_bg, maghrib_offset)
VALUES ('starry', 'white', 10)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 6. TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_excel_schedule_updated_at BEFORE UPDATE ON excel_schedule
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_manual_overrides_updated_at BEFORE UPDATE ON manual_overrides
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_announcement_items_updated_at BEFORE UPDATE ON announcement_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_slideshow_config_updated_at BEFORE UPDATE ON slideshow_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_global_settings_updated_at BEFORE UPDATE ON global_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 7. ROW LEVEL SECURITY (RLS) - OPTIONAL
-- Enable if you want to restrict access by user/organization
-- ============================================================
-- ALTER TABLE excel_schedule ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE manual_overrides ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE announcement_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE slideshow_config ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;

-- Example policy (adjust based on your auth setup):
-- CREATE POLICY "Allow public read access" ON excel_schedule FOR SELECT USING (true);
-- CREATE POLICY "Allow authenticated write" ON excel_schedule FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- 8. HELPER VIEWS
-- ============================================================

-- View for current active manual overrides
CREATE OR REPLACE VIEW active_manual_overrides AS
SELECT * FROM manual_overrides
WHERE CURRENT_DATE BETWEEN start_date AND end_date
ORDER BY start_date;

-- View for upcoming schedule (next 7 days from Excel)
CREATE OR REPLACE VIEW upcoming_schedule AS
SELECT * FROM excel_schedule
WHERE date >= CURRENT_DATE
ORDER BY date
LIMIT 7;

-- ============================================================
-- 9. SAMPLE QUERIES FOR INTEGRATION
-- ============================================================

-- Fetch all Excel schedule data:
-- SELECT * FROM excel_schedule ORDER BY date;

-- Fetch manual overrides:
-- SELECT * FROM manual_overrides ORDER BY start_date;

-- Fetch announcement items:
-- SELECT * FROM announcement_items ORDER BY display_order;

-- Fetch slideshow config:
-- SELECT * FROM slideshow_config ORDER BY display_order;

-- Fetch global settings:
-- SELECT * FROM global_settings LIMIT 1;

-- ============================================================
-- 10. BULK INSERT EXAMPLE (for Excel import)
-- ============================================================
-- INSERT INTO excel_schedule (date, fajr_start, fajr_iqamah, dhuhr_start, dhuhr_iqamah,
--                               asr_start, asr_iqamah, maghrib_start, maghrib_iqamah,
--                               isha_start, isha_iqamah, jumuah_iqamah)
-- VALUES
--     ('2026-01-01', '6:00 AM', '6:15 AM', '12:30 PM', '1:00 PM', '3:00 PM', '3:30 PM', '5:00 PM', '5:10 PM', '7:00 PM', '7:30 PM', '1:30 PM'),
--     ('2026-01-02', '6:00 AM', '6:15 AM', '12:31 PM', '1:00 PM', '3:01 PM', '3:30 PM', '5:01 PM', '5:11 PM', '7:01 PM', '7:30 PM', NULL)
-- ON CONFLICT (date) DO UPDATE SET
--     fajr_start = EXCLUDED.fajr_start,
--     fajr_iqamah = EXCLUDED.fajr_iqamah,
--     dhuhr_start = EXCLUDED.dhuhr_start,
--     dhuhr_iqamah = EXCLUDED.dhuhr_iqamah,
--     asr_start = EXCLUDED.asr_start,
--     asr_iqamah = EXCLUDED.asr_iqamah,
--     maghrib_start = EXCLUDED.maghrib_start,
--     maghrib_iqamah = EXCLUDED.maghrib_iqamah,
--     isha_start = EXCLUDED.isha_start,
--     isha_iqamah = EXCLUDED.isha_iqamah,
--     jumuah_iqamah = EXCLUDED.jumuah_iqamah;

-- ============================================================
-- END OF SCHEMA
-- ============================================================
