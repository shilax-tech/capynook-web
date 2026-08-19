-- Run this in Supabase SQL Editor before running the import script
-- Dashboard → SQL Editor → New query → paste → Run

-- Add is_free column to series (marks series that don't require subscription)
ALTER TABLE series ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT FALSE;

-- After running the import script, the capy series will be auto-marked is_free=true.
-- Verify with:
SELECT name, platform, is_free FROM series ORDER BY name;
