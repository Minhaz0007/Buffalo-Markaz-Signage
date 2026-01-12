-- Migration: Add jumuah_start column to excel_schedule table
-- Run this in Supabase SQL Editor to add support for Jumu'ah start time

-- Add the jumuah_start column (allow NULL for existing data)
ALTER TABLE excel_schedule
ADD COLUMN IF NOT EXISTS jumuah_start VARCHAR(20);

-- Optional: If you want to set a default value for existing rows
-- UPDATE excel_schedule SET jumuah_start = '12:10 PM' WHERE jumuah_start IS NULL;
