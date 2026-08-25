import express from "express";
import cors from "cors";
import { universitiesRouter } from "./api/universities";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(cors());
app.use(express.json());

// Simple health check so you can confirm the server is running.
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/universities", universitiesRouter);

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});