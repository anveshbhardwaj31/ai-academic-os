import { describe, it, expect } from "vitest";
import { generateTasksForComponent, ComponentForTaskGeneration } from "./taskGeneration";

describe("generateTasksForComponent", () => {
  it("generates a correctly-split coursework breakdown", () => {
    // 20-credit module, coursework weighted 40%.
    // Total estimate: 20 * 1 * 0.4 = 8 hours = 480 minutes.
    const component: ComponentForTaskGeneration = {
      type: "coursework",
      weightingPct: 40,
      moduleCredits: 20,
    };

    const tasks = generateTasksForComponent(component);

    expect(tasks).toHaveLength(4);
    expect(tasks.map((t) => t.title)).toEqual(["Research", "Draft", "Revise", "Submit"]);

    // 480 * 0.25 = 120, 480 * 0.45 = 216, 480 * 0.2 = 96, 480 * 0.1 = 48
    expect(tasks[0].estimatedMinutes).toBe(120);
    expect(tasks[1].estimatedMinutes).toBe(216);
    expect(tasks[2].estimatedMinutes).toBe(96);
    expect(tasks[3].estimatedMinutes).toBe(48);

    // The four splits should always sum back to the total estimate —
    // worth checking this holds generally, not just for this example.
    const sum = tasks.reduce((s, t) => s + t.estimatedMinutes, 0);
    expect(sum).toBe(480);
  });

  it("generates a correctly-split exam revision breakdown", () => {
    // 20-credit module, exam weighted 60%.
    // Total estimate: 20 * 1 * 0.6 = 12 hours = 720 minutes.
    const component: ComponentForTaskGeneration = {
      type: "exam",
      weightingPct: 60,
      moduleCredits: 20,
    };

    const tasks = generateTasksForComponent(component);

    expect(tasks).toHaveLength(4);
    expect(tasks.map((t) => t.title)).toEqual([
      "Review notes",
      "Practice questions",
      "Mock exam",
      "Review weak areas",
    ]);

    // 720 * 0.3 = 216, 720 * 0.4 = 288, 720 * 0.2 = 144, 720 * 0.1 = 72
    expect(tasks[0].estimatedMinutes).toBe(216);
    expect(tasks[1].estimatedMinutes).toBe(288);
    expect(tasks[2].estimatedMinutes).toBe(144);
    expect(tasks[3].estimatedMinutes).toBe(72);

    const sum = tasks.reduce((s, t) => s + t.estimatedMinutes, 0);
    expect(sum).toBe(720);
  });

  it("scales down correctly for a low-weighting component", () => {
    // A 10-credit module, coursework weighted only 10% — should
    // produce a small but still sensible time estimate.
    const component: ComponentForTaskGeneration = {
      type: "coursework",
      weightingPct: 10,
      moduleCredits: 10,
    };

    const tasks = generateTasksForComponent(component);
    const sum = tasks.reduce((s, t) => s + t.estimatedMinutes, 0);

    // 10 * 1 * 0.1 = 1 hour = 60 minutes total
    expect(sum).toBe(60);
  });
});