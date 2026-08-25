import { PrismaClient } from "@prisma/client";
import { kentClassificationScheme } from "../src/engine/schemes/kent";

const prisma = new PrismaClient();

async function main() {
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

  // A single local user, since v1 has no auth — this stands in for
  // "you" until multi-user support is ever built.
  await prisma.user.upsert({
    where: { id: "local-user" },
    update: {},
    create: {
      id: "local-user",
      name: "Local User",
      universityId: kent.id,
      currentYear: 3,
      targetClassification: "First",
    },
  });

  console.log("Seeded University of Kent, its classification scheme, and a local user.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });