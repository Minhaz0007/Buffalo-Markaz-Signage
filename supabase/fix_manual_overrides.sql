-- ============================================================
-- Fix Manual Overrides Table
-- ============================================================
-- Run this script in the Supabase SQL Editor to ensure the manual_overrides table exists
-- and has the correct schema for the application to work correctly.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS manual_overrides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prayer_key VARCHAR(20) NOT NULL CHECK (prayer_key IN ('fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'jumuah')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time VARCHAR(20) NOT NULL,
    iqamah_time VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient date range queries
CREATE INDEX IF NOT EXISTS idx_manual_overrides_dates ON manual_overrides(start_date, end_date);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_manual_overrides_updated_at ON manual_overrides;
CREATE TRIGGER update_manual_overrides_updated_at BEFORE UPDATE ON manual_overrides
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verify the table exists
SELECT count(*) FROM manual_overrides;
