-- ========================================================
-- Supabase Schema: Credit & Coin Economy
-- Run this script in your Supabase Dashboard -> SQL Editor
-- ========================================================

-- 1. User Credits Table
CREATE TABLE IF NOT EXISTS public.user_credits (
  user_id TEXT PRIMARY KEY,
  credits INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. User Unlocked CVs Table
CREATE TABLE IF NOT EXISTS public.user_unlocked_cvs (
  id TEXT PRIMARY KEY, -- Composite key: user_id || '_' || cv_id
  user_id TEXT NOT NULL,
  cv_id TEXT NOT NULL REFERENCES public.cvs(id) ON DELETE CASCADE,
  unlocked_view BOOLEAN NOT NULL DEFAULT FALSE,
  unlocked_download BOOLEAN NOT NULL DEFAULT FALSE,
  owner_rewarded BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_unlocked_user_id ON public.user_unlocked_cvs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_unlocked_cv_id ON public.user_unlocked_cvs(cv_id);

-- 3. Credit Transactions Audit Ledger
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  type TEXT NOT NULL, -- 'signup_bonus', 'upload_reward', 'view_cost', 'download_cost', 'download_reward', 'topup_dummy', 'topup_gateway'
  cv_id TEXT,
  target_user_id TEXT,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.credit_transactions(user_id, created_at DESC);

-- Enable RLS and add Service Role access bypass
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_unlocked_cvs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on user_credits"
  ON public.user_credits FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on user_unlocked_cvs"
  ON public.user_unlocked_cvs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on credit_transactions"
  ON public.credit_transactions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ========================================================
-- Atomic Stored Functions for ACID Balance Enforcement
-- ========================================================

-- Function: Unlock CV View (1 Credit)
CREATE OR REPLACE FUNCTION public.unlock_cv_view(
  p_user_id TEXT,
  p_cv_id TEXT,
  p_cv_owner_id TEXT,
  p_candidate_name TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_credits INT;
  v_new_credits INT;
  v_already_unlocked BOOLEAN := FALSE;
  v_unlock_record RECORD;
  v_tx_id TEXT;
BEGIN
  -- If user is owner, free
  IF p_cv_owner_id IS NOT NULL AND p_cv_owner_id = p_user_id THEN
    SELECT credits INTO v_current_credits FROM public.user_credits WHERE user_id = p_user_id;
    IF v_current_credits IS NULL THEN
      v_current_credits := 10;
      INSERT INTO public.user_credits (user_id, credits) VALUES (p_user_id, 10);
    END IF;
    RETURN jsonb_build_object('credits', v_current_credits, 'already_unlocked', true);
  END IF;

  -- Ensure user_credits row exists
  INSERT INTO public.user_credits (user_id, credits)
  VALUES (p_user_id, 10)
  ON CONFLICT (user_id) DO NOTHING;

  -- Lock row for update
  SELECT credits INTO v_current_credits
  FROM public.user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Check if already unlocked
  SELECT * INTO v_unlock_record
  FROM public.user_unlocked_cvs
  WHERE id = (p_user_id || '_' || p_cv_id);

  IF FOUND AND (v_unlock_record.unlocked_view = TRUE OR v_unlock_record.unlocked_download = TRUE) THEN
    RETURN jsonb_build_object('credits', v_current_credits, 'already_unlocked', true);
  END IF;

  -- Check balance
  IF v_current_credits < 1 THEN
    RAISE EXCEPTION 'Insufficient credits. Viewing full candidate details requires 1 credit (Current balance: %)', v_current_credits;
  END IF;

  v_new_credits := v_current_credits - 1;
  UPDATE public.user_credits SET credits = v_new_credits, updated_at = NOW() WHERE user_id = p_user_id;

  INSERT INTO public.user_unlocked_cvs (id, user_id, cv_id, unlocked_view, updated_at)
  VALUES (p_user_id || '_' || p_cv_id, p_user_id, p_cv_id, TRUE, NOW())
  ON CONFLICT (id) DO UPDATE SET unlocked_view = TRUE, updated_at = NOW();

  v_tx_id := gen_random_uuid()::text;
  INSERT INTO public.credit_transactions (id, user_id, amount, balance_after, type, cv_id, description)
  VALUES (
    v_tx_id,
    p_user_id,
    -1,
    v_new_credits,
    'view_cost',
    p_cv_id,
    'Viewed details of candidate' || CASE WHEN p_candidate_name <> '' THEN ' "' || p_candidate_name || '"' ELSE '' END
  );

  RETURN jsonb_build_object('credits', v_new_credits, 'already_unlocked', false);
END;
$$;

-- Function: Unlock CV Download (5 Credits & +1 to Owner once)
CREATE OR REPLACE FUNCTION public.unlock_cv_download(
  p_user_id TEXT,
  p_cv_id TEXT,
  p_cv_owner_id TEXT,
  p_candidate_name TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_credits INT;
  v_new_credits INT;
  v_owner_current_credits INT;
  v_owner_new_credits INT;
  v_already_unlocked BOOLEAN := FALSE;
  v_owner_rewarded BOOLEAN := FALSE;
  v_unlock_record RECORD;
  v_tx_id TEXT;
BEGIN
  -- If user is owner, free
  IF p_cv_owner_id IS NOT NULL AND p_cv_owner_id = p_user_id THEN
    SELECT credits INTO v_current_credits FROM public.user_credits WHERE user_id = p_user_id;
    IF v_current_credits IS NULL THEN
      v_current_credits := 10;
      INSERT INTO public.user_credits (user_id, credits) VALUES (p_user_id, 10);
    END IF;
    RETURN jsonb_build_object('credits', v_current_credits, 'already_unlocked', true, 'owner_rewarded', false);
  END IF;

  -- Ensure user_credits row exists
  INSERT INTO public.user_credits (user_id, credits)
  VALUES (p_user_id, 10)
  ON CONFLICT (user_id) DO NOTHING;

  -- Lock row for update
  SELECT credits INTO v_current_credits
  FROM public.user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Check if already unlocked
  SELECT * INTO v_unlock_record
  FROM public.user_unlocked_cvs
  WHERE id = (p_user_id || '_' || p_cv_id);

  IF FOUND AND v_unlock_record.unlocked_download = TRUE THEN
    RETURN jsonb_build_object('credits', v_current_credits, 'already_unlocked', true, 'owner_rewarded', false);
  END IF;

  -- Check balance
  IF v_current_credits < 5 THEN
    RAISE EXCEPTION 'Insufficient credits. Downloading this CV requires 5 credits (Current balance: %)', v_current_credits;
  END IF;

  v_new_credits := v_current_credits - 5;
  UPDATE public.user_credits SET credits = v_new_credits, updated_at = NOW() WHERE user_id = p_user_id;

  -- Reward owner (+1 credit once)
  IF p_cv_owner_id IS NOT NULL AND p_cv_owner_id <> '' AND p_cv_owner_id <> p_user_id AND (v_unlock_record IS NULL OR v_unlock_record.owner_rewarded = FALSE) THEN
    INSERT INTO public.user_credits (user_id, credits)
    VALUES (p_cv_owner_id, 10)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT credits INTO v_owner_current_credits
    FROM public.user_credits
    WHERE user_id = p_cv_owner_id
    FOR UPDATE;

    v_owner_new_credits := v_owner_current_credits + 1;
    UPDATE public.user_credits SET credits = v_owner_new_credits, updated_at = NOW() WHERE user_id = p_cv_owner_id;

    v_tx_id := gen_random_uuid()::text;
    INSERT INTO public.credit_transactions (id, user_id, amount, balance_after, type, cv_id, target_user_id, description)
    VALUES (
      v_tx_id,
      p_cv_owner_id,
      1,
      v_owner_new_credits,
      'download_reward',
      p_cv_id,
      p_user_id,
      'Credit earned: Your uploaded CV' || CASE WHEN p_candidate_name <> '' THEN ' ("' || p_candidate_name || '")' ELSE '' END || ' was downloaded'
    );

    v_owner_rewarded := TRUE;
  END IF;

  -- Mark unlocked for download and view
  INSERT INTO public.user_unlocked_cvs (id, user_id, cv_id, unlocked_view, unlocked_download, owner_rewarded, updated_at)
  VALUES (p_user_id || '_' || p_cv_id, p_user_id, p_cv_id, TRUE, TRUE, v_owner_rewarded, NOW())
  ON CONFLICT (id) DO UPDATE SET unlocked_view = TRUE, unlocked_download = TRUE, owner_rewarded = v_owner_rewarded, updated_at = NOW();

  -- Record downloader transaction
  v_tx_id := gen_random_uuid()::text;
  INSERT INTO public.credit_transactions (id, user_id, amount, balance_after, type, cv_id, description)
  VALUES (
    v_tx_id,
    p_user_id,
    -5,
    v_new_credits,
    'download_cost',
    p_cv_id,
    'Unlocked and downloaded CV' || CASE WHEN p_candidate_name <> '' THEN ' "' || p_candidate_name || '"' ELSE '' END
  );

  RETURN jsonb_build_object('credits', v_new_credits, 'already_unlocked', false, 'owner_rewarded', v_owner_rewarded);
END;
$$;
