export function formatTodayLogsPrompt(todayLogs) {
  if (!Array.isArray(todayLogs) || todayLogs.length === 0) {
    return "【今日重訓清單】無手動打卡。評級須主要依截圖，並對照體態數據調整預期。";
  }

  function formatSetLines(l) {
    if (!Array.isArray(l.set_lines) || l.set_lines.length === 0) {
      return `${l.weight}kg × ${l.reps}次 × ${l.sets}組`;
    }

    const groups = [];
    for (const sl of l.set_lines) {
      const w = Number(sl.weight) || 0;
      const r = Number(sl.reps) || 0;
      const last = groups[groups.length - 1];
      if (last && last.weight === w && last.reps === r) {
        last.count += 1;
      } else {
        groups.push({ weight: w, reps: r, count: 1 });
      }
    }

    const prefix = l.load_type === "unilateral" ? "單邊 " : "";
    return groups
      .map((g) =>
        g.count > 1
          ? `${prefix}${g.weight}kg×${g.reps}×${g.count}`
          : `${prefix}${g.weight}kg×${g.reps}`,
      )
      .join(" + ");
  }

  function logVolumeKg(l) {
    const explicit = Number(l.volume);
    if (Number.isFinite(explicit) && explicit > 0) return explicit;
    const fromLines =
      Array.isArray(l.set_lines) && l.set_lines.length
        ? l.set_lines.reduce(
            (s, sl) =>
              s + (Number(sl.weight) || 0) * (Number(sl.reps) || 0),
            0,
          )
        : (Number(l.weight) || 0) *
          (Number(l.reps) || 0) *
          (Number(l.sets) || 0);
    return l.load_type === "unilateral" ? fromLines * 2 : fromLines;
  }

  const lines = todayLogs.map((l, i) => {
    const vol = logVolumeKg(l);
    return `${i + 1}. ${l.name} — ${formatSetLines(l)}（訓練量 ${Math.round(vol)}）`;
  });

  const totalVol = todayLogs.reduce((s, l) => s + logVolumeKg(l), 0);

  return `【今日重訓清單】共 ${todayLogs.length} 項，總訓練量 ${totalVol}：
${lines.join("\n")}`;
}

export function formatBodyMetricsPrompt(body) {
  if (!body?.weight_kg) {
    return "【用戶體態】尚無體重數據，評分僅依截圖與清單，請在 summary 提醒先記錄 InBody。";
  }

  const w = body.weight_kg;
  const volPerKg = body.volume_per_body_weight ?? 0;
  const bench = body.volume_per_kg_benchmarks ?? {};

  return `【用戶體態資料 — 評分必須個人化依此計算】
- 體重：${w} kg
- 體脂率：${body.body_fat_pct ?? "未知"}%
- 骨骼肌：${body.skeletal_muscle_kg ?? "未知"} kg
- 體態分型：${body.body_type_label ?? body.body_type ?? "未知"}
- 今日清單總訓練量：${body.today_volume_total ?? 0}
- 相對訓練量（訓練量÷體重）：${volPerKg}（個人化核心指標）

相對訓練量門檻（依該用戶 ${w}kg 體重）：
- ≥${bench.excellent ?? Math.round(w * 1.2)}：對此體重屬高強度，可支持上調評級
- ${bench.good ?? Math.round(w * 0.9)}～${(bench.excellent ?? Math.round(w * 1.2)) - 1}：中等
- <${bench.low ?? Math.round(w * 0.6)}：對此體重偏低

動態大卡個人化（動態大卡÷${w}kg）：
- ≥4.5 kcal/kg：優秀
- 3.2～4.4：良好
- <2.5：偏低

評級時必須：
1. 截圖數據 × 體重個人化門檻（同一大卡對 60kg 與 90kg 意義不同）
2. 清單訓練量 ÷ 體重 的相對強度
3. 體脂高(C型)可略降有氧門檻、肌肉型(D型)重訓量門檻可略提高
4. summary 須寫明「依體重 ${w}kg」的相對表現`;
}
