-- Migration: Make start-time columns nullable in excel_schedule
-- ============================================================
-- Run this in your Supabase SQL Editor.
--
-- WHY: The Markaz-format Excel file only contains iqamah times
-- (no Fajr/Dhuhr/Asr/Isha start times, no Maghrib iqamah).
-- The original schema marked all columns NOT NULL, which causes
-- a 400 error when the app tries to upsert rows with null start times.
--
-- Safe to run multiple times (DROP NOT NULL is idempotent).
-- ============================================================

ALTER TABLE public.excel_schedule
  ALTER COLUMN fajr_start     DROP NOT NULL,
  ALTER COLUMN dhuhr_start    DROP NOT NULL,
  ALTER COLUMN asr_start      DROP NOT NULL,
  ALTER COLUMN maghrib_start  DROP NOT NULL,
  ALTER COLUMN maghrib_iqamah DROP NOT NULL,
  ALTER COLUMN isha_start     DROP NOT NULL;

-- Verify the result — nullable columns will show 'YES' under is_nullable
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'excel_schedule'
ORDER BY ordinal_position;
