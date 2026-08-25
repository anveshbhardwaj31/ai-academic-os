import { Router } from "express";
import { prisma } from "../db/client";
import { calculateDurationMinutes, calculatePaceRatio } from "../scheduling/workLog";

export const tasksRouter = Router();

const LOCAL_USER_ID = "local-user";

// POST /api/tasks/:id/start — marks a task as in progress and creates
// an open WorkLog row (endedAt still null) to track when work began.
tasksRouter.post("/:id/start", async (req, res) => {
  const { id } = req.params;

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) {
    res.status(404).json({ error: `Task '${id}' not found` });
    return;
  }

  const workLog = await prisma.workLog.create({
    data: {
      userId: LOCAL_USER_ID,
      taskId: id,
      startedAt: new Date(),
    },
  });

  await prisma.task.update({
    where: { id },
    data: { status: "in_progress" },
  });

  res.status(201).json(workLog);
});

// POST /api/tasks/:id/complete — closes the open WorkLog, calculates
// actual duration and pace ratio, and marks the task done.
tasksRouter.post("/:id/complete", async (req, res) => {
  const { id } = req.params;

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) {
    res.status(404).json({ error: `Task '${id}' not found` });
    return;
  }

  const openWorkLog = await prisma.workLog.findFirst({
    where: { taskId: id, endedAt: null },
    orderBy: { startedAt: "desc" },
  });

  if (!openWorkLog) {
    res.status(400).json({ error: "No open work session found for this task — call /start first" });
    return;
  }

  const endedAt = new Date();
  await prisma.workLog.update({
    where: { id: openWorkLog.id },
    data: { endedAt },
  });

  const actualMinutes = calculateDurationMinutes(openWorkLog.startedAt, endedAt);
  let paceRatio: number | null = null;
  try {
    paceRatio = calculatePaceRatio(actualMinutes, task.estimatedMinutes);
  } catch {
    paceRatio = null; // estimatedMinutes was somehow 0 — don't let this block completion
  }

  const updatedTask = await prisma.task.update({
    where: { id },
    data: { status: "done", actualMinutes },
  });

  res.json({ task: updatedTask, actualMinutes, paceRatio });
});

// POST /api/tasks/:id/skip — marks a task as skipped without a work
// session, for when a student deliberately decides not to do it.
tasksRouter.post("/:id/skip", async (req, res) => {
  const { id } = req.params;

  try {
    const task = await prisma.task.update({
      where: { id },
      data: { status: "skipped" },
    });
    res.json(task);
  } catch {
    res.status(404).json({ error: `Task '${id}' not found` });
  }
});