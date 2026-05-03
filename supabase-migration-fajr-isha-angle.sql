-- Migration: Add fajr_isha_angle column to global_settings
-- Run this in your Supabase SQL Editor to enable the 15°/18° degree setting.
--
-- This column stores the solar depression angle used for Fajr and Isha
-- start-time calculations for Buffalo, NY (14212).
--   15 = ISNA / North America standard (moderate)
--   18 = MWL / Hanafi standard (conservative — default)

ALTER TABLE global_settings
  ADD COLUMN IF NOT EXISTS fajr_isha_angle INTEGER NOT NULL DEFAULT 18
    CHECK (fajr_isha_angle IN (15, 18));
