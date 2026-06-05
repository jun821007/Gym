-- 訓練改版：負載模式、組別護具、常用菜單

ALTER TABLE public.workout_logs
  ADD COLUMN IF NOT EXISTS load_type TEXT NOT NULL DEFAULT 'bilateral'
    CHECK (load_type IN ('bilateral', 'unilateral', 'bodyweight', 'weighted_bw', 'assisted_bw'));

ALTER TABLE public.workout_logs
  ADD COLUMN IF NOT EXISTS extra_weight_kg NUMERIC(6, 2) DEFAULT 0;

ALTER TABLE public.workout_logs
  ADD COLUMN IF NOT EXISTS assist_kg NUMERIC(6, 2) DEFAULT 0;

ALTER TABLE public.workout_logs
  ADD COLUMN IF NOT EXISTS set_details JSONB;

CREATE TABLE IF NOT EXISTS public.favorite_workouts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users_profile (id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  exercises   JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_favorite_workouts_user
  ON public.favorite_workouts (user_id, created_at DESC);

ALTER TABLE public.favorite_workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "favorite_workouts_own"
  ON public.favorite_workouts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
