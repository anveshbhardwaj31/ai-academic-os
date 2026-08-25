import { z } from "zod";

// Classification band, e.g. First = 70%+, 2:1 = 60-69%, etc.
export const ClassificationBandSchema = z.object({
    name: z.string(),
    minPercentage: z.number(),
});

// How much a given year of study will count towards the final classification
export const YearWeightingSchema = z.object({
    year: z.number(),
    weightPercent: z.number(),
    excluded: z.boolean().default(false),
});

// The full rules for a single university's classification scheme
export const ClassificationSchemeRulesSchema = z.object({
    yearWeightings: z.array(YearWeightingSchema),
    moduleWeightingMethod: z.enum(["credit_weighted", "equal_weighted"]),
    classificationBands: z.array(ClassificationBandSchema),
    passMarkPercentage: z.number().default(40),
});

// Typescript code derived from above schema - to be used everywhere in code instead of writing the shape by hand.
export type ClassificationSchemeRules = z.infer<typeof ClassificationSchemeRulesSchema>;