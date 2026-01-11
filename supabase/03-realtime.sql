-- =====================================================
-- REAL-TIME SUBSCRIPTIONS SETUP
-- =====================================================
-- This script enables real-time updates for all tables
-- Run this AFTER 02-security.sql

-- =====================================================
-- ENABLE REAL-TIME FOR ALL TABLES
-- =====================================================

-- Enable real-time for mosque_settings
ALTER PUBLICATION supabase_realtime ADD TABLE mosque_settings;

-- Enable real-time for prayer_schedule
ALTER PUBLICATION supabase_realtime ADD TABLE prayer_schedule;

-- Enable real-time for prayer_overrides
ALTER PUBLICATION supabase_realtime ADD TABLE prayer_overrides;

-- Enable real-time for announcements
ALTER PUBLICATION supabase_realtime ADD TABLE announcements;

-- Enable real-time for slides
ALTER PUBLICATION supabase_realtime ADD TABLE slides;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get all settings for a mosque
CREATE OR REPLACE FUNCTION get_all_settings(p_mosque_id TEXT DEFAULT 'buffalo-markaz')
RETURNS TABLE (
  setting_key TEXT,
  setting_value JSONB,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ms.setting_key,
    ms.setting_value,
    ms.updated_at
  FROM mosque_settings ms
  WHERE ms.mosque_id = p_mosque_id
  ORDER BY ms.setting_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_all_settings IS 'Returns all settings for a mosque';

-- Function to upsert (insert or update) a setting
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
  DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    updated_at = NOW()
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
  date DATE,
  fajr_start TEXT,
  fajr_iqamah TEXT,
  dhuhr_start TEXT,
  dhuhr_iqamah TEXT,
  asr_start TEXT,
  asr_iqamah TEXT,
  maghrib_start TEXT,
  maghrib_iqamah TEXT,
  isha_start TEXT,
  isha_iqamah TEXT,
  jumuah_iqamah TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ps.date,
    ps.fajr_start,
    ps.fajr_iqamah,
    ps.dhuhr_start,
    ps.dhuhr_iqamah,
    ps.asr_start,
    ps.asr_iqamah,
    ps.maghrib_start,
    ps.maghrib_iqamah,
    ps.isha_start,
    ps.isha_iqamah,
    ps.jumuah_iqamah
  FROM prayer_schedule ps
  WHERE ps.mosque_id = p_mosque_id
    AND ps.date BETWEEN p_start_date AND p_end_date
  ORDER BY ps.date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_prayer_schedule IS 'Get prayer schedule for a date range';

-- Function to bulk insert prayer schedule (for Excel uploads)
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
      mosque_id, date,
      fajr_start, fajr_iqamah,
      dhuhr_start, dhuhr_iqamah,
      asr_start, asr_iqamah,
      maghrib_start, maghrib_iqamah,
      isha_start, isha_iqamah,
      jumuah_iqamah
    ) VALUES (
      p_mosque_id,
      (v_item->>'date')::DATE,
      v_item->>'fajr_start',
      v_item->>'fajr_iqamah',
      v_item->>'dhuhr_start',
      v_item->>'dhuhr_iqamah',
      v_item->>'asr_start',
      v_item->>'asr_iqamah',
      v_item->>'maghrib_start',
      v_item->>'maghrib_iqamah',
      v_item->>'isha_start',
      v_item->>'isha_iqamah',
      v_item->>'jumuah_iqamah'
    )
    ON CONFLICT (mosque_id, date)
    DO UPDATE SET
      fajr_start = EXCLUDED.fajr_start,
      fajr_iqamah = EXCLUDED.fajr_iqamah,
      dhuhr_start = EXCLUDED.dhuhr_start,
      dhuhr_iqamah = EXCLUDED.dhuhr_iqamah,
      asr_start = EXCLUDED.asr_start,
      asr_iqamah = EXCLUDED.asr_iqamah,
      maghrib_start = EXCLUDED.maghrib_start,
      maghrib_iqamah = EXCLUDED.maghrib_iqamah,
      isha_start = EXCLUDED.isha_start,
      isha_iqamah = EXCLUDED.isha_iqamah,
      jumuah_iqamah = EXCLUDED.jumuah_iqamah,
      updated_at = NOW();

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION bulk_insert_schedule IS 'Bulk insert/update prayer schedule from Excel';

-- =====================================================
-- VERIFY REAL-TIME IS ENABLED
-- =====================================================

-- Query to check which tables have real-time enabled
-- Run this to verify:
-- SELECT schemaname, tablename
-- FROM pg_publication_tables
-- WHERE pubname = 'supabase_realtime';
