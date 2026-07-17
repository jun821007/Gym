-- 後三角束蝴蝶機為雙邊機台；誤標 unilateral 會讓訓練量 ×2、結算顯示「單邊」
-- 一併修正 workout_logs、常用／菜單 exercises、已存結算 payload

-- 1) 歷史／今日打卡
UPDATE public.workout_logs
SET load_type = 'bilateral'
WHERE load_type = 'unilateral'
  AND exercise_name ILIKE '%後三角束蝴蝶機%';

-- 1b) favorite_workouts.exercises JSON 內同名動作
UPDATE public.favorite_workouts fw
SET exercises = (
  SELECT COALESCE(jsonb_agg(
    CASE
      WHEN (ex->>'exerciseName') ILIKE '%後三角束蝴蝶機%'
        AND COALESCE(ex->>'loadType', '') = 'unilateral'
      THEN jsonb_set(ex, '{loadType}', '"bilateral"')
      ELSE ex
    END
  ), '[]'::jsonb)
  FROM jsonb_array_elements(COALESCE(fw.exercises, '[]'::jsonb)) AS ex
)
WHERE EXISTS (
  SELECT 1
  FROM jsonb_array_elements(COALESCE(fw.exercises, '[]'::jsonb)) AS ex
  WHERE (ex->>'exerciseName') ILIKE '%後三角束蝴蝶機%'
    AND COALESCE(ex->>'loadType', '') = 'unilateral'
);

-- 2) 結算 payload.manualLogs：改 loadType，並依 setLines 判斷是否需把重量／訓練量除以 2
DO $$
DECLARE
  rec RECORD;
  logs jsonb;
  fixed_logs jsonb;
  elem jsonb;
  lines jsonb;
  line jsonb;
  new_lines jsonb;
  vol numeric;
  lines_vol numeric;
  new_vol numeric;
  new_elem jsonb;
  total_vol numeric;
BEGIN
  FOR rec IN
    SELECT id, payload
    FROM public.workout_daily_settlements
    WHERE payload->'manualLogs' IS NOT NULL
  LOOP
    logs := COALESCE(rec.payload->'manualLogs', '[]'::jsonb);
    fixed_logs := '[]'::jsonb;

    FOR elem IN SELECT * FROM jsonb_array_elements(logs)
    LOOP
      IF (elem->>'exerciseName') ILIKE '%後三角束蝴蝶機%'
         AND COALESCE(elem->>'loadType', '') = 'unilateral'
      THEN
        lines := COALESCE(elem->'setLines', '[]'::jsonb);
        lines_vol := 0;
        FOR line IN SELECT * FROM jsonb_array_elements(lines)
        LOOP
          lines_vol := lines_vol
            + COALESCE((line->>'weightKg')::numeric, 0)
            * COALESCE((line->>'reps')::numeric, 0);
        END LOOP;

        vol := COALESCE((elem->>'volumeKg')::numeric, lines_vol);

        -- setLines 已是有效重量（舊版）：lines_vol ≈ volumeKg → 重量與訓練量都 ÷2
        -- setLines 已是單側儲存（新版顯示）：volumeKg ≈ 2×lines_vol → 只 ÷ volume，重量保留
        IF lines_vol > 0 AND vol > 0 AND ABS(vol - lines_vol) <= GREATEST(vol * 0.08, 1) THEN
          new_lines := '[]'::jsonb;
          FOR line IN SELECT * FROM jsonb_array_elements(lines)
          LOOP
            IF line ? 'weightKg' THEN
              new_lines := new_lines || jsonb_build_array(
                jsonb_set(
                  line,
                  '{weightKg}',
                  to_jsonb(ROUND(((line->>'weightKg')::numeric / 2), 1))
                )
              );
            ELSE
              new_lines := new_lines || jsonb_build_array(line);
            END IF;
          END LOOP;
          new_vol := ROUND(vol / 2, 1);
          new_elem := elem;
          new_elem := jsonb_set(new_elem, '{setLines}', new_lines);
          new_elem := jsonb_set(new_elem, '{volumeKg}', to_jsonb(new_vol));
          IF new_elem ? 'weightKg' THEN
            new_elem := jsonb_set(
              new_elem,
              '{weightKg}',
              to_jsonb(ROUND(((new_elem->>'weightKg')::numeric / 2), 1))
            );
          END IF;
          new_elem := jsonb_set(new_elem, '{loadType}', '"bilateral"');
        ELSE
          new_vol := CASE WHEN vol > 0 THEN ROUND(vol / 2, 1) ELSE vol END;
          new_elem := jsonb_set(elem, '{loadType}', '"bilateral"');
          IF elem ? 'volumeKg' THEN
            new_elem := jsonb_set(new_elem, '{volumeKg}', to_jsonb(new_vol));
          END IF;
        END IF;

        fixed_logs := fixed_logs || jsonb_build_array(new_elem);
      ELSE
        fixed_logs := fixed_logs || jsonb_build_array(elem);
      END IF;
    END LOOP;

    total_vol := 0;
    FOR elem IN SELECT * FROM jsonb_array_elements(fixed_logs)
    LOOP
      total_vol := total_vol + COALESCE((elem->>'volumeKg')::numeric, 0);
    END LOOP;

    UPDATE public.workout_daily_settlements
    SET payload = jsonb_set(
      jsonb_set(
        jsonb_set(rec.payload, '{manualLogs}', fixed_logs),
        '{totalVolumeKg}',
        to_jsonb(ROUND(total_vol, 1))
      ),
      '{volumePerBodyWeight}',
      CASE
        WHEN COALESCE((rec.payload->>'bodyWeightKg')::numeric, 0) > 0
        THEN to_jsonb(
          ROUND(
            total_vol / (rec.payload->>'bodyWeightKg')::numeric,
            1
          )
        )
        ELSE COALESCE(rec.payload->'volumePerBodyWeight', 'null'::jsonb)
      END
    )
    WHERE id = rec.id;
  END LOOP;
END $$;
