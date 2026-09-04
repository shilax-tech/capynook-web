-- Run this in Supabase SQL Editor
-- Dashboard → SQL Editor → New query → paste → Run
--
-- FULL-TEXT SEARCH FOR THE LIBRARY
--
-- The library search only ever matched titles (`.ilike('title', ...)`), so a reader could not
-- find a book by anything that happens inside it. This adds a proper search index over the
-- title and the story text.
--
-- Safe to run more than once. It adds a column and an index, changes no existing data, and
-- deletes nothing. To undo, see the bottom of this file.

-- 1. A generated column. Postgres maintains it automatically on every insert and update, so
--    there is no trigger to keep in sync and no way for it to drift out of date.
--    Title is weighted A and body text B, so a title match ranks above a passing mention.
ALTER TABLE books
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'B')
  ) STORED;

-- 2. The index that makes it fast. Without this the column is just a slower ILIKE.
CREATE INDEX IF NOT EXISTS books_search_vector_idx
  ON books USING GIN (search_vector);

-- 3. The library filters on platform and orders within a series on every page load.
CREATE INDEX IF NOT EXISTS books_platform_series_number_idx
  ON books (platform, series_id, book_number);

-- 4. Let Postgres re-plan against the new indexes straight away rather than waiting for
--    autovacuum to get round to it.
ANALYZE books;

-- CHECK IT WORKED --------------------------------------------------------------------------
-- Expect a row count, and titles that do not contain the word themselves:
--
--   SELECT count(*) FROM books WHERE search_vector @@ websearch_to_tsquery('english', 'dragon');
--
--   SELECT title, ts_rank(search_vector, websearch_to_tsquery('english', 'dragon')) AS rank
--   FROM books
--   WHERE search_vector @@ websearch_to_tsquery('english', 'dragon')
--   ORDER BY rank DESC
--   LIMIT 10;
--
-- Confirm the index is actually being used:
--
--   EXPLAIN ANALYZE
--   SELECT id FROM books
--   WHERE search_vector @@ websearch_to_tsquery('english', 'dragon');
--
-- It should say "Bitmap Index Scan on books_search_vector_idx". If it says "Seq Scan", the
-- table is small enough that Postgres prefers a scan; that is fine and not an error.

-- TO UNDO ----------------------------------------------------------------------------------
--   DROP INDEX IF EXISTS books_search_vector_idx;
--   DROP INDEX IF EXISTS books_platform_series_number_idx;
--   ALTER TABLE books DROP COLUMN IF EXISTS search_vector;
--
-- The app keeps working after an undo: it falls back to matching title and content with ILIKE
-- whenever the search_vector column is not there.
