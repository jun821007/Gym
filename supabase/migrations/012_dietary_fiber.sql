-- 膳食纖維追蹤

ALTER TABLE public.diet_logs
  ADD COLUMN IF NOT EXISTS fiber_g NUMERIC(6, 1) NOT NULL DEFAULT 0
    CHECK (fiber_g >= 0);

ALTER TABLE public.favorite_meals
  ADD COLUMN IF NOT EXISTS fiber_g NUMERIC(6, 1) NOT NULL DEFAULT 0
    CHECK (fiber_g >= 0);

ALTER TABLE public.users_profile
  ADD COLUMN IF NOT EXISTS daily_fiber_goal_g INTEGER NOT NULL DEFAULT 25
    CHECK (daily_fiber_goal_g BETWEEN 5 AND 80);

COMMENT ON COLUMN public.diet_logs.fiber_g IS '膳食纖維（克）';
COMMENT ON COLUMN public.favorite_meals.fiber_g IS '膳食纖維（克）';
COMMENT ON COLUMN public.users_profile.daily_fiber_goal_g IS '每日膳食纖維目標（克）';
