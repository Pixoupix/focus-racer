import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "@/lib/prisma";

const registerSchema = z.object({
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  role: z.enum(["PHOTOGRAPHER", "ORGANIZER", "AGENCY", "CLUB", "FEDERATION", "RUNNER"]).default("PHOTOGRAPHER"),
  phone: z.string().optional(),
  company: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  portfolio: z.string().url("URL invalide").optional().or(z.literal("")),
  referralSource: z.string().optional(),
  acceptedCgu: z.boolean().refine(v => v === true, "Vous devez accepter les CGU"),
  newsletterOptIn: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      firstName, lastName, email, password, role,
      phone, company, postalCode, city, portfolio,
      referralSource, newsletterOptIn,
    } = registerSchema.parse(body);

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Un compte existe déjà avec cet email" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: `${firstName} ${lastName}`,
        firstName,
        lastName,
        role,
        phone: phone || null,
        company: company || null,
        postalCode: postalCode || null,
        city: city || null,
        portfolio: portfolio || null,
        referralSource: referralSource || null,
        acceptedCguAt: new Date(),
        newsletterOptIn: newsletterOptIn || false,
      },
    });

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'inscription" },
      { status: 500 }
    );
  }
}
