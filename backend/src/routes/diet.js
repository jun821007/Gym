import { Router } from "express";
import { computeDietSettlement, xpForDietGrade } from "../lib/diet-grading.js";

const router = Router();

router.post("/settle", (req, res) => {
  try {
    const { goals, totals, meals, waterMl } = req.body ?? {};

    if (!goals || !totals) {
      return res.status(400).json({
        error: "缺少 goals 或 totals",
        reply: "請先記錄今日餐點或飲水後再結算。",
      });
    }

    const settlement = computeDietSettlement({
      goals,
      totals,
      meals: Array.isArray(meals) ? meals : [],
      waterMl: Number(waterMl) || 0,
    });

    const grade = settlement.grade;

    res.json({
      reply: settlement.summary,
      settlement,
      profileUpdate: { xpGained: xpForDietGrade(grade) },
    });
  } catch (err) {
    console.error("[diet/settle]", err);
    res.status(500).json({
      error: err.message || "結算失敗",
      reply: "飲食結算失敗，請稍後再試。",
    });
  }
});

export default router;
