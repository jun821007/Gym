-- Distinguish single-exercise favorites from full-day training menus
ALTER TABLE public.favorite_workouts
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'exercise';

ALTER TABLE public.favorite_workouts
  DROP CONSTRAINT IF EXISTS favorite_workouts_kind_check;

ALTER TABLE public.favorite_workouts
  ADD CONSTRAINT favorite_workouts_kind_check
  CHECK (kind IN ('exercise', 'menu'));

COMMENT ON COLUMN public.favorite_workouts.kind IS
  'exercise = single favorite chip; menu = multi-exercise day template';
