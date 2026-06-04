import "dotenv/config";
import cors from "cors";
import express from "express";
import dietRouter from "./routes/diet.js";
import dietChatRouter from "./routes/diet-chat.js";
import inbodyRouter from "./routes/inbody.js";
import weeklyRouter from "./routes/weekly.js";
import workoutRouter from "./routes/workout.js";

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || "0.0.0.0";

// 健康檢查放最前面，避免 CORS / body parser 影響 Railway 探測
app.get("/health", (_req, res) => {
  res.status(200).type("json").send('{"ok":true}');
});
app.head("/health", (_req, res) => {
  res.sendStatus(200);
});
app.get("/", (_req, res) => {
  res.json({ ok: true, service: "body-management-api" });
});

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

app.use("/api/chat/inbody", inbodyRouter);
app.use("/api/chat/workout", workoutRouter);
app.use("/api/chat/diet", dietChatRouter);
app.use("/api/diet", dietRouter);
app.use("/api/weekly", weeklyRouter);

const server = app.listen(PORT, HOST, () => {
  console.log(`API http://${HOST}:${PORT}`);
  console.log(`CORS: ${origins.join(", ")}`);
});

server.on("error", (err) => {
  console.error("listen failed:", err);
  process.exit(1);
});
