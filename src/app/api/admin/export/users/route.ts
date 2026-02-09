import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role") || "";
    const search = searchParams.get("search") || "";

    const where: Record<string, unknown> = {};
    if (role && role !== "all") where.role = role;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        company: true,
        isActive: true,
        createdAt: true,
        _count: { select: { events: true, orders: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10000,
    });

    const ROLE_LABELS: Record<string, string> = {
      PHOTOGRAPHER: "Photographe",
      ORGANIZER: "Organisateur",
      AGENCY: "Agence",
      CLUB: "Club",
      FEDERATION: "Fédération",
      ADMIN: "Administrateur",
      RUNNER: "Coureur",
    };

    const headers = [
      "ID",
      "Nom",
      "Email",
      "Rôle",
      "Téléphone",
      "Société",
      "Actif",
      "Événements",
      "Commandes",
      "Inscrit le",
    ];

    const rows = users.map((user) => [
      user.id,
      user.name,
      user.email,
      ROLE_LABELS[user.role] || user.role,
      user.phone || "",
      user.company || "",
      user.isActive ? "Oui" : "Non",
      user._count.events.toString(),
      user._count.orders.toString(),
      new Date(user.createdAt).toISOString().split("T")[0],
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(";")
      ),
    ].join("\n");

    const bom = "\uFEFF";
    const filename = `focusracer_utilisateurs_${new Date().toISOString().split("T")[0]}.csv`;

    return new NextResponse(bom + csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Erreur export" }, { status: 500 });
  }
}
