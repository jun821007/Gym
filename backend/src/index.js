import "dotenv/config";
import cors from "cors";
import express from "express";
import dietRouter from "./routes/diet.js";
import dietChatRouter from "./routes/diet-chat.js";
import inbodyRouter from "./routes/inbody.js";
import weeklyRouter from "./routes/weekly.js";
import workoutRouter from "./routes/workout.js";

const app = express();
const PORT = process.env.PORT || 3001;

const origins = (process.env.CORS_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((s) => s.trim());

app.use(
  cors({
    origin: origins,
    methods: ["GET", "POST", "OPTIONS"],
  }),
);
app.use(express.json({ limit: "12mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/chat/inbody", inbodyRouter);
app.use("/api/chat/workout", workoutRouter);
app.use("/api/chat/diet", dietChatRouter);
app.use("/api/diet", dietRouter);
app.use("/api/weekly", weeklyRouter);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`API http://0.0.0.0:${PORT}`);
  console.log(`CORS: ${origins.join(", ")}`);
});
