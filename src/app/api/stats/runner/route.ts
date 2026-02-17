import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch orders with event and item details
    const orders = await prisma.order.findMany({
      where: { userId, status: "PAID" },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            date: true,
            sportType: true,
            location: true,
            coverImage: true,
          },
        },
        items: {
          select: { id: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Start list entries for this user (by email)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, createdAt: true },
    });

    const startListEntries = user
      ? await prisma.startListEntry.findMany({
          where: { email: user.email },
          include: {
            event: {
              select: {
                id: true,
                name: true,
                date: true,
                sportType: true,
                location: true,
              },
            },
          },
          orderBy: { event: { date: "desc" } },
        })
      : [];

    // Aggregate stats
    const totalPhotos = orders.reduce((sum, o) => sum + o.items.length, 0);
    const totalSpent = orders.reduce((sum, o) => sum + o.totalAmount, 0);

    // Unique events from orders
    const eventIdsFromOrders = new Set(orders.map(o => o.eventId));
    // Unique events from start list
    const eventIdsFromStartList = new Set(startListEntries.map(e => e.eventId));
    // Combined unique events
    const allEventIds = new Set([...eventIdsFromOrders, ...eventIdsFromStartList]);

    // Sport type breakdown from all events
    const sportCounts: Record<string, number> = {};
    orders.forEach(o => {
      const sport = o.event.sportType || "OTHER";
      sportCounts[sport] = (sportCounts[sport] || 0) + 1;
    });
    startListEntries.forEach(e => {
      if (!eventIdsFromOrders.has(e.eventId)) {
        const sport = e.event.sportType || "OTHER";
        sportCounts[sport] = (sportCounts[sport] || 0) + 1;
      }
    });

    // Favorite sport (most frequent)
    const favoriteSport = Object.entries(sportCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Monthly spending over time
    const monthlySpending: Record<string, { month: string; spent: number; orders: number; photos: number }> = {};
    orders.forEach(o => {
      const month = new Date(o.createdAt).toISOString().slice(0, 7);
      if (!monthlySpending[month]) {
        monthlySpending[month] = { month, spent: 0, orders: 0, photos: 0 };
      }
      monthlySpending[month].spent += o.totalAmount;
      monthlySpending[month].orders += 1;
      monthlySpending[month].photos += o.items.length;
    });
    const monthlyData = Object.values(monthlySpending).sort((a, b) => b.month.localeCompare(a.month)).slice(0, 12);

    // Events participated: merge orders + start list
    const eventsMap = new Map<string, {
      id: string;
      name: string;
      date: string;
      sportType: string;
      location: string | null;
      photosPurchased: number;
      amountSpent: number;
      registered: boolean;
    }>();

    orders.forEach(o => {
      const existing = eventsMap.get(o.eventId);
      if (existing) {
        existing.photosPurchased += o.items.length;
        existing.amountSpent += o.totalAmount;
      } else {
        eventsMap.set(o.eventId, {
          id: o.event.id,
          name: o.event.name,
          date: o.event.date.toISOString(),
          sportType: o.event.sportType,
          location: o.event.location,
          photosPurchased: o.items.length,
          amountSpent: o.totalAmount,
          registered: false,
        });
      }
    });

    startListEntries.forEach(e => {
      const existing = eventsMap.get(e.eventId);
      if (existing) {
        existing.registered = true;
      } else {
        eventsMap.set(e.eventId, {
          id: e.event.id,
          name: e.event.name,
          date: e.event.date.toISOString(),
          sportType: e.event.sportType,
          location: e.event.location,
          photosPurchased: 0,
          amountSpent: 0,
          registered: true,
        });
      }
    });

    const eventsList = Array.from(eventsMap.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Purchase history timeline (most recent orders)
    const purchaseHistory = orders.slice(0, 20).map(o => ({
      id: o.id,
      eventName: o.event.name,
      eventDate: o.event.date.toISOString(),
      sportType: o.event.sportType,
      photos: o.items.length,
      amount: o.totalAmount,
      purchasedAt: o.createdAt.toISOString(),
    }));

    return NextResponse.json({
      overview: {
        totalEvents: allEventIds.size,
        eventsWithPurchase: eventIdsFromOrders.size,
        eventsRegistered: eventIdsFromStartList.size,
        totalPhotos,
        totalSpent,
        totalOrders: orders.length,
        avgBasket: orders.length > 0 ? totalSpent / orders.length : 0,
        favoriteSport,
        memberSince: user?.createdAt,
      },
      sportBreakdown: sportCounts,
      monthlySpending: monthlyData,
      events: eventsList,
      purchaseHistory,
    });
  } catch (error) {
    console.error("Error fetching runner stats:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des statistiques" },
      { status: 500 }
    );
  }
}
