ALTER TABLE public.favorite_meals
  ADD COLUMN IF NOT EXISTS bundle_name TEXT;

CREATE INDEX IF NOT EXISTS idx_favorite_meals_user_meal_bundle
  ON public.favorite_meals (user_id, default_meal_type, bundle_name, created_at DESC);

COMMENT ON COLUMN public.favorite_meals.bundle_name IS '套餐名稱；相同 bundle_name 視為同一套餐';
