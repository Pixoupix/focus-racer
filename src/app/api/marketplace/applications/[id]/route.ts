import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

// PATCH: Accept or reject an application
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;
    const { status: newStatus } = await request.json();

    const application = await prisma.marketplaceApplication.findUnique({
      where: { id },
      include: { listing: true },
    });

    if (!application) {
      return NextResponse.json({ error: "Candidature non trouvée" }, { status: 404 });
    }

    // Listing creator can accept/reject
    if (application.listing.creatorId === session.user.id) {
      if (!["ACCEPTED", "REJECTED"].includes(newStatus)) {
        return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
      }

      const updated = await prisma.marketplaceApplication.update({
        where: { id },
        data: { status: newStatus },
      });

      // If accepting, update listing to IN_PROGRESS and reject others
      if (newStatus === "ACCEPTED") {
        await prisma.marketplaceListing.update({
          where: { id: application.listingId },
          data: { status: "IN_PROGRESS" },
        });

        // Reject other pending applications
        await prisma.marketplaceApplication.updateMany({
          where: {
            listingId: application.listingId,
            id: { not: id },
            status: "PENDING",
          },
          data: { status: "REJECTED" },
        });
      }

      return NextResponse.json(updated);
    }

    // Photographer can withdraw their own application
    if (application.photographerId === session.user.id) {
      if (newStatus !== "WITHDRAWN") {
        return NextResponse.json({ error: "Vous pouvez uniquement retirer votre candidature" }, { status: 400 });
      }

      const updated = await prisma.marketplaceApplication.update({
        where: { id },
        data: { status: "WITHDRAWN" },
      });

      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  } catch (error) {
    console.error("Application update error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
