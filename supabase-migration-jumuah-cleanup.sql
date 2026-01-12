-- Migration: Clean up Jumu'ah columns in excel_schedule table
-- Run this in Supabase SQL Editor
--
-- CONTEXT:
-- - Jumu'ah start time now ALWAYS uses Dhuhr start time (not stored separately)
-- - Only Jumu'ah iqamah is stored in the database (can be overridden via Excel/manual)
-- - This migration removes the unused jumuah_start column for clarity

-- ============================================================
-- OPTION 1: Remove jumuah_start column (RECOMMENDED)
-- ============================================================
-- Run this if you want to keep the database schema clean

-- Drop the jumuah_start column if it exists
ALTER TABLE excel_schedule
DROP COLUMN IF EXISTS jumuah_start;

-- Ensure jumuah_iqamah column exists (should already exist from original schema)
-- This is just a safety check
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'excel_schedule'
        AND column_name = 'jumuah_iqamah'
    ) THEN
        ALTER TABLE excel_schedule ADD COLUMN jumuah_iqamah VARCHAR(20);
    END IF;
END $$;

-- Add comment explaining the Jumu'ah logic
COMMENT ON COLUMN excel_schedule.jumuah_iqamah IS 'Jumu''ah iqamah time from Excel. Start time always uses Dhuhr start (calculated, not stored).';

-- ============================================================
-- OPTION 2: Keep jumuah_start but mark as unused (BACKWARD COMPATIBLE)
-- ============================================================
-- Run this if you want to preserve the column for backward compatibility
-- (Comment out Option 1 above if using this option)

/*
-- Add comment to indicate the column is unused
COMMENT ON COLUMN excel_schedule.jumuah_start IS 'UNUSED - Kept for backward compatibility. Jumu''ah start now always uses Dhuhr start time (calculated at runtime, not stored).';
COMMENT ON COLUMN excel_schedule.jumuah_iqamah IS 'Jumu''ah iqamah time from Excel. Start time always uses Dhuhr start (calculated, not stored).';
*/

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================
-- Run these after migration to verify the schema

-- Check column structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'excel_schedule'
ORDER BY ordinal_position;

-- Check if any data exists in jumuah_iqamah (should have ~52 Fridays per year)
SELECT COUNT(*) as total_rows,
       COUNT(jumuah_iqamah) as rows_with_jumuah
FROM excel_schedule;

-- Sample some Jumu'ah data
SELECT date, dhuhr_start, jumuah_iqamah
FROM excel_schedule
WHERE jumuah_iqamah IS NOT NULL
ORDER BY date
LIMIT 10;
