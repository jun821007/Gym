-- =============================================================================
-- 身體管理 (Body Management) — Supabase 初始資料庫結構
-- 像素 RPG 風健康管理 Web App
-- 執行方式：Supabase Dashboard → SQL Editor → 貼上並 Run
--          或 supabase db push（若已連結 CLI）
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. 擴充與共用型別
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 每週評比等級
CREATE TYPE weekly_grade_level AS ENUM ('S', 'A', 'B', 'C');

-- InBody 單筆歷史紀錄的 JSON 結構（寫入 inbody_history 陣列元素）
-- 範例：
-- {
--   "recorded_at": "2026-06-03T08:00:00Z",
--   "weight_kg": 72.5,
--   "body_fat_pct": 18.2,
--   "skeletal_muscle_kg": 32.1,
--   "bmi": 23.4,
--   "source": "manual" | "ai_photo" | "inbody_report",
--   "image_url": "https://...",
--   "raw_notes": "..."
-- }

-- -----------------------------------------------------------------------------
-- 1. users_profile — RPG 角色與 InBody 歷史
-- -----------------------------------------------------------------------------
CREATE TABLE public.users_profile (
  id              UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name    TEXT,
  avatar_url      TEXT,
  level           INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
  xp              INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
  xp_to_next      INTEGER NOT NULL DEFAULT 100 CHECK (xp_to_next > 0),
  -- 核心素質 0–999（由打卡與 AI 解析後更新）
  str             INTEGER NOT NULL DEFAULT 10 CHECK (str BETWEEN 0 AND 999),
  vit             INTEGER NOT NULL DEFAULT 10 CHECK (vit BETWEEN 0 AND 999),
  agi             INTEGER NOT NULL DEFAULT 10 CHECK (agi BETWEEN 0 AND 999),
  san             INTEGER NOT NULL DEFAULT 10 CHECK (san BETWEEN 0 AND 999),
  -- InBody / 體態歷史（時間序列 JSON 陣列，最新在陣列尾端或依 recorded_at 排序）
  inbody_history  JSONB NOT NULL DEFAULT '[]'::JSONB,
  -- 每日目標（供前端進度條，可後續由設定頁調整）
  daily_calorie_goal INTEGER DEFAULT 2200,
  daily_protein_goal  INTEGER DEFAULT 150,
  daily_carbs_goal    INTEGER DEFAULT 250,
  daily_fat_goal      INTEGER DEFAULT 70,
  daily_steps_goal    INTEGER DEFAULT 8000,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.users_profile IS '玩家 RPG 檔案：等級、XP、四維屬性、InBody 歷史';
COMMENT ON COLUMN public.users_profile.inbody_history IS 'JSONB 陣列，每筆為一次體態量測紀錄';

-- -----------------------------------------------------------------------------
-- 2. workout_logs — 重訓打卡（地下城副本）
-- -----------------------------------------------------------------------------
CREATE TABLE public.workout_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users_profile (id) ON DELETE CASCADE,
  log_date        DATE NOT NULL DEFAULT (CURRENT_DATE AT TIME ZONE 'UTC'),
  exercise_name   TEXT NOT NULL,
  weight_kg       NUMERIC(6, 2) CHECK (weight_kg IS NULL OR weight_kg >= 0),
  reps            INTEGER NOT NULL CHECK (reps > 0),
  sets            INTEGER NOT NULL CHECK (sets > 0),
  notes           TEXT,
  xp_gained       INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workout_logs_user_date
  ON public.workout_logs (user_id, log_date DESC);

COMMENT ON TABLE public.workout_logs IS '重訓紀錄：影響 STR 與 AGI 計算';

-- -----------------------------------------------------------------------------
-- 3. diet_logs — 飲食打卡（補給酒館）
-- -----------------------------------------------------------------------------
CREATE TABLE public.diet_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users_profile (id) ON DELETE CASCADE,
  log_date        DATE NOT NULL DEFAULT (CURRENT_DATE AT TIME ZONE 'UTC'),
  food_name       TEXT NOT NULL,
  calories        INTEGER NOT NULL CHECK (calories >= 0),
  protein_g       NUMERIC(6, 1) NOT NULL DEFAULT 0 CHECK (protein_g >= 0),
  carbs_g         NUMERIC(6, 1) NOT NULL DEFAULT 0 CHECK (carbs_g >= 0),
  fat_g           NUMERIC(6, 1) NOT NULL DEFAULT 0 CHECK (fat_g >= 0),
  image_url       TEXT,
  meal_type       TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  ai_confidence   NUMERIC(3, 2) CHECK (ai_confidence IS NULL OR (ai_confidence BETWEEN 0 AND 1)),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_diet_logs_user_date
  ON public.diet_logs (user_id, log_date DESC);

COMMENT ON TABLE public.diet_logs IS '飲食紀錄：影響 SAN 與每日營養進度條';

-- -----------------------------------------------------------------------------
-- 4. weekly_grades — 每週 AI 綜合評比
-- -----------------------------------------------------------------------------
CREATE TABLE public.weekly_grades (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users_profile (id) ON DELETE CASCADE,
  -- ISO 年週：2026-W22 或整數 202622（year * 100 + week）
  year            INTEGER NOT NULL,
  week_number     INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 53),
  grade           weekly_grade_level NOT NULL,
  ai_summary      TEXT NOT NULL,
  -- 結算快照（可選，供前端成就動畫）
  stats_snapshot  JSONB DEFAULT '{}'::JSONB,
  evaluated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, year, week_number)
);

CREATE INDEX idx_weekly_grades_user
  ON public.weekly_grades (user_id, year DESC, week_number DESC);

COMMENT ON TABLE public.weekly_grades IS '每週 S/A/B/C 評級與 AI 週報摘要';

-- -----------------------------------------------------------------------------
-- 5. 輔助表：每日步數 / 有氧（AGI、VIT 計算用，可選）
-- -----------------------------------------------------------------------------
CREATE TABLE public.activity_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users_profile (id) ON DELETE CASCADE,
  log_date        DATE NOT NULL DEFAULT (CURRENT_DATE AT TIME ZONE 'UTC'),
  steps           INTEGER DEFAULT 0 CHECK (steps >= 0),
  cardio_minutes  INTEGER DEFAULT 0 CHECK (cardio_minutes >= 0),
  sleep_hours     NUMERIC(4, 2) CHECK (sleep_hours IS NULL OR (sleep_hours BETWEEN 0 AND 24)),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, log_date)
);

COMMENT ON TABLE public.activity_logs IS '步數、有氧、睡眠 — 影響 VIT / AGI';

-- -----------------------------------------------------------------------------
-- 6. updated_at 自動更新
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_users_profile_updated_at
  BEFORE UPDATE ON public.users_profile
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 7. 新用戶註冊時自動建立 profile
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users_profile (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.email),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 8. Row Level Security (RLS)
-- -----------------------------------------------------------------------------
ALTER TABLE public.users_profile   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diet_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_grades   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs   ENABLE ROW LEVEL SECURITY;

-- users_profile
CREATE POLICY "Users can view own profile"
  ON public.users_profile FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users_profile FOR UPDATE
  USING (auth.uid() = id);

-- workout_logs
CREATE POLICY "Users can manage own workout logs"
  ON public.workout_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- diet_logs
CREATE POLICY "Users can manage own diet logs"
  ON public.diet_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- weekly_grades
CREATE POLICY "Users can view own weekly grades"
  ON public.weekly_grades FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert weekly grades"
  ON public.weekly_grades FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- activity_logs
CREATE POLICY "Users can manage own activity logs"
  ON public.activity_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 9. Storage Buckets（InBody 報告、食物照片）
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'inbody-reports',
    'inbody-reports',
    false,
    10485760, -- 10 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  ),
  (
    'diet-photos',
    'diet-photos',
    false,
    5242880, -- 5 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
  )
ON CONFLICT (id) DO NOTHING;

-- Storage RLS：僅能存取自己資料夾 {user_id}/...
CREATE POLICY "Users upload own inbody files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'inbody-reports'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "Users read own inbody files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'inbody-reports'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "Users upload own diet photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'diet-photos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "Users read own diet photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'diet-photos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- -----------------------------------------------------------------------------
-- 10. 便利函式：追加 InBody 紀錄到 JSONB 陣列
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.append_inbody_record(
  p_user_id UUID,
  p_record  JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_history JSONB;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id AND current_setting('role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.users_profile
  SET inbody_history = inbody_history || jsonb_build_array(p_record)
  WHERE id = p_user_id
  RETURNING inbody_history INTO v_history;

  RETURN v_history;
END;
$$;

GRANT EXECUTE ON FUNCTION public.append_inbody_record TO authenticated;

-- -----------------------------------------------------------------------------
-- 11. 啟用 Realtime（前端即時更新進度條，可選）
-- -----------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.users_profile;
ALTER PUBLICATION supabase_realtime ADD TABLE public.diet_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workout_logs;
