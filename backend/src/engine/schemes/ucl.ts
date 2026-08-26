import { ClassificationSchemeRules } from "../types";

// University College London — undergraduate honours classification,
// Scheme A (the default scheme; Engineering/MAPS/Pharmacy use Scheme B,
// Laws uses Scheme C — not encoded here, since this is a starting
// reference point, not a claim of universal UCL coverage).
//
// Source: UCL's Academic Manual, Section 7: Classification. UCL states
// year weightings as ratio units (Year 2: 3, Year 3: 5), not
// percentages — normalized here to percentages (3/8=37.5%, 5/8=62.5%)
// to fit this scheme's config format. This is purely a units
// conversion, not a change in meaning: a 3:5 ratio and a 37.5:62.5
// percentage split describe exactly the same weighting.
//
// Simplification made deliberately for v1, same as Kent: only the
// standard weighted-average method is implemented. UCL also has a
// "safety net" rule (68.5% overall + 70%+ in half of final-year
// credits also qualifies for a First) — a "best of two calculations"
// rule, left for a later phase per the roadmap, for consistency with
// how Kent's equivalent preponderance rule was handled.
export const uclClassificationScheme: ClassificationSchemeRules = {
  yearWeightings: [
    { year: 1, weightPercent: 0, excluded: true },
    { year: 2, weightPercent: 37.5, excluded: false },
    { year: 3, weightPercent: 62.5, excluded: false },
  ],
  moduleWeightingMethod: "credit_weighted",
  classificationBands: [
    { name: "First", minPercentage: 70 },
    { name: "2:1", minPercentage: 60 },
    { name: "2:2", minPercentage: 50 },
    { name: "Third", minPercentage: 40 },
  ],
  passMarkPercentage: 40,
};