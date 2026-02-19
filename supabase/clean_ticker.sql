
-- ============================================================
-- SQL Script to clean ONLY the announcement ticker
-- Run this in Supabase SQL Editor to clear all ticker items
-- ============================================================

DELETE FROM announcement_items;

-- If you also want to reset the auto-generated system alert settings (optional):
-- UPDATE global_settings SET
--    auto_alert_enabled = true,
--    auto_alert_template = '⚠️ NOTICE: Iqamah changes tomorrow for {prayers}',
--    auto_alert_color = '#ef4444',
--    auto_alert_animation = 'pulse'
-- WHERE id = (SELECT id FROM global_settings LIMIT 1);
