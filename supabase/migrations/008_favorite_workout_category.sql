-- 常用訓練分類：背 / 腿 / 胸 / 肩

ALTER TABLE public.favorite_workouts
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'chest'
    CHECK (category IN ('back', 'legs', 'chest', 'shoulders'));

CREATE INDEX IF NOT EXISTS idx_favorite_workouts_user_category
  ON public.favorite_workouts (user_id, category, created_at DESC);
