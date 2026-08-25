import express from "express";
import cors from "cors";
import { universitiesRouter } from "./api/universities";
import { modulesRouter } from "./api/modules";
import { assessmentComponentsRouter } from "./api/assessmentComponents";
import { classificationRouter } from "./api/classification";
import { commitmentBlocksRouter } from "./api/commitmentBlocks";
import { scheduleRouter } from "./api/schedule";
import { recommendationRouter } from "./api/recommendation";
import { tasksRouter } from "./api/tasks";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(cors());
app.use(express.json());

// Simple health check so you can confirm the server is running.
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/universities", universitiesRouter);
app.use("/api/modules", modulesRouter);
app.use("/api/assessment-components", assessmentComponentsRouter);
app.use("/api/classification", classificationRouter);
app.use("/api/commitment-blocks", commitmentBlocksRouter);
app.use("/api/schedule", scheduleRouter);
app.use("/api/recommendation", recommendationRouter);
app.use("/api/tasks", tasksRouter);

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});