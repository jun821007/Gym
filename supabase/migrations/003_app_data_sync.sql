-- 體態目標、日結算歷史、週評 upsert（接 Supabase 同步用）
-- 可重複執行（IF NOT EXISTS / DROP POLICY IF EXISTS）

ALTER TABLE public.users_profile
  ADD COLUMN IF NOT EXISTS target_weight_kg NUMERIC(5, 1),
  ADD COLUMN IF NOT EXISTS target_body_fat_pct NUMERIC(4, 1),
  ADD COLUMN IF NOT EXISTS target_muscle_kg NUMERIC(5, 1);

-- 訓練每日結算
CREATE TABLE IF NOT EXISTS public.workout_daily_settlements (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users_profile (id) ON DELETE CASCADE,
  log_date   DATE NOT NULL,
  grade      TEXT NOT NULL CHECK (grade IN ('S', 'A', 'B', 'C', 'D')),
  payload    JSONB NOT NULL DEFAULT '{}'::JSONB,
  logged_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_workout_settlements_user_date
  ON public.workout_daily_settlements (user_id, log_date DESC);

-- 飲食每日結算（含飲水）
CREATE TABLE IF NOT EXISTS public.diet_daily_settlements (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users_profile (id) ON DELETE CASCADE,
  log_date   DATE NOT NULL,
  grade      TEXT NOT NULL CHECK (grade IN ('S', 'A', 'B', 'C', 'D')),
  payload    JSONB NOT NULL DEFAULT '{}'::JSONB,
  logged_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_diet_settlements_user_date
  ON public.diet_daily_settlements (user_id, log_date DESC);

ALTER TABLE public.workout_daily_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diet_daily_settlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workout_settlements_own ON public.workout_daily_settlements;
CREATE POLICY workout_settlements_own ON public.workout_daily_settlements
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS diet_settlements_own ON public.diet_daily_settlements;
CREATE POLICY diet_settlements_own ON public.diet_daily_settlements
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 週評：允許本人更新（upsert）
DROP POLICY IF EXISTS "Users can update own weekly grades" ON public.weekly_grades;
CREATE POLICY "Users can update own weekly grades"
  ON public.weekly_grades FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own weekly grades" ON public.weekly_grades;
CREATE POLICY "Users can delete own weekly grades"
  ON public.weekly_grades FOR DELETE
  USING (auth.uid() = user_id);
