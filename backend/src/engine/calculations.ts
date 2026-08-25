import Module from "module";
import { ClassificationSchemeRules } from "./types";

// Minimal shape that represents one graded (ungraded too) assessment componenet, enough for prior calculations.
export interface ComponentMark {
    weightingPct: number;
    mark: number | null;
}

export interface ModuleMarks {
    credits: number;
    components: ComponentMark[];
}

/**
 * This function calculates a single module's overall mark as a weighted avg of its
 * assessment components. Returns null if any component is still ungraded.
 */
export function calculateModuleMark(module: ModuleMarks): number | null {
    const hasUngraded = module.components.some((c) => c.mark === null);
    if (hasUngraded) return null;

    const totalWeighting = module.components.reduce(
        (sum, c) => sum + c.weightingPct,
        0
    );

    //Component weighting within modules should sum to 100.
    if (Math.abs(totalWeighting - 100) > 0.01) {
        throw new Error(
            `Module component weightings sum to ${totalWeighting}, expected 100`
        );
    }

    const weightedSum = module.components.reduce(
        (sum, c) => sum + (c.mark as number) * (c.weightingPct / 100),
        0
    );

    return weightedSum;
}

/**
 * Calculates a year's average mark as a credit-weighted avg of its modules' mark.
 */
export function calculateYearAverage(modules: ModuleMarks[]): number | null {
    const moduleMarks = modules.map((m) => ({
        credits: m.credits,
        mark: calculateModuleMark(m),
    }));

    const hasUngraded = moduleMarks.some((m) => m.mark === null);
    if (hasUngraded) return null;

    const totalCredits = moduleMarks.reduce((sum, m) => sum + m.credits, 0);
    const weightedSum = moduleMarks.reduce(
        (sum, m) => sum + (m.mark as number) * m.credits,
        0
    );

    return weightedSum / totalCredits;
}

// One year's average mark, paired with the year it is meant to be for.
export interface YearResult {
    year: number;
    average: number;
}

export interface ClassificationResult {
    overallPercentage: number;
    classification: string;
}

/**
 * This function, given a completed year's avg per year, and the university scheme, calculates
 * the final weighted overall percentage and which classification band it falls into.
 */
export function calculateOverallClassification(
    yearResults: YearResult[],
    scheme: ClassificationSchemeRules
): ClassificationResult {
    const includedWeightings = scheme.yearWeightings.filter((y) => !y.excluded);

    const overallPercentage = includedWeightings.reduce((sum, weighting) => {
        const yearResult = yearResults.find((y) => y.year === weighting.year);
        if (!yearResult) {
            throw new Error(
                `Missing year average for year ${weighting.year}, which is required by this scheme`
            );
        }
        return sum + yearResult.average * (weighting.weightPercent / 100);
    }, 0);
    
    const classification = classifyPercentage(overallPercentage, scheme);

    return { overallPercentage, classification };
}

/**
 * This function goes through the scheme's classification bands and returns
 * the name of the first band the percentage qualifies for.
 */
function classifyPercentage(
    percentage: number,
    scheme: ClassificationSchemeRules
): string {
    const band = scheme.classificationBands.find(
        (b) => percentage >= b.minPercentage
    );

    if (!band) {
        return "Fail";
    }

    return band.name;
}

export interface RequiredYearAverageResult {
    requiredAverage: number;
    isAchievable: boolean;
    alreadySecured: boolean;
}

/**
 * This answers the "what do I need" question for the common case.
 */
export function calculateRequiredYearAverage(
    completedYears: YearResult[],
    targetYear: number,
    targetClassificationName: string,
    scheme: ClassificationSchemeRules
): RequiredYearAverageResult {
    const targetBand = scheme.classificationBands.find(
        (b) => b.name === targetClassificationName
    );
    if (!targetBand) {
        throw new Error(`Unknown classification target: ${targetClassificationName}`);
    }

    const targetWeighting = scheme.yearWeightings.find(
        (y) => y.year === targetYear && !y.excluded
    );
    if (!targetWeighting) {
        throw new Error(
            `Year ${targetYear} is not a contributing year in this scheme`
        );
    }

    // How much of the target percentage is already locked in from completed years.
    const securedFromCompletedYears = completedYears.reduce((sum, result) => {
        const weighting = scheme.yearWeightings.find((y) => y.year === result.year);
        if (!weighting || weighting.excluded) return sum;
        return sum + result.average * (weighting.weightPercent / 100);
    }, 0);

    const remainingNeeded = targetBand.minPercentage - securedFromCompletedYears;
    const requiredAverage = remainingNeeded / (targetWeighting.weightPercent / 100);

    return {
        requiredAverage,
        isAchievable: requiredAverage <= 100,
        alreadySecured: requiredAverage <= 0,
    };
}

// This next function represents a student that is partway through a year: some modules already full graded, and a known amount of credit to still be graded.
export interface PartialYearProgress {
    year: number;
    knownModules: ModuleMarks[];
    remainingCredits: number;
}

export interface RequiredRemainingAverageResult {
    yearAverageNeeded: number;
    requiredAverageOnRemaining: number;
    isAchievable: boolean;
    alreadySecured: boolean;
}

export function calculateRequiredAverageForRemainingModules(
    completedYears: YearResult[],
    partialYear: PartialYearProgress,
    targetClassificationName: string,
    scheme: ClassificationSchemeRules
): RequiredRemainingAverageResult {
    const targetBand = scheme.classificationBands.find(
        (b) => b.name === targetClassificationName
    );
    if (!targetBand) {
        throw new Error(`Unknown classification target: ${targetClassificationName}`);
    }

    const yearWeighting = scheme.yearWeightings.find(
        (y) => y.year === partialYear.year && !y.excluded
    );
    if (!yearWeighting) {
        throw new Error(`Year ${partialYear.year} is not a contributing year in this scheme`);
    }

    if (partialYear.remainingCredits <= 0) {
        throw new Error("No remaining credits to solve for - this year is already fully graded");
    }

    const securedFromCompletedYears = completedYears.reduce((sum, result) => {
        const weighting = scheme.yearWeightings.find((y) => y.year === result.year);
        if (!weighting || weighting.excluded) return sum;
        return sum + result.average * (weighting.weightPercent / 100);
    }, 0);

    const remainingNeededOverall = targetBand.minPercentage - securedFromCompletedYears;
    const yearAverageNeeded = remainingNeededOverall / (yearWeighting.weightPercent / 100);

    const knownCredits = partialYear.knownModules.reduce((sum, m) => sum + m.credits, 0);
    const knownWeightedSum = partialYear.knownModules.reduce((sum, m) => {
        const mark = calculateModuleMark(m);
        if (mark === null) {
            throw new Error("knownModules must all be fully graded - an ungraded module belongs in remainingCredits instead");
        }
        return sum + mark * m.credits;
    }, 0);

    const totalYearCredits = knownCredits + partialYear.remainingCredits;

    const requiredAverageOnRemaining = (yearAverageNeeded * totalYearCredits - knownWeightedSum) / partialYear.remainingCredits;

    return {
        yearAverageNeeded,
        requiredAverageOnRemaining,
        isAchievable: requiredAverageOnRemaining <= 100,
        alreadySecured: requiredAverageOnRemaining <= 0,
    };
}