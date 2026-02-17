import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

/**
 * TEMPORARY one-time endpoint to update admin password.
 * DELETE THIS FILE after use.
 */
export async function POST(request: NextRequest) {
  const { secret, email, password } = await request.json();

  // Simple shared secret to prevent unauthorized access
  if (secret !== "update-pwd-7k9x-temp") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!email || !password) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.upsert({
      where: { email },
      update: { password: hash },
      create: {
        email,
        password: hash,
        name: "Admin Focus Racer",
        role: "ADMIN",
        credits: 999999,
      },
    });
    return NextResponse.json({ ok: true, email: user.email, action: "upserted" });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message, code: err.code, meta: err.meta },
      { status: 500 }
    );
  }
}
