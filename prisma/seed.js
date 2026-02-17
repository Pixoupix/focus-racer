const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Admin
  const admin = await prisma.user.upsert({
    where: { email: "admin@focusracer.com" },
    update: {},
    create: {
      email: "admin@focusracer.com",
      password: await bcrypt.hash("Laurytal2", 10),
      name: "Admin Focus Racer",
      role: "ADMIN",
    },
  });
  console.log("Admin created:", admin.email);

  // Photographer (with test credits)
  const photographer = await prisma.user.upsert({
    where: { email: "photographe@test.com" },
    update: { credits: 999999 },
    create: {
      email: "photographe@test.com",
      password: await bcrypt.hash("photo123", 10),
      name: "Pierre Photo",
      role: "PHOTOGRAPHER",
      company: "Photo Sport Pro",
      phone: "+33 6 12 34 56 78",
      credits: 999999,
    },
  });
  console.log("Photographer created:", photographer.email);

  // Runner
  const runner = await prisma.user.upsert({
    where: { email: "coureur@test.com" },
    update: {},
    create: {
      email: "coureur@test.com",
      password: await bcrypt.hash("runner123", 10),
      name: "Marie Coureur",
      role: "RUNNER",
    },
  });
  console.log("Runner created:", runner.email);

  // Organizer
  const organizer = await prisma.user.upsert({
    where: { email: "orga@test.com" },
    update: {},
    create: {
      email: "orga@test.com",
      password: await bcrypt.hash("orga123", 10),
      name: "Lucas Organisateur",
      role: "ORGANIZER",
      company: "Run Events SARL",
      phone: "+33 6 98 76 54 32",
    },
  });
  console.log("Organizer created:", organizer.email);

  console.log("Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
