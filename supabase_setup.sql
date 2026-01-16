-- ============================================================
-- Buffalo Markaz Masjid Signage - Supabase Database Setup
-- ============================================================
-- Run this script in Supabase SQL Editor
-- This ensures clean Excel data replacement without caching issues

-- ============================================================
-- 1. EXCEL SCHEDULE TABLE
-- ============================================================

-- Create table if it doesn't exist
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

-- Add index for faster date lookups
CREATE INDEX IF NOT EXISTS idx_excel_schedule_date ON public.excel_schedule (date);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_excel_schedule_updated_at ON public.excel_schedule;
CREATE TRIGGER update_excel_schedule_updated_at
    BEFORE UPDATE ON public.excel_schedule
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 2. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on excel_schedule
ALTER TABLE public.excel_schedule ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to excel_schedule" ON public.excel_schedule;
DROP POLICY IF EXISTS "Allow public write access to excel_schedule" ON public.excel_schedule;

-- Allow public read access (for viewing prayer times)
CREATE POLICY "Allow public read access to excel_schedule"
    ON public.excel_schedule
    FOR SELECT
    USING (true);

-- Allow public write access (for uploading Excel files)
-- IMPORTANT: In production, you may want to restrict this to authenticated users
CREATE POLICY "Allow public write access to excel_schedule"
    ON public.excel_schedule
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- 3. STORED FUNCTION FOR ATOMIC CLEAR + REPLACE
-- ============================================================

-- This function provides atomic clear+replace operation
-- Prevents race conditions if multiple devices upload simultaneously
CREATE OR REPLACE FUNCTION public.replace_excel_schedule(
    schedule_data JSONB
)
RETURNS TABLE(success BOOLEAN, rows_affected INTEGER, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    row_count INTEGER := 0;
    inserted_count INTEGER := 0;
BEGIN
    -- Start transaction (implicit in function)

    -- STEP 1: Delete ALL existing Excel schedule data
    DELETE FROM public.excel_schedule;
    GET DIAGNOSTICS row_count = ROW_COUNT;

    -- STEP 2: Insert new data from JSONB array
    INSERT INTO public.excel_schedule (
        date, fajr_start, fajr_iqamah, dhuhr_start, dhuhr_iqamah,
        asr_start, asr_iqamah, maghrib_start, maghrib_iqamah,
        isha_start, isha_iqamah, jumuah_iqamah
    )
    SELECT
        (item->>'date')::DATE,
        item->>'fajr_start',
        item->>'fajr_iqamah',
        item->>'dhuhr_start',
        item->>'dhuhr_iqamah',
        item->>'asr_start',
        item->>'asr_iqamah',
        item->>'maghrib_start',
        item->>'maghrib_iqamah',
        item->>'isha_start',
        item->>'isha_iqamah',
        item->>'jumuah_iqamah'
    FROM jsonb_array_elements(schedule_data) AS item;

    GET DIAGNOSTICS inserted_count = ROW_COUNT;

    -- Return success
    RETURN QUERY SELECT true, inserted_count, NULL::TEXT;

EXCEPTION
    WHEN OTHERS THEN
        -- Return error
        RETURN QUERY SELECT false, 0, SQLERRM;
END;
$$;

-- Grant execute permission to public (adjust for your security needs)
GRANT EXECUTE ON FUNCTION public.replace_excel_schedule(JSONB) TO anon, authenticated;

-- ============================================================
-- 4. UTILITY FUNCTIONS
-- ============================================================

-- Function to get count of loaded days
CREATE OR REPLACE FUNCTION public.get_excel_schedule_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
    SELECT COUNT(*)::INTEGER FROM public.excel_schedule;
$$;

GRANT EXECUTE ON FUNCTION public.get_excel_schedule_count() TO anon, authenticated;

-- Function to get date range of loaded schedule
CREATE OR REPLACE FUNCTION public.get_excel_schedule_date_range()
RETURNS TABLE(min_date DATE, max_date DATE, total_days INTEGER)
LANGUAGE sql
STABLE
AS $$
    SELECT
        MIN(date) AS min_date,
        MAX(date) AS max_date,
        COUNT(*)::INTEGER AS total_days
    FROM public.excel_schedule;
$$;

GRANT EXECUTE ON FUNCTION public.get_excel_schedule_date_range() TO anon, authenticated;

-- ============================================================
-- 5. VERIFY SETUP
-- ============================================================

-- Run these queries to verify your setup:
-- SELECT * FROM public.get_excel_schedule_date_range();
-- SELECT * FROM public.get_excel_schedule_count();

-- ============================================================
-- SETUP COMPLETE
-- ============================================================
--
-- Your database is now configured for clean Excel replacements!
--
-- When you upload a new year-round calendar Excel file:
-- 1. Old data is COMPLETELY cleared from the database
-- 2. New data is inserted fresh
-- 3. No stale/cached data remains
-- 4. All devices sync to the new schedule
--
-- ============================================================
