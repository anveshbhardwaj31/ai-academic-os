import { Router } from "express";
import { prisma } from "../db/client";
import { getTopRecommendation, RecommendableTask } from "../scheduling/recommendation";

export const recommendationRouter = Router();

const LOCAL_USER_ID = "local-user";

// GET /api/recommendation — the "what should I do right now" endpoint.
recommendationRouter.get("/", async (_req, res) => {
  const pendingTasks = await prisma.task.findMany({
    where: {
      status: "pending",
      assessmentComponent: { module: { userId: LOCAL_USER_ID } },
    },
    include: { assessmentComponent: { include: { module: true } } },
  });

  const recommendableTasks: RecommendableTask[] = pendingTasks.map((t) => ({
    id: t.id,
    title: t.title,
    estimatedMinutes: t.estimatedMinutes,
    deadline: t.assessmentComponent.deadline,
    weightingPct: t.assessmentComponent.weightingPct,
    assessmentComponentName: t.assessmentComponent.name,
    moduleName: t.assessmentComponent.module.name,
  }));

  const recommendation = getTopRecommendation(recommendableTasks);

  if (!recommendation) {
    res.json({ recommendation: null, message: "No pending tasks — nothing to recommend right now." });
    return;
  }

  res.json({ recommendation });
});