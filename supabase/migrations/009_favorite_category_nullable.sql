-- 常用訓練分類（可空，不預設胸）
-- 若尚未跑 007，請先建立 favorite_workouts 表

ALTER TABLE public.favorite_workouts
  ADD COLUMN IF NOT EXISTS category TEXT;

ALTER TABLE public.favorite_workouts
  ALTER COLUMN category DROP DEFAULT;

ALTER TABLE public.favorite_workouts
  ALTER COLUMN category DROP NOT NULL;

ALTER TABLE public.favorite_workouts
  DROP CONSTRAINT IF EXISTS favorite_workouts_category_check;

ALTER TABLE public.favorite_workouts
  ADD CONSTRAINT favorite_workouts_category_check
    CHECK (
      category IS NULL
      OR category IN ('back', 'legs', 'chest', 'shoulders')
    );

CREATE INDEX IF NOT EXISTS idx_favorite_workouts_user_category
  ON public.favorite_workouts (user_id, category, created_at DESC);
