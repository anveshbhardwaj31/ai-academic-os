import { Router } from "express";
import { prisma } from "../db/client";
import { scheduleTasks, SchedulableTask, CommitmentBlockInput } from "../scheduling/scheduler";

export const scheduleRouter = Router();

const LOCAL_USER_ID = "local-user";

// GET /api/schedule — pulls all pending tasks and commitment blocks for
// the local user, runs them through the scheduler, and returns the
// resulting weekly plan.
scheduleRouter.get("/", async (_req, res) => {
  // Pending tasks, with their parent assessment component's deadline
  // and weighting attached — the scheduler needs both to prioritize.
  const pendingTasks = await prisma.task.findMany({
    where: {
      status: "pending",
      assessmentComponent: { module: { userId: LOCAL_USER_ID } },
    },
    include: { assessmentComponent: true },
  });

  const schedulableTasks: SchedulableTask[] = pendingTasks.map((t) => ({
    id: t.id,
    estimatedMinutes: t.estimatedMinutes,
    deadline: t.assessmentComponent.deadline,
    weightingPct: t.assessmentComponent.weightingPct,
  }));

  const commitmentBlockRows = await prisma.commitmentBlock.findMany({
    where: { userId: LOCAL_USER_ID },
  });

  const commitmentBlocks: CommitmentBlockInput[] = commitmentBlockRows.map((b) => ({
    dayOfWeek: b.dayOfWeek,
    startTime: b.startTime,
    endTime: b.endTime,
  }));

  const { scheduled, unscheduled } = scheduleTasks(schedulableTasks, commitmentBlocks);

  // Attach each scheduled/unscheduled task's readable details (title,
  // which assessment/module it belongs to) back onto the result, since
  // the scheduler itself only deals with bare IDs and doesn't know
  // about titles or module names.
  const taskDetailsById = new Map(
    pendingTasks.map((t) => [
      t.id,
      {
        title: t.title,
        type: t.type,
        assessmentComponentName: t.assessmentComponent.name,
      },
    ])
  );

  res.json({
    scheduled: scheduled.map((s) => ({
      ...s,
      ...taskDetailsById.get(s.taskId),
    })),
    unscheduled: unscheduled.map((u) => ({
      taskId: u.id,
      ...taskDetailsById.get(u.id),
    })),
  });
});