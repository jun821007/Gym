-- 飲食鈉含量（毫克）

ALTER TABLE public.diet_logs
  ADD COLUMN IF NOT EXISTS sodium_mg INTEGER NOT NULL DEFAULT 0
    CHECK (sodium_mg >= 0);

ALTER TABLE public.favorite_meals
  ADD COLUMN IF NOT EXISTS sodium_mg INTEGER NOT NULL DEFAULT 0
    CHECK (sodium_mg >= 0);

ALTER TABLE public.users_profile
  ADD COLUMN IF NOT EXISTS daily_sodium_goal_mg INTEGER NOT NULL DEFAULT 2300
    CHECK (daily_sodium_goal_mg BETWEEN 500 AND 6000);

COMMENT ON COLUMN public.diet_logs.sodium_mg IS '鈉含量（毫克）';
COMMENT ON COLUMN public.favorite_meals.sodium_mg IS '鈉含量（毫克）';
COMMENT ON COLUMN public.users_profile.daily_sodium_goal_mg IS '每日鈉攝取上限（毫克）';
