import { describe, it, expect } from "vitest";
import { ClassificationSchemeRulesSchema } from "../types";
import { uclClassificationScheme } from "./ucl";

describe("UCL classification scheme", () => {
  it("matches the expected shape defined by ClassificationSchemeRulesSchema", () => {
    const result = ClassificationSchemeRulesSchema.safeParse(uclClassificationScheme);
    expect(result.success).toBe(true);
  });

  it("has year weightings that sum to 100 across non-excluded years", () => {
    const includedYears = uclClassificationScheme.yearWeightings.filter((y) => !y.excluded);
    const total = includedYears.reduce((sum, y) => sum + y.weightPercent, 0);
    expect(total).toBeCloseTo(100);
  });

  it("has classification bands in descending order of minPercentage", () => {
    const percentages = uclClassificationScheme.classificationBands.map((b) => b.minPercentage);
    const sortedDescending = [...percentages].sort((a, b) => b - a);
    expect(percentages).toEqual(sortedDescending);
  });

  it("correctly reflects UCL's 3:5 ratio as 37.5%:62.5%", () => {
    const year2 = uclClassificationScheme.yearWeightings.find((y) => y.year === 2);
    const year3 = uclClassificationScheme.yearWeightings.find((y) => y.year === 3);
    expect(year2?.weightPercent).toBeCloseTo(37.5);
    expect(year3?.weightPercent).toBeCloseTo(62.5);
  });
});