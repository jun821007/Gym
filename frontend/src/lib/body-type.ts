import type { InbodyRecord } from "./types";

export type BodyTypeCode = "C" | "I" | "D";

export interface BodyTypeResult {
  code: BodyTypeCode;
  label: string;
  title: string;
  description: string;
  /** 骨骼肌佔體重 % */
  smmPct: number;
  /** 體脂 % */
  bodyFatPct: number;
}

/** 缺骨骼肌時，由體重與體脂粗估（僅供顯示用） */
export function estimateSkeletalMuscleKg(
  weightKg: number,
  bodyFatPct: number,
): number {
  const leanMass = weightKg * (1 - bodyFatPct / 100);
  return Math.round(leanMass * 0.52 * 10) / 10;
}

/**
 * 依 InBody 常見 C / I / D 分型邏輯推算體態
 * - D：骨骼肌比例高、體脂相對低（肌肉型）
 * - C：體脂偏高或肌肉比例偏低（脂肪型）
 * - I：介於兩者（勻稱 / 直筒型）
 */
export function calcBodyType(
  weightKg: number,
  bodyFatPct: number,
  skeletalMuscleKg?: number,
): BodyTypeResult {
  const smm =
    skeletalMuscleKg ?? estimateSkeletalMuscleKg(weightKg, bodyFatPct);
  const smmPct = Math.round((smm / weightKg) * 1000) / 10;

  let code: BodyTypeCode;

  /** D 需肌佔比高、體脂低，且絕對骨骼肌量達標（避免輕體重誤判肌肉型） */
  if (smmPct >= 42 && bodyFatPct < 22 && smm >= 26) {
    code = "D";
  } else if (bodyFatPct >= 24 || (bodyFatPct >= 20 && smmPct < 37)) {
    code = "C";
  } else {
    code = "I";
  }

  const meta: Record<
    BodyTypeCode,
    { label: string; title: string; description: string }
  > = {
    C: {
      label: "C 型",
      title: "脂肪型",
      description: "體脂偏高或肌肉比例較低，建議控制飲食並加入阻力訓練。",
    },
    I: {
      label: "I 型",
      title: "勻稱型",
      description: "體脂與肌肉比例均衡，維持現有節奏並微調訓練強度即可。",
    },
    D: {
      label: "D 型",
      title: "肌肉型",
      description: "骨骼肌比例突出，可著重週期化訓練與恢復品質。",
    },
  };

  return {
    code,
    smmPct,
    bodyFatPct,
    ...meta[code],
  };
}

export function bodyTypeFromRecord(
  record?: InbodyRecord,
): BodyTypeResult | null {
  if (
    record?.weight_kg == null ||
    record.body_fat_pct == null
  ) {
    return null;
  }
  return calcBodyType(
    record.weight_kg,
    record.body_fat_pct,
    record.skeletal_muscle_kg,
  );
}
