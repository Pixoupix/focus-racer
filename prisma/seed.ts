import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Admin
  const admin = await prisma.user.upsert({
    where: { email: "admin@focusracer.com" },
    update: {},
    create: {
      email: "admin@focusracer.com",
      password: await bcrypt.hash("admin123", 10),
      name: "Admin Focus Racer",
      role: UserRole.ADMIN,
    },
  });
  console.log(`Admin created: ${admin.email}`);

  // Photographer
  const photographer = await prisma.user.upsert({
    where: { email: "photographe@test.com" },
    update: {},
    create: {
      email: "photographe@test.com",
      password: await bcrypt.hash("photo123", 10),
      name: "Pierre Photo",
      role: UserRole.PHOTOGRAPHER,
      company: "Photo Sport Pro",
      phone: "+33 6 12 34 56 78",
    },
  });
  console.log(`Photographer created: ${photographer.email}`);

  // Runner
  const runner = await prisma.user.upsert({
    where: { email: "coureur@test.com" },
    update: {},
    create: {
      email: "coureur@test.com",
      password: await bcrypt.hash("runner123", 10),
      name: "Marie Coureur",
      role: UserRole.RUNNER,
    },
  });
  console.log(`Runner created: ${runner.email}`);

  // Organizer
  const organizer = await prisma.user.upsert({
    where: { email: "orga@test.com" },
    update: {},
    create: {
      email: "orga@test.com",
      password: await bcrypt.hash("orga123", 10),
      name: "Lucas Organisateur",
      role: UserRole.ORGANIZER,
      company: "Run Events SARL",
      phone: "+33 6 98 76 54 32",
    },
  });
  console.log(`Organizer created: ${organizer.email}`);

  // Sample events
  const event1 = await prisma.event.upsert({
    where: { id: "seed-event-1" },
    update: {},
    create: {
      id: "seed-event-1",
      name: "Marathon de Paris 2026",
      date: new Date("2026-04-12"),
      location: "Paris, France",
      userId: photographer.id,
    },
  });
  console.log(`Event created: ${event1.name}`);

  const event2 = await prisma.event.upsert({
    where: { id: "seed-event-2" },
    update: {},
    create: {
      id: "seed-event-2",
      name: "Trail du Mont-Blanc 2026",
      date: new Date("2026-06-28"),
      location: "Chamonix, France",
      userId: organizer.id,
    },
  });
  console.log(`Event created: ${event2.name}`);

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
