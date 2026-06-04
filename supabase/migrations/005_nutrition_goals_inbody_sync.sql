-- 記錄營養目標最後對應的 InBody 量測日（新 InBody 時自動重算）
ALTER TABLE public.users_profile
  ADD COLUMN IF NOT EXISTS nutrition_goals_inbody_date DATE;

COMMENT ON COLUMN public.users_profile.nutrition_goals_inbody_date IS
  '每日熱量/巨量營養目標所依據的 InBody 紀錄日期';
