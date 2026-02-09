import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "";
    const search = searchParams.get("search") || "";
    const eventId = searchParams.get("eventId") || "";

    const where: Record<string, unknown> = {};
    if (status && status !== "all") where.status = status;
    if (eventId) where.eventId = eventId;
    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
        { guestEmail: { contains: search, mode: "insensitive" } },
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        event: { select: { name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10000, // Safety limit
    });

    // Build CSV
    const headers = [
      "ID Commande",
      "Date",
      "Statut",
      "Client",
      "Email",
      "Événement",
      "Nb Photos",
      "Montant TTC",
      "Commission Plateforme",
      "Reversement Photographe",
      "Stripe Payment ID",
    ];

    const rows = orders.map((order) => [
      order.id,
      new Date(order.createdAt).toISOString().split("T")[0],
      order.status,
      order.user?.name || order.guestName || "Invité",
      order.user?.email || order.guestEmail || "",
      order.event.name,
      order._count.items.toString(),
      order.totalAmount.toFixed(2),
      order.platformFee.toFixed(2),
      (order.totalAmount - order.platformFee).toFixed(2),
      order.stripePaymentId || "",
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(";")
      ),
    ].join("\n");

    // Add BOM for Excel UTF-8 compatibility
    const bom = "\uFEFF";
    const filename = `focusracer_commandes_${new Date().toISOString().split("T")[0]}.csv`;

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
