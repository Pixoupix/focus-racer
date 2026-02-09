"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Order {
  id: string;
  totalAmount: number;
  platformFee: number;
  status: string;
  createdAt: string;
  guestEmail: string | null;
  user: { name: string; email: string } | null;
  event: { id: string; name: string };
  _count: { items: number };
}

// Skeleton component
function SkeletonOrderItem() {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-gray-200" />
        <div className="space-y-2">
          <div className="h-4 w-32 bg-gray-200 rounded" />
          <div className="h-3 w-24 bg-gray-200 rounded" />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="h-5 w-16 bg-gray-200 rounded" />
        <div className="h-5 w-12 bg-gray-200 rounded" />
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const { data: session } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch("/api/orders");
        if (response.ok) {
          const data = await response.json();
          setOrders(data);
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (session) {
      fetchOrders();
    }
  }, [session]);

  const filteredOrders = orders.filter((order) => {
    const customerName = order.user?.name || order.guestEmail || "";
    const eventName = order.event.name;
    return (
      customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eventName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const totalRevenue = orders.filter(o => o.status === "PAID").reduce((sum, o) => sum + o.totalAmount, 0);
  const photographerRevenue = orders.filter(o => o.status === "PAID").reduce((sum, o) => sum + (o.totalAmount - o.platformFee), 0);
  const totalOrders = orders.filter(o => o.status === "PAID").length;

  return (
    <div className="p-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-display text-gray-900">Commandes</h1>
        <p className="text-gray-500 mt-1">Suivez vos ventes et revenus</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card className="bg-white border-0 shadow-card rounded-xl">
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Ventes totales</p>
            <p className="text-2xl font-bold font-display text-gray-900 mt-1">{totalRevenue.toFixed(2)}€</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-0 shadow-card rounded-xl">
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Vos revenus (apres commission)</p>
            <p className="text-2xl font-bold font-display text-success mt-1">{photographerRevenue.toFixed(2)}€</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-0 shadow-card rounded-xl">
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Nombre de commandes</p>
            <p className="text-2xl font-bold font-display text-gray-900 mt-1">{totalOrders}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="mb-6">
        <Input
          placeholder="Rechercher par client ou evenement..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-white max-w-md border-gray-200 rounded-lg focus:ring-2 focus:ring-blue/20 focus:border-blue"
        />
      </div>

      {/* Orders list */}
      <Card className="bg-white border-0 shadow-card rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg font-display text-gray-900">Historique des commandes</CardTitle>
          <CardDescription className="text-gray-500">Toutes vos ventes de photos</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <SkeletonOrderItem />
              <SkeletonOrderItem />
              <SkeletonOrderItem />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                </svg>
              </div>
              <p className="text-gray-500">
                {orders.length === 0
                  ? "Vous n'avez pas encore de commandes"
                  : "Aucune commande ne correspond a votre recherche"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {order.user?.name || order.guestEmail || "Client anonyme"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {order.event.name} • {order._count.items} photo{order._count.items > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{order.totalAmount.toFixed(2)}€</p>
                      <p className="text-xs text-gray-500">
                        Net: {(order.totalAmount - order.platformFee).toFixed(2)}€
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${
                      order.status === "PAID"
                        ? "bg-success-light text-success-dark"
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {order.status === "PAID" ? "Paye" : "Rembourse"}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(order.createdAt).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
