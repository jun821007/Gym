-- 修正 2026-06-15 單邊訓練重量（先前顯示邏輯誤導致存入 2 倍單邊重量）

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
  AND log_date = '2026-06-15';
