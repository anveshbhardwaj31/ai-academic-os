import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/client";

export const assessmentComponentsRouter = Router();

const CreateAssessmentComponentSchema = z.object({
  moduleId: z.string().min(1),
  name: z.string().min(1),
  weightingPct: z.number().positive().max(100),
  type: z.enum(["coursework", "exam"]),
  deadline: z.string().datetime(), // ISO string from the client, e.g. "2026-05-14T00:00:00.000Z"
});

// POST /api/assessment-components — create a new assessment component
// under an existing module.
assessmentComponentsRouter.post("/", async (req, res) => {
  const parsed = CreateAssessmentComponentSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid assessment component data", details: parsed.error.issues });
    return;
  }

  const module = await prisma.module.findUnique({
    where: { id: parsed.data.moduleId },
  });

  if (!module) {
    res.status(404).json({ error: `Module '${parsed.data.moduleId}' not found` });
    return;
  }

  const component = await prisma.assessmentComponent.create({
    data: {
      moduleId: parsed.data.moduleId,
      name: parsed.data.name,
      weightingPct: parsed.data.weightingPct,
      type: parsed.data.type,
      deadline: new Date(parsed.data.deadline),
    },
  });

  res.status(201).json(component);
});

const UpdateAssessmentComponentSchema = z.object({
  name: z.string().min(1).optional(),
  weightingPct: z.number().positive().max(100).optional(),
  type: z.enum(["coursework", "exam"]).optional(),
  deadline: z.string().datetime().optional(),
  mark: z.number().min(0).max(100).nullable().optional(), // this is how a mark gets entered once graded
  status: z.enum(["pending", "in_progress", "submitted", "graded"]).optional(),
});

// PATCH /api/assessment-components/:id — update a component, most
// importantly to enter its mark once graded.
assessmentComponentsRouter.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const parsed = UpdateAssessmentComponentSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid assessment component data", details: parsed.error.issues });
    return;
  }

  const { deadline, ...rest } = parsed.data;

  try {
    const component = await prisma.assessmentComponent.update({
      where: { id },
      data: {
        ...rest,
        ...(deadline ? { deadline: new Date(deadline) } : {}),
      },
    });
    res.json(component);
  } catch {
    res.status(404).json({ error: `Assessment component '${id}' not found` });
  }
});

// DELETE /api/assessment-components/:id
assessmentComponentsRouter.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.assessmentComponent.delete({ where: { id } });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: `Assessment component '${id}' not found` });
  }
});