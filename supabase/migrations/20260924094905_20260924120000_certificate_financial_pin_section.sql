/*
  # Certificate Financial Section — PIN Protection & Invoice Linking

  ## 1. mw_invoices: Add certificate_id and wtn_id columns
  Allows invoices to be linked directly to certificates and WTNs.

  ## 2. financial_pins table
  Stores a salted hash of a 4-digit PIN per user.
  - user_id (uuid, FK to auth.users, unique)
  - pin_hash (text) — bcrypt-style hash, never plain text
  - pin_salt (text) — per-user salt
  - failed_attempts (int, default 0) — rate limiting
  - locked_until (timestamptz) — temporary lockout after too many attempts
  - last_changed_at (timestamptz)
  - created_at, updated_at

  ## 3. financial_pin_sessions table
  Short-lived server-backed unlock sessions.
  - id (uuid PK)
  - user_id (uuid, FK to auth.users)
  - session_token (text, unique) — secure random token
  - expires_at (timestamptz) — 10 minute timeout
  - created_at (timestamptz)

  ## 4. pin_reset_tokens table
  Single-use, time-limited PIN reset tokens.
  - id (uuid PK)
  - user_id (uuid, FK to auth.users)
  - token_hash (text, unique) — hashed reset token
  - expires_at (timestamptz) — 15 minute expiry
  - used_at (timestamptz) — when used (nullable)
  - created_at (timestamptz)

  ## 5. finance_transactions: Add payment_id, certificate_id, wtn_id
  Links finance records to payments, certificates, and WTNs.

  ## 6. RLS Policies
  - financial_pins: user can only read/update their own row
  - financial pin sessions: user can only read/delete their own
  - pin reset tokens: no public read; insert/update by service role only
  - finance_transactions: add certificate_id/wtn_id (already has authenticated CRUD)

  ## 7. Indexes
*/

-- 1. Add certificate_id and wtn_id to mw_invoices
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoices' AND column_name = 'certificate_id') THEN
    ALTER TABLE mw_invoices ADD COLUMN certificate_id uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoices' AND column_name = 'wtn_id') THEN
    ALTER TABLE mw_invoices ADD COLUMN wtn_id uuid;
  END IF;
END $$;

-- 2. Create financial_pins table
CREATE TABLE IF NOT EXISTS financial_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pin_hash text NOT NULL,
  pin_salt text NOT NULL,
  failed_attempts int NOT NULL DEFAULT 0,
  locked_until timestamptz,
  last_changed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE financial_pins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own pin" ON financial_pins;
CREATE POLICY "Users read own pin" ON financial_pins
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own pin" ON financial_pins;
CREATE POLICY "Users update own pin" ON financial_pins
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own pin" ON financial_pins;
CREATE POLICY "Users insert own pin" ON financial_pins
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 3. Create financial_pin_sessions table
CREATE TABLE IF NOT EXISTS financial_pin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE financial_pin_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own sessions" ON financial_pin_sessions;
CREATE POLICY "Users read own sessions" ON financial_pin_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own sessions" ON financial_pin_sessions;
CREATE POLICY "Users delete own sessions" ON financial_pin_sessions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 4. Create pin_reset_tokens table
CREATE TABLE IF NOT EXISTS pin_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE pin_reset_tokens ENABLE ROW LEVEL SECURITY;
-- No public read/insert/update policies — service role only (edge functions use service role key)

-- 5. Add payment_id, certificate_id, wtn_id to finance_transactions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance_transactions' AND column_name = 'payment_id') THEN
    ALTER TABLE finance_transactions ADD COLUMN payment_id uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance_transactions' AND column_name = 'certificate_id') THEN
    ALTER TABLE finance_transactions ADD COLUMN certificate_id uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance_transactions' AND column_name = 'wtn_id') THEN
    ALTER TABLE finance_transactions ADD COLUMN wtn_id uuid;
  END IF;
END $$;

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_mw_invoices_certificate_id ON mw_invoices (certificate_id) WHERE certificate_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mw_invoices_wtn_id ON mw_invoices (wtn_id) WHERE wtn_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_financial_pins_user ON financial_pins (user_id);
CREATE INDEX IF NOT EXISTS idx_financial_pin_sessions_token ON financial_pin_sessions (session_token);
CREATE INDEX IF NOT EXISTS idx_pin_reset_tokens_hash ON pin_reset_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_payment ON finance_transactions (payment_id) WHERE payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_finance_transactions_certificate ON finance_transactions (certificate_id) WHERE certificate_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_finance_transactions_wtn ON finance_transactions (wtn_id) WHERE wtn_id IS NOT NULL;