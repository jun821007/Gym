-- 訓練結算等級擴充 SS / SSS / SSS+；常用訓練分類改為自由字串（核心／小臂／自訂）

ALTER TABLE public.workout_daily_settlements
  DROP CONSTRAINT IF EXISTS workout_daily_settlements_grade_check;

ALTER TABLE public.workout_daily_settlements
  ADD CONSTRAINT workout_daily_settlements_grade_check
  CHECK (grade IN ('SSS+', 'SSS', 'SS', 'S', 'A', 'B', 'C', 'D'));

ALTER TABLE public.favorite_workouts
  DROP CONSTRAINT IF EXISTS favorite_workouts_category_check;

ALTER TABLE public.favorite_workouts
  ALTER COLUMN category DROP NOT NULL;

COMMENT ON COLUMN public.favorite_workouts.category IS
  '分類 key：back/legs/chest/shoulders/core/forearms，或自訂中文名稱';
