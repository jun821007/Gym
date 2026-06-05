-- 飲食改版：獨立用餐時間 + 常吃清單 + 喝水時間

ALTER TABLE public.diet_logs
  ADD COLUMN IF NOT EXISTS logged_at TIMESTAMPTZ;

UPDATE public.diet_logs
SET logged_at = created_at
WHERE logged_at IS NULL;

ALTER TABLE public.water_logs
  ADD COLUMN IF NOT EXISTS logged_at TIMESTAMPTZ;

UPDATE public.water_logs
SET logged_at = created_at
WHERE logged_at IS NULL;

CREATE TABLE IF NOT EXISTS public.favorite_meals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.users_profile (id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  calories          INTEGER NOT NULL CHECK (calories >= 0),
  protein_g         NUMERIC(6, 1) NOT NULL DEFAULT 0 CHECK (protein_g >= 0),
  carbs_g           NUMERIC(6, 1) NOT NULL DEFAULT 0 CHECK (carbs_g >= 0),
  fat_g             NUMERIC(6, 1) NOT NULL DEFAULT 0 CHECK (fat_g >= 0),
  default_meal_type TEXT CHECK (default_meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_favorite_meals_user
  ON public.favorite_meals (user_id, created_at DESC);

ALTER TABLE public.favorite_meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "favorite_meals_own"
  ON public.favorite_meals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
