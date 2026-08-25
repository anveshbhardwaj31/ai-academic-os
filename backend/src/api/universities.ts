import { Router } from "express";
import { prisma } from "../db/client";
import { ClassificationSchemeRulesSchema } from "../engine/types";

export const universitiesRouter = Router();

// List all seeded universities.
universitiesRouter.get("/", async (_req, res) => {
    const universities = await prisma.university.findMany({
        select: { id: true, name: true },
    });
    res.json(universities);
});

// Fetch and validate one university's classification scheme, returning it in parsed form.
universitiesRouter.get("/:id/scheme", async (req, res) => {
    const { id } = req.params;
    
    const scheme = await prisma.classificationScheme.findUnique({
        where: { universityId: id },
    });

    if (!scheme) {
        res.status(404).json({ error: `No classification scheme found for university '${id}'` });
        return;
    }

    const parsed = JSON.parse(scheme.rulesJson);
    const result = ClassificationSchemeRulesSchema.safeParse(parsed);

    if (!result.success) {
        res.status(500).json({ error: "Stored classification scheme failed validation", details: result.error.issues });
        return;
    }

    res.json(result.data);
});