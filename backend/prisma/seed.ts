import { PrismaClient } from "@prisma/client";
import { kentClassificationScheme } from "../src/engine/schemes/kent";
import { uclClassificationScheme } from "../src/engine/schemes/ucl";

const prisma = new PrismaClient();

async function seedUniversity(id: string, name: string, scheme: object) {
  const university = await prisma.university.upsert({
    where: { id },
    update: { name },
    create: { id, name },
  });

  await prisma.classificationScheme.upsert({
    where: { universityId: university.id },
    update: { rulesJson: JSON.stringify(scheme) },
    create: { universityId: university.id, rulesJson: JSON.stringify(scheme) },
  });

  return university;
}

async function main() {
  const kent = await seedUniversity("kent", "University of Kent", kentClassificationScheme);
  await seedUniversity("ucl", "University College London", uclClassificationScheme);

  // The local user defaults to Kent — this is just a starting point,
  // not a permanent choice. The user router (built next) lets it
  // actually be changed through the app itself.
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

  console.log("Seeded University of Kent, University College London, their classification schemes, and a local user.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });