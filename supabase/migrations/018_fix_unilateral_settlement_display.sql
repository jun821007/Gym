-- 單邊結算 setLines 誤存有效重量（×2）。訓練量 volumeKg 本身正確，只把顯示重量改回單側。

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
  new_elem jsonb;
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
      IF COALESCE(elem->>'loadType', '') = 'unilateral'
         AND jsonb_typeof(elem->'setLines') = 'array'
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

        -- volume ≈ Σ(顯示重量×次數) → 顯示重量已被 ×2，應 ÷2；volume 保留
        IF lines_vol > 0 AND vol > 0
           AND ABS(vol - lines_vol) <= GREATEST(vol * 0.08, 1)
        THEN
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

          new_elem := jsonb_set(elem, '{setLines}', new_lines);
          IF new_elem ? 'weightKg' THEN
            new_elem := jsonb_set(
              new_elem,
              '{weightKg}',
              to_jsonb(ROUND(((new_elem->>'weightKg')::numeric / 2), 1))
            );
          END IF;
          fixed_logs := fixed_logs || jsonb_build_array(new_elem);
        ELSE
          fixed_logs := fixed_logs || jsonb_build_array(elem);
        END IF;
      ELSE
        fixed_logs := fixed_logs || jsonb_build_array(elem);
      END IF;
    END LOOP;

    UPDATE public.workout_daily_settlements
    SET payload = jsonb_set(rec.payload, '{manualLogs}', fixed_logs)
    WHERE id = rec.id;
  END LOOP;
END $$;
