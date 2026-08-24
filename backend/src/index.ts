import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(cors());
app.use(express.json());

// Simple health check so you can confirm the server is running.
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Route modules will be mounted here as they're built, e.g.:
// app.use("/api/modules", moduleRoutes);
// app.use("/api/assessment-components", assessmentComponentRoutes);
// app.use("/api/classification", classificationRoutes);

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});