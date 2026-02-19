-- ============================================================
-- Clean Slate for Announcement Ticker
-- ============================================================
-- Run this script in the Supabase SQL Editor to delete all
-- announcement items from the ticker.

DELETE FROM announcement_items;

-- Verify the deletion (should return 0 rows)
SELECT * FROM announcement_items;
