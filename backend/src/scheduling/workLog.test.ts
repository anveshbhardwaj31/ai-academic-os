import { describe, it, expect } from "vitest";
import { calculateDurationMinutes, calculatePaceRatio } from "./workLog";
import { calculateAveragePaceByType, applyPaceAdjustment, CompletedTaskRecord, checkWorkloadFeasibility, PendingTaskForFeasibility } from "./workLog";

describe("calculateDurationMinutes", () => {
  it("calculates duration correctly for a 90-minute session", () => {
    const start = new Date("2026-01-01T09:00:00.000Z");
    const end = new Date("2026-01-01T10:30:00.000Z");
    expect(calculateDurationMinutes(start, end)).toBe(90);
  });
});

describe("calculatePaceRatio", () => {
  it("returns 1.0 when actual time matches the estimate exactly", () => {
    expect(calculatePaceRatio(120, 120)).toBeCloseTo(1.0);
  });

  it("returns a ratio above 1 when a task took longer than estimated", () => {
    // Estimated 60 minutes, actually took 90 — ratio 1.5, i.e. 50% longer.
    expect(calculatePaceRatio(90, 60)).toBeCloseTo(1.5);
  });

  it("returns a ratio below 1 when a task was quicker than estimated", () => {
    // Estimated 100 minutes, actually took 80 — ratio 0.8, i.e. 20% quicker.
    expect(calculatePaceRatio(80, 100)).toBeCloseTo(0.8);
  });

  it("throws if estimatedMinutes is zero or negative", () => {
    expect(() => calculatePaceRatio(50, 0)).toThrow();
  });
});

describe("calculateAveragePaceByType", () => {
  it("averages pace ratio correctly within each task type", () => {
    const records: CompletedTaskRecord[] = [
      // Research: two tasks, ratios 1.5 and 1.0 → average 1.25
      { type: "research", estimatedMinutes: 100, actualMinutes: 150 },
      { type: "research", estimatedMinutes: 100, actualMinutes: 100 },
      // Draft: one task, ratio 0.8
      { type: "draft", estimatedMinutes: 200, actualMinutes: 160 },
    ];

    const result = calculateAveragePaceByType(records);

    const research = result.find((r) => r.type === "research");
    const draft = result.find((r) => r.type === "draft");

    expect(research?.averagePaceRatio).toBeCloseTo(1.25);
    expect(research?.sampleSize).toBe(2);

    expect(draft?.averagePaceRatio).toBeCloseTo(0.8);
    expect(draft?.sampleSize).toBe(1);
  });

  it("returns an empty array when there are no completed records", () => {
    expect(calculateAveragePaceByType([])).toEqual([]);
  });

  it("skips records with zero or negative estimatedMinutes rather than throwing", () => {
    const records: CompletedTaskRecord[] = [
      { type: "research", estimatedMinutes: 0, actualMinutes: 50 }, // bad data, should be skipped
      { type: "research", estimatedMinutes: 100, actualMinutes: 100 },
    ];

    const result = calculateAveragePaceByType(records);
    const research = result.find((r) => r.type === "research");

    // Only the valid record should count.
    expect(research?.sampleSize).toBe(1);
    expect(research?.averagePaceRatio).toBeCloseTo(1.0);
  });
});

describe("applyPaceAdjustment", () => {
    it("adjusts an estimate upward using a learned pace ratio above 1, once minimum sample size is met", () => {
        const paceByType = [{ type: "research", averagePaceRatio: 1.25, sampleSize: 3 }];
        // 100 minutes estimated, historically takes 1.25x as long → 125
        expect(applyPaceAdjustment(100, "research", paceByType)).toBe(125);
    });
    
    it("does not adjust an estimate if sample size is below the minimum threshold", () => {
        const paceByType = [{ type: "research", averagePaceRatio: 1.25, sampleSize: 2 }];
        // Only 2 samples — below the default minimum of 3 — should stay unadjusted.
        expect(applyPaceAdjustment(100, "research", paceByType)).toBe(100);
    });

  it("returns the original estimate unchanged when no pace data exists for that type", () => {
    const paceByType = [{ type: "research", averagePaceRatio: 1.25, sampleSize: 2 }];
    // No data for "practice" — should fall back to the raw estimate.
    expect(applyPaceAdjustment(100, "practice", paceByType)).toBe(100);
  });
});

describe("checkWorkloadFeasibility", () => {
  it("reports feasible when adjusted time needed fits within available time", () => {
    const pendingTasks: PendingTaskForFeasibility[] = [
      { estimatedMinutes: 100, type: "research" }, // adjusted: 100 * 1.25 = 125
      { estimatedMinutes: 200, type: "draft" },     // adjusted: 200 * 0.8 = 160
    ];
    const paceByType = [
      { type: "research", averagePaceRatio: 1.25, sampleSize: 3 },
      { type: "draft", averagePaceRatio: 0.8, sampleSize: 3 },
    ];

    // Total adjusted needed: 125 + 160 = 285. Available: 300 — feasible.
    const result = checkWorkloadFeasibility(pendingTasks, paceByType, 300);

    expect(result.totalAdjustedMinutesNeeded).toBe(285);
    expect(result.isFeasible).toBe(true);
    expect(result.shortfallMinutes).toBe(0);
  });

  it("reports infeasible with a correct shortfall when there isn't enough time", () => {
    const pendingTasks: PendingTaskForFeasibility[] = [
      { estimatedMinutes: 100, type: "research" }, // adjusted: 125
      { estimatedMinutes: 200, type: "draft" },     // adjusted: 160
    ];
    const paceByType = [
      { type: "research", averagePaceRatio: 1.25, sampleSize: 3 },
      { type: "draft", averagePaceRatio: 0.8, sampleSize: 3 },
    ];

    // Total adjusted needed: 285. Available: only 200 — infeasible, short by 85.
    const result = checkWorkloadFeasibility(pendingTasks, paceByType, 200);

    expect(result.isFeasible).toBe(false);
    expect(result.shortfallMinutes).toBe(85);
  });

  it("falls back to raw estimates for task types with no pace data", () => {
    const pendingTasks: PendingTaskForFeasibility[] = [
      { estimatedMinutes: 100, type: "practice" }, // no pace data — stays 100
    ];
    const result = checkWorkloadFeasibility(pendingTasks, [], 100);

    expect(result.totalAdjustedMinutesNeeded).toBe(100);
    expect(result.isFeasible).toBe(true);
  });
});