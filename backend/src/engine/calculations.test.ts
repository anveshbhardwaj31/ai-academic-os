import { describe, it, expect } from "vitest";
import {
  calculateModuleMark,
  calculateYearAverage,
  ModuleMarks,
  calculateOverallClassification,
  YearResult,
  calculateRequiredYearAverage,
  calculateRequiredAverageForRemainingModules,
  PartialYearProgress,
} from "./calculations";
import { kentClassificationScheme } from "./schemes/kent";
import { uclClassificationScheme } from "./schemes/ucl";

describe("calculateModuleMark", () => {
  it("calculates a weighted average across components correctly", () => {
    // Coursework worth 40%, exam worth 60% — a common real split.
    const module: ModuleMarks = {
      credits: 20,
      components: [
        { weightingPct: 40, mark: 70 }, // coursework
        { weightingPct: 60, mark: 60 }, // exam
      ],
    };
    // Expected: (70 * 0.4) + (60 * 0.6) = 28 + 36 = 64
    expect(calculateModuleMark(module)).toBeCloseTo(64);
  });

  it("returns null when a component is still ungraded", () => {
    const module: ModuleMarks = {
      credits: 20,
      components: [
        { weightingPct: 40, mark: 70 },
        { weightingPct: 60, mark: null }, // exam not sat yet
      ],
    };
    expect(calculateModuleMark(module)).toBeNull();
  });

  it("throws if component weightings don't sum to 100", () => {
    const module: ModuleMarks = {
      credits: 20,
      components: [
        { weightingPct: 40, mark: 70 },
        { weightingPct: 50, mark: 60 }, // sums to 90, not 100 — bad data
      ],
    };
    expect(() => calculateModuleMark(module)).toThrow();
  });
});

describe("calculateYearAverage", () => {
  it("calculates a credit-weighted average across modules correctly", () => {
    const modules: ModuleMarks[] = [
      {
        credits: 40, // double module, e.g. a big core module
        components: [{ weightingPct: 100, mark: 80 }],
      },
      {
        credits: 20,
        components: [{ weightingPct: 100, mark: 50 }],
      },
    ];
    // Expected: ((80 * 40) + (50 * 20)) / (40 + 20)
    //         = (3200 + 1000) / 60 = 4200 / 60 = 70
    expect(calculateYearAverage(modules)).toBeCloseTo(70);
  });

  it("returns null if any module in the year is still ungraded", () => {
    const modules: ModuleMarks[] = [
      {
        credits: 20,
        components: [{ weightingPct: 100, mark: 80 }],
      },
      {
        credits: 20,
        components: [{ weightingPct: 100, mark: null }], // not graded yet
      },
    ];
    expect(calculateYearAverage(modules)).toBeNull();
  });
});

describe("calculateOverallClassification", () => {
  it("calculates the correct overall percentage and classification for a 2:1", () => {
    const yearResults: YearResult[] = [
      { year: 2, average: 55 },
      { year: 3, average: 68 },
    ];
    const result = calculateOverallClassification(yearResults, kentClassificationScheme);

    // (55 * 0.4) + (68 * 0.6) = 22 + 40.8 = 62.8
    expect(result.overallPercentage).toBeCloseTo(62.8);
    expect(result.classification).toBe("2:1");
  });

  it("classifies a strong result as a First", () => {
    const yearResults: YearResult[] = [
      { year: 2, average: 72 },
      { year: 3, average: 75 },
    ];
    const result = calculateOverallClassification(yearResults, kentClassificationScheme);

    // (72 * 0.4) + (75 * 0.6) = 28.8 + 45 = 73.8
    expect(result.overallPercentage).toBeCloseTo(73.8);
    expect(result.classification).toBe("First");
  });

  it("returns Fail for a percentage below the lowest band", () => {
    const yearResults: YearResult[] = [
      { year: 2, average: 30 },
      { year: 3, average: 35 },
    ];
    const result = calculateOverallClassification(yearResults, kentClassificationScheme);

    // (30 * 0.4) + (35 * 0.6) = 12 + 21 = 33
    expect(result.overallPercentage).toBeCloseTo(33);
    expect(result.classification).toBe("Fail");
  });

  it("throws when a required year is missing from the results", () => {
    const yearResults: YearResult[] = [
      { year: 2, average: 55 },
      // Year 3 missing entirely
    ];
    expect(() =>
      calculateOverallClassification(yearResults, kentClassificationScheme)
    ).toThrow();
  });
});

describe("calculateRequiredYearAverage", () => {
  it("calculates the required Year 3 average for a First, given a completed Year 2", () => {
    const completedYears: YearResult[] = [{ year: 2, average: 58 }];
    const result = calculateRequiredYearAverage(
      completedYears,
      3,
      "First",
      kentClassificationScheme
    );

    // Secured from Year 2: 58 * 0.4 = 23.2
    // Remaining needed: 70 - 23.2 = 46.8
    // Required Year 3 average: 46.8 / 0.6 = 78
    expect(result.requiredAverage).toBeCloseTo(78);
    expect(result.isAchievable).toBe(true);
    expect(result.alreadySecured).toBe(false);
  });

  it("flags as unachievable when the required average exceeds 100%", () => {
    // A very low Year 2 average makes a First in Year 3 alone impossible.
    const completedYears: YearResult[] = [{ year: 2, average: 20 }];
    const result = calculateRequiredYearAverage(
      completedYears,
      3,
      "First",
      kentClassificationScheme
    );

    // Secured from Year 2: 20 * 0.4 = 8
    // Remaining needed: 70 - 8 = 62
    // Required Year 3 average: 62 / 0.6 = 103.33 — impossible
    expect(result.requiredAverage).toBeGreaterThan(100);
    expect(result.isAchievable).toBe(false);
  });

  it("never reports 'already secured' under Kent's scheme, since Year 3 always carries some required minimum", () => {
    // Even a perfect Year 2 (100%) can't fully secure a classification
    // on its own, because Year 3 carries 60% weight — there's always
    // some minimum Year 3 average still required.
    const completedYears: YearResult[] = [{ year: 2, average: 100 }];
    const result = calculateRequiredYearAverage(
      completedYears,
      3,
      "2:2",
      kentClassificationScheme
    );

    // Secured from Year 2: 100 * 0.4 = 40
    // Remaining needed: 50 - 40 = 10
    // Required Year 3 average: 10 / 0.6 = 16.67
    expect(result.requiredAverage).toBeCloseTo(16.67, 1);
    expect(result.alreadySecured).toBe(false);
  });
});

describe("calculateRequiredAverageForRemainingModules", () => {
  it("calculates the required average on remaining credits mid-year", () => {
    const completedYears: YearResult[] = [{ year: 2, average: 65 }];

    const partialYear: PartialYearProgress = {
      year: 3,
      knownModules: [
        {
          credits: 20,
          components: [{ weightingPct: 100, mark: 80 }],
        },
      ],
      remainingCredits: 100,
    };

    const result = calculateRequiredAverageForRemainingModules(
      completedYears,
      partialYear,
      "First",
      kentClassificationScheme
    );

    // Secured from Year 2: 65 * 0.4 = 26
    // Remaining needed overall: 70 - 26 = 44
    // Year 3 average needed: 44 / 0.6 = 73.33
    // Known contribution: 80 * 20 = 1600, over 120 total year credits
    // Required average on remaining 100 credits:
    //   (73.33 * 120 - 1600) / 100 = (8800 - 1600) / 100 = 72
    expect(result.yearAverageNeeded).toBeCloseTo(73.33, 1);
    expect(result.requiredAverageOnRemaining).toBeCloseTo(72, 1);
    expect(result.isAchievable).toBe(true);
    expect(result.alreadySecured).toBe(false);
  });

  it("throws if remainingCredits is 0 — the caller should use the fully-graded path instead", () => {
    const completedYears: YearResult[] = [{ year: 2, average: 65 }];
    const partialYear: PartialYearProgress = {
      year: 3,
      knownModules: [],
      remainingCredits: 0,
    };

    expect(() =>
      calculateRequiredAverageForRemainingModules(
        completedYears,
        partialYear,
        "First",
        kentClassificationScheme
      )
    ).toThrow();
  });

  it("flags as unachievable when the required average on remaining credits exceeds 100%", () => {
    const completedYears: YearResult[] = [{ year: 2, average: 30 }];

    const partialYear: PartialYearProgress = {
      year: 3,
      knownModules: [
        {
          credits: 20,
          components: [{ weightingPct: 100, mark: 45 }],
        },
      ],
      remainingCredits: 100,
    };

    const result = calculateRequiredAverageForRemainingModules(
      completedYears,
      partialYear,
      "First",
      kentClassificationScheme
    );

    // Secured from Year 2: 30 * 0.4 = 12
    // Remaining needed overall: 70 - 12 = 58
    // Year 3 average needed: 58 / 0.6 = 96.67
    // Known contribution: 45 * 20 = 900, over 120 total year credits
    // Required average on remaining 100 credits:
    //   (96.67 * 120 - 900) / 100 = (11600 - 900) / 100 = 107
    expect(result.requiredAverageOnRemaining).toBeGreaterThan(100);
    expect(result.isAchievable).toBe(false);
  });
});

describe("calculateOverallClassification — works correctly against UCL's scheme too", () => {
  it("calculates a 2:1 correctly under UCL's 37.5:62.5 weighting", () => {
    const yearResults: YearResult[] = [
      { year: 2, average: 58 },
      { year: 3, average: 65 },
    ];
    const result = calculateOverallClassification(yearResults, uclClassificationScheme);

    // (58 * 0.375) + (65 * 0.625) = 21.75 + 40.625 = 62.375
    expect(result.overallPercentage).toBeCloseTo(62.375);
    expect(result.classification).toBe("2:1");
  });

  it("calculates the required Year 3 average for a First under UCL's weighting", () => {
    const completedYears: YearResult[] = [{ year: 2, average: 60 }];
    const result = calculateRequiredYearAverage(completedYears, 3, "First", uclClassificationScheme);

    // Secured from Year 2: 60 * 0.375 = 22.5
    // Remaining needed: 70 - 22.5 = 47.5
    // Required Year 3 average: 47.5 / 0.625 = 76
    expect(result.requiredAverage).toBeCloseTo(76);
    expect(result.isAchievable).toBe(true);
  });
});