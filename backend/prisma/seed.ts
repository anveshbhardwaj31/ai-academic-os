import { PrismaClient } from "@prisma/client";
import { kentClassificationScheme } from "../src/engine/schemes/kent";

const prisma = new PrismaClient();

async function main() {
  // Upsert so running the seed script twice doesn't create duplicates.
  const kent = await prisma.university.upsert({
    where: { id: "kent" },
    update: {},
    create: {
      id: "kent",
      name: "University of Kent",
    },
  });

  await prisma.classificationScheme.upsert({
    where: { universityId: kent.id },
    update: {
      rulesJson: JSON.stringify(kentClassificationScheme),
    },
    create: {
      universityId: kent.id,
      rulesJson: JSON.stringify(kentClassificationScheme),
    },
  });

  console.log("Seeded University of Kent with its classification scheme.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });