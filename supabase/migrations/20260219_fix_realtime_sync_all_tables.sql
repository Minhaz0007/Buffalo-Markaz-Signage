-- Migration: Fix Realtime Sync Across All Devices
-- Description: Enables Supabase Realtime publication for all tables so that
--              changes on one device broadcast instantly to every other device.
--              Also sets REPLICA IDENTITY FULL so UPDATE and DELETE events
--              carry the full row data (required for Supabase Realtime).
-- Date: 2026-02-19
-- SAFE TO RUN MULTIPLE TIMES (all statements are idempotent or wrapped in DO blocks)

-- ── Step 1: REPLICA IDENTITY FULL ─────────────────────────────────────────
-- Supabase Realtime needs FULL identity so it can send the complete row on
-- UPDATE / DELETE events. Without this, subscriber payloads are empty.

ALTER TABLE excel_schedule      REPLICA IDENTITY FULL;
ALTER TABLE manual_overrides    REPLICA IDENTITY FULL;
ALTER TABLE announcement_items  REPLICA IDENTITY FULL;
ALTER TABLE slideshow_config    REPLICA IDENTITY FULL;
ALTER TABLE global_settings     REPLICA IDENTITY FULL;

-- ── Step 2: Add all tables to the supabase_realtime publication ────────────
-- Only global_settings was added previously. The other four tables were
-- subscribed in the frontend but never actually published, so Device B never
-- received change events from Device A.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'excel_schedule'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE excel_schedule;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'manual_overrides'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE manual_overrides;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'announcement_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE announcement_items;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'slideshow_config'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE slideshow_config;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'global_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE global_settings;
  END IF;
END $$;
