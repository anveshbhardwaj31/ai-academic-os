import { describe, it, expect } from "vitest";
import { calculateDurationMinutes, calculatePaceRatio } from "./workLog";

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