import { Router } from "express";
import { prisma } from "../db/client";
import { ClassificationSchemeRulesSchema } from "../engine/types";
import {
  calculateModuleMark,
  calculateYearAverage,
  calculateRequiredYearAverage,
  calculateRequiredAverageForRemainingModules,
  ModuleMarks,
} from "../engine/calculations";

export const classificationRouter = Router();

const LOCAL_USER_ID = "local-user";

classificationRouter.get("/status", async (_req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: LOCAL_USER_ID },
    include: { university: true },
  });

  if (!user) {
    res.status(404).json({ error: "Local user not found — did you run the seed script?" });
    return;
  }

  const schemeRow = await prisma.classificationScheme.findUnique({
    where: { universityId: user.universityId },
  });

  if (!schemeRow) {
    res.status(404).json({ error: `No classification scheme for university '${user.universityId}'` });
    return;
  }

  const schemeParsed = ClassificationSchemeRulesSchema.safeParse(JSON.parse(schemeRow.rulesJson));
  if (!schemeParsed.success) {
    res.status(500).json({ error: "Stored classification scheme failed validation" });
    return;
  }
  const scheme = schemeParsed.data;

  const modules = await prisma.module.findMany({
    where: { userId: LOCAL_USER_ID },
    include: { assessmentComponents: true },
  });

  const moduleMarksByYear = new Map<number, ModuleMarks[]>();
  for (const module of modules) {
    const moduleMarks: ModuleMarks = {
      credits: module.credits,
      components: module.assessmentComponents.map((c) => ({
        weightingPct: c.weightingPct,
        mark: c.mark,
      })),
    };
    const existing = moduleMarksByYear.get(module.year) ?? [];
    existing.push(moduleMarks);
    moduleMarksByYear.set(module.year, existing);
  }

  const completedYears: { year: number; average: number }[] = [];
  const incompleteYears: number[] = [];

  for (const [year, moduleMarks] of moduleMarksByYear.entries()) {
    try {
      const average = calculateYearAverage(moduleMarks);
      if (average === null) {
        incompleteYears.push(year);
      } else {
        completedYears.push({ year, average });
      }
    } catch (err) {
      console.error(`Year ${year} calculation error:`, err instanceof Error ? err.message : err);
      incompleteYears.push(year);
    }
  }

  // For v1, we resolve one target incomplete year — the realistic case
  // of "working through the current year while others are settled."
  // Multiple simultaneously-incomplete years is left for later, same
  // simplification we've been explicit about throughout.
  let requiredResult: {
    year: number;
    mode: "full_year" | "partial_year";
    requiredAverage: number;
    isAchievable: boolean;
    alreadySecured: boolean;
  } | null = null;

  if (incompleteYears.length === 1) {
    const targetYear = incompleteYears[0];
    const targetModules = moduleMarksByYear.get(targetYear) ?? [];

    // Split this year's modules into ones that are fully graded
    // ("known") versus ones still missing a mark, so we can tell
    // whether this is "year hasn't started" or "partway through."
    const knownModules: ModuleMarks[] = [];
    let remainingCredits = 0;

    for (const m of targetModules) {
      let mark: number | null;
      try {
        mark = calculateModuleMark(m);
      } catch {
        mark = null; // bad/incomplete component data — treat as ungraded
      }
      if (mark === null) {
        remainingCredits += m.credits;
      } else {
        knownModules.push(m);
      }
    }

    try {
      if (knownModules.length === 0) {
        // Genuinely nothing graded yet in this year — use the simpler
        // "full year still open" calculation.
        const result = calculateRequiredYearAverage(
          completedYears,
          targetYear,
          user.targetClassification,
          scheme
        );
        requiredResult = {
          year: targetYear,
          mode: "full_year",
          requiredAverage: result.requiredAverage,
          isAchievable: result.isAchievable,
          alreadySecured: result.alreadySecured,
        };
      } else if (remainingCredits > 0) {
        // Some modules graded, some not — the realistic mid-year case.
        const result = calculateRequiredAverageForRemainingModules(
          completedYears,
          { year: targetYear, knownModules, remainingCredits },
          user.targetClassification,
          scheme
        );
        requiredResult = {
          year: targetYear,
          mode: "partial_year",
          requiredAverage: result.requiredAverageOnRemaining,
          isAchievable: result.isAchievable,
          alreadySecured: result.alreadySecured,
        };
      }
      // If knownModules.length > 0 and remainingCredits === 0, the year
      // is actually fully graded and would have appeared in
      // completedYears already — nothing more to compute here.
    } catch (err) {
      console.error("Required-average calculation error:", err instanceof Error ? err.message : err);
      requiredResult = null;
    }
  }

  res.json({
    targetClassification: user.targetClassification,
    completedYears,
    incompleteYears,
    requiredForRemainingYear: requiredResult,
  });
});