import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/client";

export const modulesRouter = Router();

// Hardcoded for now since v1 has no auth — every request acts as this
// one local user. Revisit this once/if multi-user support is ever built.
const LOCAL_USER_ID = "local-user";

const CreateModuleSchema = z.object({
  name: z.string().min(1),
  credits: z.number().int().positive(),
  year: z.number().int().positive(),
});

// POST /api/modules — create a new module for the local user.
modulesRouter.post("/", async (req, res) => {
  const parsed = CreateModuleSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid module data", details: parsed.error.issues });
    return;
  }

  const module = await prisma.module.create({
    data: {
      ...parsed.data,
      userId: LOCAL_USER_ID,
    },
  });

  res.status(201).json(module);
});

// GET /api/modules — list all modules for the local user, including
// their assessment components (needed later to run the classification
// engine against real data).
modulesRouter.get("/", async (_req, res) => {
  const modules = await prisma.module.findMany({
    where: { userId: LOCAL_USER_ID },
    include: { assessmentComponents: true },
    orderBy: [{ year: "asc" }, { name: "asc" }],
  });

  res.json(modules);
});

const UpdateModuleSchema = z.object({
  name: z.string().min(1).optional(),
  credits: z.number().int().positive().optional(),
  year: z.number().int().positive().optional(),
});

// PATCH /api/modules/:id — update an existing module's fields.
modulesRouter.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const parsed = UpdateModuleSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid module data", details: parsed.error.issues });
    return;
  }

  try {
    const module = await prisma.module.update({
      where: { id },
      data: parsed.data,
    });
    res.json(module);
  } catch {
    res.status(404).json({ error: `Module '${id}' not found` });
  }
});

// DELETE /api/modules/:id — remove a module.
modulesRouter.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.module.delete({ where: { id } });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: `Module '${id}' not found` });
  }
});