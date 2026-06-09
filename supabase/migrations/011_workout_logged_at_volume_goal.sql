-- 重訓獨立打卡時間 + 每日訓練量目標

ALTER TABLE public.workout_logs
  ADD COLUMN IF NOT EXISTS logged_at TIMESTAMPTZ;

UPDATE public.workout_logs
SET logged_at = created_at
WHERE logged_at IS NULL;

ALTER TABLE public.users_profile
  ADD COLUMN IF NOT EXISTS daily_workout_volume_goal_kg INTEGER
    CHECK (
      daily_workout_volume_goal_kg IS NULL
      OR daily_workout_volume_goal_kg BETWEEN 500 AND 50000
    );

COMMENT ON COLUMN public.users_profile.daily_workout_volume_goal_kg IS
  '每日訓練量目標（kg），NULL 表示使用建議值或預設 3000';
