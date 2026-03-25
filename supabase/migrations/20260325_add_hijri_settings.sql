-- Migration: Add Hijri Date Settings to global_settings
-- Enables CHC (Central Hilal Committee of North America) anchor-based Hijri dates.
-- Admin sets the Islamic month name, year, the Gregorian start date, and month length
-- (29 or 30 days) once per month after the CHC moon-sighting announcement.
-- The app derives every Hijri date automatically from these four values.

ALTER TABLE global_settings
  ADD COLUMN IF NOT EXISTS hijri_month_name       VARCHAR(50)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS hijri_month_number     SMALLINT     DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS hijri_year             INTEGER      DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS hijri_month_start_gregorian DATE    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS hijri_month_length     SMALLINT     DEFAULT 30;

-- Verify
SELECT
  column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'global_settings'
  AND column_name LIKE 'hijri_%'
ORDER BY column_name;
