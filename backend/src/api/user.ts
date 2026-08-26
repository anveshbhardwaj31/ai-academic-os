import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/client";

export const userRouter = Router();

const LOCAL_USER_ID = "local-user";

// GET /api/user — the local user's current settings.
userRouter.get("/", async (_req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: LOCAL_USER_ID },
    include: { university: true },
  });

  if (!user) {
    res.status(404).json({ error: "Local user not found — did you run the seed script?" });
    return;
  }

  res.json(user);
});

// GET /api/user/universities — list of universities available to pick from.
userRouter.get("/universities", async (_req, res) => {
  const universities = await prisma.university.findMany({
    select: { id: true, name: true },
  });
  res.json(universities);
});

const UpdateUserSchema = z.object({
  universityId: z.string().min(1).optional(),
  currentYear: z.number().int().positive().optional(),
  targetClassification: z.string().min(1).optional(),
});

// PATCH /api/user — update the local user's settings.
userRouter.patch("/", async (req, res) => {
  const parsed = UpdateUserSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid user data", details: parsed.error.issues });
    return;
  }

  if (parsed.data.universityId) {
    const university = await prisma.university.findUnique({
      where: { id: parsed.data.universityId },
    });
    if (!university) {
      res.status(404).json({ error: `University '${parsed.data.universityId}' not found` });
      return;
    }
  }

  const user = await prisma.user.update({
    where: { id: LOCAL_USER_ID },
    data: parsed.data,
    include: { university: true },
  });

  res.json(user);
});