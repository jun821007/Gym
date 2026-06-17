-- 還原 013（誤對 6/15 除 2）並改在 6/16 修正單邊重量
-- 另將誤存為 6/15 的背部動作移回 6/16

-- 1) 還原 6/15 單邊重量（×2）
UPDATE public.workout_logs
SET
  weight_kg = ROUND((weight_kg * 2)::numeric, 1),
  set_details = CASE
    WHEN set_details IS NOT NULL AND jsonb_typeof(set_details) = 'array' THEN (
      SELECT jsonb_agg(
        CASE
          WHEN elem ? 'weightKg'
            AND (elem->>'weightKg') ~ '^-?[0-9]'
          THEN jsonb_set(
            elem,
            '{weightKg}',
            to_jsonb(ROUND(((elem->>'weightKg')::numeric * 2), 1))
          )
          ELSE elem
        END
      )
      FROM jsonb_array_elements(set_details) AS elem
    )
    ELSE set_details
  END
WHERE load_type = 'unilateral'
  AND log_date = '2026-06-15';

-- 2) 背部訓練誤標 6/15 → 移回 6/16（胸日應只留胸項動作）
UPDATE public.workout_logs
SET log_date = '2026-06-16'
WHERE log_date = '2026-06-15'
  AND exercise_name IN (
    '分動式背部划船',
    '高背下拉',
    '引體向上'
  );

-- 3) 6/16 背部單邊重量 ÷2（使用者輸入為單邊 kg，先前誤存 2 倍）
UPDATE public.workout_logs
SET
  weight_kg = ROUND((weight_kg / 2)::numeric, 1),
  set_details = CASE
    WHEN set_details IS NOT NULL AND jsonb_typeof(set_details) = 'array' THEN (
      SELECT jsonb_agg(
        CASE
          WHEN elem ? 'weightKg'
            AND (elem->>'weightKg') ~ '^-?[0-9]'
          THEN jsonb_set(
            elem,
            '{weightKg}',
            to_jsonb(ROUND(((elem->>'weightKg')::numeric / 2), 1))
          )
          ELSE elem
        END
      )
      FROM jsonb_array_elements(set_details) AS elem
    )
    ELSE set_details
  END
WHERE load_type = 'unilateral'
  AND log_date = '2026-06-16';
