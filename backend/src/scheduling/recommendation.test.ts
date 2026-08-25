import { describe, it, expect } from "vitest";
import { getTopRecommendation, RecommendableTask } from "./recommendation";

describe("getTopRecommendation", () => {
  it("picks the higher-priority task between two competing options", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");

    const tasks: RecommendableTask[] = [
      {
        id: "task-A",
        title: "Draft",
        estimatedMinutes: 120,
        deadline: new Date("2026-01-03T00:00:00.000Z"), // 2 days away
        weightingPct: 40,
        assessmentComponentName: "Coursework Essay",
        moduleName: "Software Engineering",
      },
      {
        id: "task-B",
        title: "Practice questions",
        estimatedMinutes: 90,
        deadline: new Date("2026-01-11T00:00:00.000Z"), // 10 days away
        weightingPct: 60,
        assessmentComponentName: "Final Exam",
        moduleName: "Software Engineering",
      },
    ];

    // Priority: A = 40/2 = 20, B = 60/10 = 6 — A should win despite
    // having a lower weighting, because it's much more urgent.
    const result = getTopRecommendation(tasks, now);

    expect(result).not.toBeNull();
    expect(result!.task.id).toBe("task-A");
    expect(result!.explanation).toContain("Coursework Essay");
    expect(result!.explanation).toContain("due in 2 days");
  });

  it("returns null when there are no pending tasks", () => {
    const result = getTopRecommendation([], new Date());
    expect(result).toBeNull();
  });

  it("describes an overdue task correctly in the explanation", () => {
    const now = new Date("2026-01-10T00:00:00.000Z");

    const tasks: RecommendableTask[] = [
      {
        id: "task-C",
        title: "Submit",
        estimatedMinutes: 30,
        deadline: new Date("2026-01-05T00:00:00.000Z"), // already past
        weightingPct: 40,
        assessmentComponentName: "Coursework Essay",
        moduleName: "Software Engineering",
      },
    ];

    const result = getTopRecommendation(tasks, now);
    expect(result!.explanation).toContain("overdue");
  });
});