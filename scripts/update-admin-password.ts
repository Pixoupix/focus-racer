/**
 * Update admin password in production database.
 * Usage: npx tsx scripts/update-admin-password.ts
 *
 * Requires DATABASE_URL environment variable.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@focusracer.com";
  const newPassword = "Laurytal2";

  const hash = await bcrypt.hash(newPassword, 10);

  const user = await prisma.user.update({
    where: { email },
    data: { password: hash },
  });

  console.log(`Password updated for ${user.email} (${user.name})`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
