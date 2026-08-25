import { describe, it, expect } from "vitest";
import { scheduleTasks, SchedulableTask, CommitmentBlockInput, computeWeeklyFreeSlots } from "./scheduler";

describe("scheduleTasks", () => {
  it("schedules by priority, skips a fully-blocked day, and leaves an oversized task unscheduled", () => {
    // Fixed "now" for deterministic test results.
    const now = new Date("2026-01-01T00:00:00.000Z");

    const commitmentBlocks: CommitmentBlockInput[] = [
      // Sunday (day 0) fully blocked — the scheduler should skip it entirely.
      { dayOfWeek: 0, startTime: "08:00", endTime: "23:00" },
      // Monday (day 1) blocked 9am-11am, leaving two free slots:
      // 8:00-9:00 (60 min) and 11:00-23:00 (720 min).
      { dayOfWeek: 1, startTime: "09:00", endTime: "11:00" },
    ];

    const tasks: SchedulableTask[] = [
      {
        id: "task-A",
        estimatedMinutes: 50, // fits the small 8:00-9:00 slot
        deadline: new Date("2026-01-03T00:00:00.000Z"), // 2 days away
        weightingPct: 80,
      },
      {
        id: "task-B",
        estimatedMinutes: 700, // fits the large 11:00-23:00 slot
        deadline: new Date("2026-01-11T00:00:00.000Z"), // 10 days away
        weightingPct: 50,
      },
      {
        id: "task-C",
        estimatedMinutes: 1000, // exceeds the max possible single-day window (900 min)
        deadline: new Date("2026-01-31T00:00:00.000Z"), // 30 days away
        weightingPct: 5,
      },
    ];

    // Priority scores: A = 80/2 = 40, B = 50/10 = 5, C = 5/30 ≈ 0.167
    // Expected order: A first, then B, then C.

    const result = scheduleTasks(tasks, commitmentBlocks, now);

    expect(result.scheduled).toHaveLength(2);
    expect(result.unscheduled).toHaveLength(1);
    expect(result.unscheduled[0].id).toBe("task-C");

    const scheduledA = result.scheduled.find((s) => s.taskId === "task-A");
    const scheduledB = result.scheduled.find((s) => s.taskId === "task-B");

    // Task A: Monday (day 1), 8:00 (480 min) to 8:50 (530 min)
    expect(scheduledA?.dayOfWeek).toBe(1);
    expect(scheduledA?.startMinutes).toBe(480);
    expect(scheduledA?.endMinutes).toBe(530);

    // Task B: Monday (day 1), 11:00 (660 min) to 22:40 (1360 min)
    expect(scheduledB?.dayOfWeek).toBe(1);
    expect(scheduledB?.startMinutes).toBe(660);
    expect(scheduledB?.endMinutes).toBe(1360);
  });

  it("returns no scheduled tasks when there are no free slots at all", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");

    // Block every single day fully.
    const commitmentBlocks: CommitmentBlockInput[] = Array.from({ length: 7 }, (_, day) => ({
      dayOfWeek: day,
      startTime: "08:00",
      endTime: "23:00",
    }));

    const tasks: SchedulableTask[] = [
      {
        id: "task-X",
        estimatedMinutes: 30,
        deadline: new Date("2026-01-05T00:00:00.000Z"),
        weightingPct: 50,
      },
    ];

    const result = scheduleTasks(tasks, commitmentBlocks, now);

    expect(result.scheduled).toHaveLength(0);
    expect(result.unscheduled).toHaveLength(1);
  });
});

describe("scheduleTasks — avoids scheduling into the past on the current day", () => {
  it("doesn't offer free time earlier than the current moment on today", () => {
    const now = new Date("2026-01-05T14:00:00.000Z"); // Monday, 14:00 UTC

    // Block out Sunday entirely. The scheduler's v1 iteration order
    // still walks Sunday-first regardless of "now" — it doesn't yet
    // know Sunday has already passed this week — so blocking it here
    // isolates the specific thing we actually fixed: today's own
    // partial-day cutoff, not full week reordering (a known, deferred
    // limitation noted in computeWeeklyFreeSlots).
    const commitmentBlocks: CommitmentBlockInput[] = [
      { dayOfWeek: 0, startTime: "08:00", endTime: "23:00" },
    ];

    const tasks: SchedulableTask[] = [
      {
        id: "task-today",
        estimatedMinutes: 30,
        deadline: new Date("2026-01-06T00:00:00.000Z"),
        weightingPct: 50,
      },
    ];

    const result = scheduleTasks(tasks, commitmentBlocks, now);

    expect(result.scheduled).toHaveLength(1);
    const scheduled = result.scheduled[0];

    expect(scheduled.dayOfWeek).toBe(1);
    expect(scheduled.startMinutes).toBeGreaterThanOrEqual(840);
  });

  it("correctly returns no free time today if 'now' is already past the working day end", () => {
    // "Now" is Monday at 23:30 UTC — past the 23:00 cutoff.
    const now = new Date("2026-01-05T23:30:00.000Z");
    const commitmentBlocks: CommitmentBlockInput[] = [];

    const freeSlots = computeWeeklyFreeSlots(commitmentBlocks, now);
    const todaySlots = freeSlots.filter((s) => s.dayOfWeek === 1);

    // No free slots should exist for today, since it's already past 23:00.
    expect(todaySlots).toHaveLength(0);
  });
});