-- Migration: Add mobile_alert_disable_for_jumuah column
-- Description: Adds the option to disable mobile silent alert for Jumuah prayer
-- Date: 2026-01-24

-- Add the new column to the existing global_settings table
ALTER TABLE global_settings
ADD COLUMN IF NOT EXISTS mobile_alert_disable_for_jumuah BOOLEAN NOT NULL DEFAULT true;

-- Optional: Update existing rows to have the default value
UPDATE global_settings
SET mobile_alert_disable_for_jumuah = true
WHERE mobile_alert_disable_for_jumuah IS NULL;
