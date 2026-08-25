import { Router } from "express";
import { prisma } from "../db/client";
import { ClassificationSchemeRulesSchema } from "../engine/types";
import {
  calculateModuleMark,
  calculateYearAverage,
  calculateRequiredYearAverage,
  ModuleMarks,
} from "../engine/calculations";

export const classificationRouter = Router();

const LOCAL_USER_ID = "local-user";

// GET /api/classification/status — the core "what's my current position"
// endpoint. Pulls the user's modules, runs them through the classification
// engine, and returns where they stand plus what they need going forward.
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

  // Group modules by year, converting to the shape the engine expects.
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

  // Work out which years are fully complete (every module in that year
  // has a non-null average) versus not yet complete.
  const completedYears: { year: number; average: number }[] = [];
  const incompleteYears: number[] = [];

  for (const [year, moduleMarks] of moduleMarksByYear.entries()) {
    const average = calculateYearAverage(moduleMarks);
    if (average === null) {
      incompleteYears.push(year);
    } else {
      completedYears.push({ year, average });
    }
  }

  // For v1, keep this endpoint focused on the common case: report
  // completed years plus, if there's exactly one incomplete year, the
  // required average needed there. More complex multi-incomplete-year
  // cases are left for later — this already covers the realistic case
  // of "some years done, currently working through one more."
  let requiredGoing: ReturnType<typeof calculateRequiredYearAverage> | null = null;
  let targetYear: number | null = null;

  if (incompleteYears.length === 1) {
    targetYear = incompleteYears[0];
    try {
      requiredGoing = calculateRequiredYearAverage(
        completedYears,
        targetYear,
        user.targetClassification,
        scheme
      );
    } catch {
      requiredGoing = null;
    }
  }

  res.json({
    targetClassification: user.targetClassification,
    completedYears,
    incompleteYears,
    requiredForRemainingYear: requiredGoing
      ? { year: targetYear, ...requiredGoing }
      : null,
  });
});