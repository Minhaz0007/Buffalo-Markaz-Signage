-- Migration: Add auto_alert_* columns to global_settings
-- Description: Ensures the auto-alert (prayer change ticker notification) columns exist
--              and have valid default values. Safe to run multiple times (idempotent).
-- Date: 2026-02-19

-- Step 1: Add columns if they don't already exist
ALTER TABLE global_settings
ADD COLUMN IF NOT EXISTS auto_alert_enabled BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE global_settings
ADD COLUMN IF NOT EXISTS auto_alert_template TEXT NOT NULL DEFAULT '⚠️ NOTICE: Iqamah changes tomorrow for {prayers}';

ALTER TABLE global_settings
ADD COLUMN IF NOT EXISTS auto_alert_color VARCHAR(7) NOT NULL DEFAULT '#ef4444';

ALTER TABLE global_settings
ADD COLUMN IF NOT EXISTS auto_alert_animation VARCHAR(20) NOT NULL DEFAULT 'pulse';

-- Step 2: Backfill any existing rows that have NULL in these columns
-- (This can happen if the row was inserted before the columns were added)
UPDATE global_settings
SET
  auto_alert_enabled  = COALESCE(auto_alert_enabled,  true),
  auto_alert_template = COALESCE(auto_alert_template, '⚠️ NOTICE: Iqamah changes tomorrow for {prayers}'),
  auto_alert_color    = COALESCE(auto_alert_color,    '#ef4444'),
  auto_alert_animation= COALESCE(auto_alert_animation,'pulse');

-- Step 3: Enable Realtime on global_settings so the frontend receives live updates
-- (Run this only once - it is safe to re-run)
ALTER PUBLICATION supabase_realtime ADD TABLE global_settings;
