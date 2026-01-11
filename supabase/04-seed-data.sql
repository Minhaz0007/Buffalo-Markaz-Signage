-- =====================================================
-- SEED DATA (OPTIONAL)
-- =====================================================
-- This script populates the database with default values
-- Run this AFTER 03-realtime.sql
-- OPTIONAL: Only run if you want to start with default settings

-- =====================================================
-- DEFAULT SETTINGS
-- =====================================================

-- Theme setting
INSERT INTO mosque_settings (mosque_id, setting_key, setting_value)
VALUES ('buffalo-markaz', 'app_theme', '"starry"'::jsonb)
ON CONFLICT (mosque_id, setting_key) DO NOTHING;

-- Maghrib offset (in minutes)
INSERT INTO mosque_settings (mosque_id, setting_key, setting_value)
VALUES ('buffalo-markaz', 'maghrib_offset', '10'::jsonb)
ON CONFLICT (mosque_id, setting_key) DO NOTHING;

-- Ticker background
INSERT INTO mosque_settings (mosque_id, setting_key, setting_value)
VALUES ('buffalo-markaz', 'ticker_bg', '"white"'::jsonb)
ON CONFLICT (mosque_id, setting_key) DO NOTHING;

-- Auto alert settings
INSERT INTO mosque_settings (mosque_id, setting_key, setting_value)
VALUES ('buffalo-markaz', 'auto_alert_settings', '{
  "enabled": true,
  "template": "⚠️ NOTICE: Iqamah changes tomorrow for {prayers}",
  "color": "#ef4444",
  "animation": "pulse"
}'::jsonb)
ON CONFLICT (mosque_id, setting_key) DO NOTHING;

-- Mobile alert settings
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

-- Announcement title
INSERT INTO mosque_settings (mosque_id, setting_key, setting_value)
VALUES ('buffalo-markaz', 'announcement_title', '"ANNOUNCEMENTS"'::jsonb)
ON CONFLICT (mosque_id, setting_key) DO NOTHING;

-- =====================================================
-- DEFAULT ANNOUNCEMENTS
-- =====================================================

INSERT INTO announcements (mosque_id, item_id, text, color, animation, display_order)
VALUES
  ('buffalo-markaz', 'default-1', 'Please park responsibly.', '#000000', 'none', 1),
  ('buffalo-markaz', 'default-2', 'Do not block neighbor driveways during Jumuah prayer.', '#0B1E3B', 'pulse', 2),
  ('buffalo-markaz', 'default-3', 'Donate generously for the masjid construction.', '#000000', 'none', 3)
ON CONFLICT (mosque_id, item_id) DO NOTHING;

-- =====================================================
-- DEFAULT SLIDESHOW CONFIGURATION
-- =====================================================

-- Clock slide (always enabled)
INSERT INTO slides (mosque_id, slide_id, slide_type, enabled, duration, display_order, config)
VALUES (
  'buffalo-markaz',
  'clock-main',
  'CLOCK',
  true,
  15,
  1,
  '{}'::jsonb
)
ON CONFLICT (mosque_id, slide_id) DO NOTHING;

-- Special announcement slide (disabled by default)
INSERT INTO slides (mosque_id, slide_id, slide_type, enabled, duration, display_order, config)
VALUES (
  'buffalo-markaz',
  'special-announcement',
  'ANNOUNCEMENT',
  false,
  10,
  2,
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

-- Schedule slide (disabled by default)
INSERT INTO slides (mosque_id, slide_id, slide_type, enabled, duration, display_order, config)
VALUES (
  'buffalo-markaz',
  'schedule-list',
  'SCHEDULE',
  false,
  10,
  3,
  '{
    "daysToShow": 7
  }'::jsonb
)
ON CONFLICT (mosque_id, slide_id) DO NOTHING;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check all settings
-- SELECT setting_key, setting_value FROM mosque_settings WHERE mosque_id = 'buffalo-markaz';

-- Check announcements
-- SELECT item_id, text, color, animation FROM announcements WHERE mosque_id = 'buffalo-markaz' ORDER BY display_order;

-- Check slides
-- SELECT slide_id, slide_type, enabled, duration FROM slides WHERE mosque_id = 'buffalo-markaz' ORDER BY display_order;
