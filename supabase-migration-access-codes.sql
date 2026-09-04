-- Gift / comp access codes for CapyNook.
--
-- Ryan wants to give family free access without anyone paying and without handing out his
-- own login. A code is redeemed once per account and writes an ordinary row into
-- `subscriptions`, so `hasActiveSubscription()` in lib/subscription.ts unlocks the library
-- with no change to the paywall logic.
--
-- Run this in the Supabase SQL Editor. Idempotent; the undo is at the bottom.

-- 1. The codes themselves.
CREATE TABLE IF NOT EXISTS access_codes (
  code         TEXT PRIMARY KEY,
  label        TEXT,                              -- "Zoe", "nieces", whatever it is for
  max_uses     INTEGER NOT NULL DEFAULT 1,
  uses         INTEGER NOT NULL DEFAULT 0,
  months       INTEGER,                           -- NULL = access never expires
  expires_at   TIMESTAMPTZ,                       -- NULL = the code itself never stops working
  active       BOOLEAN NOT NULL DEFAULT TRUE,     -- flip to FALSE to revoke the code
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Who redeemed what. The UNIQUE pair is what stops one account using a code twice.
CREATE TABLE IF NOT EXISTS access_code_redemptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code         TEXT NOT NULL REFERENCES access_codes(code) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redeemed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (code, user_id)
);

CREATE INDEX IF NOT EXISTS access_code_redemptions_user_idx
  ON access_code_redemptions (user_id);

-- 3. Lock both tables down. No policies are defined, so with RLS on, the anon and
--    authenticated roles can do nothing at all. Only the service role reaches them, which
--    is exactly what /api/redeem uses. A reader cannot enumerate or brute-force codes.
ALTER TABLE access_codes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_code_redemptions ENABLE ROW LEVEL SECURITY;

-- 4. Redeem atomically.
--    Doing this in SQL rather than in the route closes the race where two people redeem the
--    last remaining use at the same moment: the UPDATE ... WHERE uses < max_uses only
--    succeeds for one of them.
CREATE OR REPLACE FUNCTION redeem_access_code(p_code TEXT, p_user UUID)
RETURNS TABLE (ok BOOLEAN, reason TEXT, until TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c        access_codes%ROWTYPE;
  v_until  TIMESTAMPTZ;
BEGIN
  SELECT * INTO c FROM access_codes WHERE code = UPPER(TRIM(p_code));

  IF NOT FOUND                                    THEN RETURN QUERY SELECT FALSE, 'not_found', NULL::TIMESTAMPTZ; RETURN; END IF;
  IF NOT c.active                                 THEN RETURN QUERY SELECT FALSE, 'revoked',   NULL::TIMESTAMPTZ; RETURN; END IF;
  IF c.expires_at IS NOT NULL
     AND c.expires_at < NOW()                     THEN RETURN QUERY SELECT FALSE, 'expired',   NULL::TIMESTAMPTZ; RETURN; END IF;

  -- Already redeemed by this account: succeed quietly rather than burning another use.
  IF EXISTS (SELECT 1 FROM access_code_redemptions r
              WHERE r.code = c.code AND r.user_id = p_user) THEN
    RETURN QUERY SELECT TRUE, 'already', NULL::TIMESTAMPTZ; RETURN;
  END IF;

  UPDATE access_codes SET uses = uses + 1
   WHERE code = c.code AND uses < max_uses;
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'used_up', NULL::TIMESTAMPTZ; RETURN;
  END IF;

  INSERT INTO access_code_redemptions (code, user_id) VALUES (c.code, p_user);

  -- NULL months means access with no end date. lib/subscription.ts only rejects a row when
  -- current_period_end is set AND in the past, so NULL reads as "does not expire".
  v_until := CASE WHEN c.months IS NULL THEN NULL
                  ELSE NOW() + (c.months || ' months')::INTERVAL END;

  INSERT INTO subscriptions (user_id, status, current_period_end, updated_at)
       VALUES (p_user, 'active', v_until, NOW())
  ON CONFLICT (user_id) DO UPDATE
     SET status = 'active', current_period_end = v_until, updated_at = NOW();

  RETURN QUERY SELECT TRUE, 'redeemed', v_until;
END;
$$;

REVOKE ALL ON FUNCTION redeem_access_code(TEXT, UUID) FROM PUBLIC, anon, authenticated;

-- Undo:
--   DROP FUNCTION IF EXISTS redeem_access_code(TEXT, UUID);
--   DROP TABLE IF EXISTS access_code_redemptions;
--   DROP TABLE IF EXISTS access_codes;
