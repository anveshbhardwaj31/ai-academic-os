import { Router } from "express";
import { prisma } from "../db/client";
import {
  calculateAveragePaceByType,
  checkWorkloadFeasibility,
  CompletedTaskRecord,
  PendingTaskForFeasibility,
} from "../scheduling/workLog";
import { computeWeeklyFreeSlots } from "../scheduling/scheduler";

export const onTrackRouter = Router();

const LOCAL_USER_ID = "local-user";

// GET /api/on-track — combines classification status (via the existing
// route's logic conceptually) with real pace data and workload
// feasibility, into one honest "are you actually on track" view.
onTrackRouter.get("/", async (_req, res) => {
  // Completed tasks, for pace learning.
  const completedTasks = await prisma.task.findMany({
    where: {
      status: "done",
      actualMinutes: { not: null },
      assessmentComponent: { module: { userId: LOCAL_USER_ID } },
    },
  });

  const completedRecords: CompletedTaskRecord[] = completedTasks.map((t) => ({
    type: t.type,
    estimatedMinutes: t.estimatedMinutes,
    actualMinutes: t.actualMinutes as number,
  }));

  const paceByType = calculateAveragePaceByType(completedRecords);

  // Pending tasks, to check feasibility against.
  const pendingTasks = await prisma.task.findMany({
    where: {
      status: "pending",
      assessmentComponent: { module: { userId: LOCAL_USER_ID } },
    },
  });

  const pendingForFeasibility: PendingTaskForFeasibility[] = pendingTasks.map((t) => ({
    estimatedMinutes: t.estimatedMinutes,
    type: t.type,
  }));

  // Total free time available this week, from real commitment blocks.
  const commitmentBlockRows = await prisma.commitmentBlock.findMany({
    where: { userId: LOCAL_USER_ID },
  });
  const freeSlots = computeWeeklyFreeSlots(
    commitmentBlockRows.map((b) => ({
      dayOfWeek: b.dayOfWeek,
      startTime: b.startTime,
      endTime: b.endTime,
    }))
  );
  const totalFreeMinutesAvailable = freeSlots.reduce(
    (sum, slot) => sum + (slot.endMinutes - slot.startMinutes),
    0
  );

  const feasibility = checkWorkloadFeasibility(pendingForFeasibility, paceByType, totalFreeMinutesAvailable);

  res.json({
    paceByType,
    feasibility,
    completedTaskCount: completedTasks.length,
    note: completedTasks.length === 0
      ? "No completed tasks yet — pace estimates are using original task estimates, not learned data."
      : undefined,
  });
});