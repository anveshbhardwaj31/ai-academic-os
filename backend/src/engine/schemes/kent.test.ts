import { describe, it, expect } from "vitest";
import { ClassificationSchemeRulesSchema } from "../types";
import { kentClassificationScheme } from "./kent";

describe("Kent classification scheme", () => {
  it("matches the expected shape defined by ClassificationSchemeRulesSchema", () => {
    // If kentClassificationScheme doesn't match the schema, this throws
    // and the test fails with a clear error about what's wrong.
    const result = ClassificationSchemeRulesSchema.safeParse(kentClassificationScheme);
    expect(result.success).toBe(true);
  });

  it("has year weightings that sum to 100 across non-excluded years", () => {
    const includedYears = kentClassificationScheme.yearWeightings.filter(
      (y) => !y.excluded
    );
    const total = includedYears.reduce((sum, y) => sum + y.weightPercent, 0);
    expect(total).toBe(100);
  });

  it("has classification bands in descending order of minPercentage", () => {
    const percentages = kentClassificationScheme.classificationBands.map(
      (b) => b.minPercentage
    );
    const sortedDescending = [...percentages].sort((a, b) => b - a);
    expect(percentages).toEqual(sortedDescending);
  });
});