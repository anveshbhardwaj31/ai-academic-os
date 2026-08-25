import { ClassificationSchemeRules } from "../types";

// University of Kent - undergrad honours classification.
// Simplications made deliberately at this stage.

export const kentClassificationScheme: ClassificationSchemeRules = {
    yearWeightings: [
        { year: 1, weightPercent: 0, excluded: true },
        { year: 2, weightPercent: 40, excluded: false },
        { year: 3, weightPercent: 60, excluded: false },
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