import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/client";

export const commitmentBlocksRouter = Router();

const LOCAL_USER_ID = "local-user";

// dayOfWeek: 0 = Sunday ... 6 = Saturday, matching the Prisma schema.
// startTime/endTime as "HH:MM" 24-hour strings, e.g. "09:00".
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const CreateCommitmentBlockSchema = z
  .object({
    label: z.string().min(1),
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(TIME_REGEX, "startTime must be in HH:MM 24-hour format"),
    endTime: z.string().regex(TIME_REGEX, "endTime must be in HH:MM 24-hour format"),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: "startTime must be before endTime",
    path: ["endTime"],
  });

// POST /api/commitment-blocks
commitmentBlocksRouter.post("/", async (req, res) => {
  const parsed = CreateCommitmentBlockSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid commitment block data", details: parsed.error.issues });
    return;
  }

  const block = await prisma.commitmentBlock.create({
    data: {
      ...parsed.data,
      userId: LOCAL_USER_ID,
    },
  });

  res.status(201).json(block);
});

// GET /api/commitment-blocks — list all, ordered for easy weekly viewing.
commitmentBlocksRouter.get("/", async (_req, res) => {
  const blocks = await prisma.commitmentBlock.findMany({
    where: { userId: LOCAL_USER_ID },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
  res.json(blocks);
});

// DELETE /api/commitment-blocks/:id
commitmentBlocksRouter.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.commitmentBlock.delete({ where: { id } });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: `Commitment block '${id}' not found` });
  }
});