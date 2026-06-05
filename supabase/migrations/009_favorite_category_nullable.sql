-- 常用訓練分類改為可空，不再預設「胸」

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
