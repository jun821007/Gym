-- 飲水打卡（補給酒館）
-- 執行於 001_initial_schema.sql 之後

ALTER TABLE public.users_profile
  ADD COLUMN IF NOT EXISTS daily_water_goal_ml INTEGER NOT NULL DEFAULT 2000
    CHECK (daily_water_goal_ml BETWEEN 500 AND 10000);

COMMENT ON COLUMN public.users_profile.daily_water_goal_ml IS '每日飲水目標（毫升）';

CREATE TABLE IF NOT EXISTS public.water_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users_profile (id) ON DELETE CASCADE,
  log_date    DATE NOT NULL DEFAULT (CURRENT_DATE AT TIME ZONE 'UTC'),
  amount_ml   INTEGER NOT NULL CHECK (amount_ml > 0 AND amount_ml <= 5000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_water_logs_user_date
  ON public.water_logs (user_id, log_date DESC);

COMMENT ON TABLE public.water_logs IS '飲水打卡紀錄（毫升）';

ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS water_logs_select_own ON public.water_logs;
CREATE POLICY water_logs_select_own ON public.water_logs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS water_logs_insert_own ON public.water_logs;
CREATE POLICY water_logs_insert_own ON public.water_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS water_logs_delete_own ON public.water_logs;
CREATE POLICY water_logs_delete_own ON public.water_logs
  FOR DELETE USING (auth.uid() = user_id);
