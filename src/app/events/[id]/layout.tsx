import { Metadata } from "next";
import prisma from "@/lib/prisma";

interface Props {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    const event = await prisma.event.findUnique({
      where: { id, status: "PUBLISHED" },
      select: {
        name: true,
        date: true,
        location: true,
        description: true,
        sportType: true,
        coverImage: true,
        user: { select: { name: true } },
        _count: { select: { photos: true } },
      },
    });

    if (!event) {
      return { title: "Événement non trouvé" };
    }

    const dateStr = new Date(event.date).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const description =
      event.description ||
      `${event._count.photos} photos de ${event.name} (${dateStr}${event.location ? `, ${event.location}` : ""}). Photographe : ${event.user.name}.`;

    return {
      title: event.name,
      description,
      openGraph: {
        title: `${event.name} - Focus Racer`,
        description,
        type: "website",
        ...(event.coverImage ? { images: [{ url: event.coverImage }] } : {}),
      },
    };
  } catch {
    return { title: "Focus Racer" };
  }
}

export default function EventLayout({ children }: Props) {
  return children;
}
