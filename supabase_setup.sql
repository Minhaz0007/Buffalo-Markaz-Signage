-- ============================================================
-- Buffalo Markaz Signage — Complete Supabase Setup
-- Safe to run multiple times (fully idempotent)
-- ============================================================

-- ── Extensions ────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. EXCEL SCHEDULE ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.excel_schedule (
    date DATE PRIMARY KEY,
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_excel_schedule_date ON public.excel_schedule (date);
CREATE INDEX IF NOT EXISTS idx_excel_schedule_month_day
    ON public.excel_schedule (EXTRACT(MONTH FROM date), EXTRACT(DAY FROM date));

-- ── 2. MANUAL OVERRIDES ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.manual_overrides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prayer_key VARCHAR(20) NOT NULL CHECK (prayer_key IN ('fajr','dhuhr','asr','maghrib','isha','jumuah')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time VARCHAR(20) NOT NULL,
    iqamah_time VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_manual_overrides_dates ON public.manual_overrides (start_date, end_date);

-- ── 3. ANNOUNCEMENT ITEMS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.announcement_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    text TEXT NOT NULL,
    color VARCHAR(7) NOT NULL,
    animation VARCHAR(20) NOT NULL CHECK (animation IN ('none','pulse','blink')),
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── 4. SLIDESHOW CONFIG ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.slideshow_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slide_id VARCHAR(100) NOT NULL UNIQUE,
    slide_type VARCHAR(20) NOT NULL CHECK (slide_type IN ('CLOCK','ANNOUNCEMENT','SCHEDULE')),
    enabled BOOLEAN NOT NULL DEFAULT true,
    duration INTEGER NOT NULL DEFAULT 10,
    display_order INTEGER NOT NULL DEFAULT 0,
    content TEXT,
    background_color VARCHAR(7),
    text_color VARCHAR(7),
    text_animation VARCHAR(20),
    font_size VARCHAR(20),
    days_to_show INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── 5. GLOBAL SETTINGS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.global_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    theme VARCHAR(20) NOT NULL DEFAULT 'starry' CHECK (theme IN ('starry','arabesque','lattice')),
    ticker_bg VARCHAR(20) NOT NULL DEFAULT 'white' CHECK (ticker_bg IN ('white','navy')),
    maghrib_start_offset INTEGER NOT NULL DEFAULT 0,
    maghrib_offset INTEGER NOT NULL DEFAULT 20,
    sunrise_offset INTEGER,
    sunset_offset INTEGER,
    auto_alert_enabled BOOLEAN NOT NULL DEFAULT true,
    auto_alert_template TEXT NOT NULL DEFAULT '⚠️ NOTICE: Iqamah changes tomorrow for {prayers}',
    auto_alert_color VARCHAR(7) NOT NULL DEFAULT '#ef4444',
    auto_alert_animation VARCHAR(20) NOT NULL DEFAULT 'pulse',
    mobile_alert_enabled BOOLEAN NOT NULL DEFAULT false,
    mobile_alert_mode VARCHAR(20) NOT NULL DEFAULT 'panel' CHECK (mobile_alert_mode IN ('fullscreen','panel')),
    mobile_alert_trigger_minutes DECIMAL(3,1) NOT NULL DEFAULT 2.0,
    mobile_alert_background_color VARCHAR(7) NOT NULL DEFAULT '#0B1E3B',
    mobile_alert_text TEXT NOT NULL DEFAULT 'PRAYER STARTING SOON',
    mobile_alert_icon VARCHAR(20) NOT NULL DEFAULT 'phone-off',
    mobile_alert_animation VARCHAR(20) NOT NULL DEFAULT 'pulse',
    mobile_alert_beep_enabled BOOLEAN NOT NULL DEFAULT true,
    mobile_alert_beep_type VARCHAR(20) NOT NULL DEFAULT 'single',
    mobile_alert_beep_volume INTEGER NOT NULL DEFAULT 50,
    mobile_alert_disable_for_jumuah BOOLEAN NOT NULL DEFAULT true,
    fajr_isha_angle INTEGER NOT NULL DEFAULT 18 CHECK (fajr_isha_angle IN (15, 18)),
    hijri_month_name VARCHAR(50) DEFAULT NULL,
    hijri_month_number SMALLINT DEFAULT NULL,
    hijri_year INTEGER DEFAULT NULL,
    hijri_month_start_gregorian DATE DEFAULT NULL,
    hijri_month_length SMALLINT DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed the single settings row (skips if already exists)
INSERT INTO public.global_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ── 6. ADD ANY MISSING COLUMNS (migrations) ───────────────────
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS sunrise_offset INTEGER;
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS sunset_offset INTEGER;
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS auto_alert_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS auto_alert_template TEXT NOT NULL DEFAULT '⚠️ NOTICE: Iqamah changes tomorrow for {prayers}';
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS auto_alert_color VARCHAR(7) NOT NULL DEFAULT '#ef4444';
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS auto_alert_animation VARCHAR(20) NOT NULL DEFAULT 'pulse';
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS mobile_alert_disable_for_jumuah BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS fajr_isha_angle INTEGER NOT NULL DEFAULT 18 CHECK (fajr_isha_angle IN (15, 18));
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS hijri_month_name VARCHAR(50) DEFAULT NULL;
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS hijri_month_number SMALLINT DEFAULT NULL;
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS hijri_year INTEGER DEFAULT NULL;
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS hijri_month_start_gregorian DATE DEFAULT NULL;
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS hijri_month_length SMALLINT DEFAULT 30;

-- ── 7. UPDATED_AT TRIGGER ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_excel_schedule_updated_at      ON public.excel_schedule;
DROP TRIGGER IF EXISTS update_manual_overrides_updated_at    ON public.manual_overrides;
DROP TRIGGER IF EXISTS update_announcement_items_updated_at  ON public.announcement_items;
DROP TRIGGER IF EXISTS update_slideshow_config_updated_at    ON public.slideshow_config;
DROP TRIGGER IF EXISTS update_global_settings_updated_at     ON public.global_settings;

CREATE TRIGGER update_excel_schedule_updated_at     BEFORE UPDATE ON public.excel_schedule     FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_manual_overrides_updated_at   BEFORE UPDATE ON public.manual_overrides   FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_announcement_items_updated_at BEFORE UPDATE ON public.announcement_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_slideshow_config_updated_at   BEFORE UPDATE ON public.slideshow_config   FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_global_settings_updated_at    BEFORE UPDATE ON public.global_settings    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── 8. RLS POLICIES ───────────────────────────────────────────
ALTER TABLE public.excel_schedule      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_overrides    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slideshow_config    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_settings     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read excel_schedule"       ON public.excel_schedule;
DROP POLICY IF EXISTS "Allow public write excel_schedule"      ON public.excel_schedule;
DROP POLICY IF EXISTS "Allow public read manual_overrides"     ON public.manual_overrides;
DROP POLICY IF EXISTS "Allow public write manual_overrides"    ON public.manual_overrides;
DROP POLICY IF EXISTS "Allow public read announcement_items"   ON public.announcement_items;
DROP POLICY IF EXISTS "Allow public write announcement_items"  ON public.announcement_items;
DROP POLICY IF EXISTS "Allow public read slideshow_config"     ON public.slideshow_config;
DROP POLICY IF EXISTS "Allow public write slideshow_config"    ON public.slideshow_config;
DROP POLICY IF EXISTS "Allow public read global_settings"      ON public.global_settings;
DROP POLICY IF EXISTS "Allow public write global_settings"     ON public.global_settings;

CREATE POLICY "Allow public read excel_schedule"       ON public.excel_schedule      FOR SELECT USING (true);
CREATE POLICY "Allow public write excel_schedule"      ON public.excel_schedule      FOR ALL    USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read manual_overrides"     ON public.manual_overrides    FOR SELECT USING (true);
CREATE POLICY "Allow public write manual_overrides"    ON public.manual_overrides    FOR ALL    USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read announcement_items"   ON public.announcement_items  FOR SELECT USING (true);
CREATE POLICY "Allow public write announcement_items"  ON public.announcement_items  FOR ALL    USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read slideshow_config"     ON public.slideshow_config    FOR SELECT USING (true);
CREATE POLICY "Allow public write slideshow_config"    ON public.slideshow_config    FOR ALL    USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read global_settings"      ON public.global_settings     FOR SELECT USING (true);
CREATE POLICY "Allow public write global_settings"     ON public.global_settings     FOR ALL    USING (true) WITH CHECK (true);

-- ── 9. REALTIME PUBLICATION ───────────────────────────────────
ALTER TABLE public.excel_schedule      REPLICA IDENTITY FULL;
ALTER TABLE public.manual_overrides    REPLICA IDENTITY FULL;
ALTER TABLE public.announcement_items  REPLICA IDENTITY FULL;
ALTER TABLE public.slideshow_config    REPLICA IDENTITY FULL;
ALTER TABLE public.global_settings     REPLICA IDENTITY FULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='excel_schedule')
  THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.excel_schedule; END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='manual_overrides')
  THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.manual_overrides; END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='announcement_items')
  THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.announcement_items; END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='slideshow_config')
  THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.slideshow_config; END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='global_settings')
  THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.global_settings; END IF;
END $$;

-- ── 10. STORED FUNCTIONS (Excel atomic replace) ───────────────
CREATE OR REPLACE FUNCTION public.replace_excel_schedule(schedule_data JSONB)
RETURNS TABLE(success BOOLEAN, rows_affected INTEGER, error_message TEXT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE inserted_count INTEGER := 0;
BEGIN
    DELETE FROM public.excel_schedule;
    INSERT INTO public.excel_schedule (
        date, fajr_start, fajr_iqamah, dhuhr_start, dhuhr_iqamah,
        asr_start, asr_iqamah, maghrib_start, maghrib_iqamah,
        isha_start, isha_iqamah, jumuah_iqamah
    )
    SELECT
        (item->>'date')::DATE,
        item->>'fajr_start', item->>'fajr_iqamah',
        item->>'dhuhr_start', item->>'dhuhr_iqamah',
        item->>'asr_start', item->>'asr_iqamah',
        item->>'maghrib_start', item->>'maghrib_iqamah',
        item->>'isha_start', item->>'isha_iqamah',
        item->>'jumuah_iqamah'
    FROM jsonb_array_elements(schedule_data) AS item;
    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    RETURN QUERY SELECT true, inserted_count, NULL::TEXT;
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, 0, SQLERRM;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_excel_schedule_count()
RETURNS INTEGER LANGUAGE sql STABLE AS $$
    SELECT COUNT(*)::INTEGER FROM public.excel_schedule;
$$;

CREATE OR REPLACE FUNCTION public.get_excel_schedule_date_range()
RETURNS TABLE(min_date DATE, max_date DATE, total_days INTEGER)
LANGUAGE sql STABLE AS $$
    SELECT MIN(date), MAX(date), COUNT(*)::INTEGER FROM public.excel_schedule;
$$;

GRANT EXECUTE ON FUNCTION public.replace_excel_schedule(JSONB)    TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_excel_schedule_count()        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_excel_schedule_date_range()   TO anon, authenticated;

-- ── 11. VIEWS ─────────────────────────────────────────────────
-- DROP before CREATE OR REPLACE to avoid "cannot change name of view column" error
-- when the view already exists with a different column structure.
DROP VIEW IF EXISTS public.active_manual_overrides;
DROP VIEW IF EXISTS public.upcoming_schedule;

CREATE VIEW public.active_manual_overrides AS
SELECT * FROM public.manual_overrides
WHERE CURRENT_DATE BETWEEN start_date AND end_date ORDER BY start_date;

CREATE VIEW public.upcoming_schedule AS
SELECT * FROM public.excel_schedule
WHERE date >= CURRENT_DATE ORDER BY date LIMIT 7;

-- ── Done ──────────────────────────────────────────────────────
SELECT 'Setup complete' AS status;
