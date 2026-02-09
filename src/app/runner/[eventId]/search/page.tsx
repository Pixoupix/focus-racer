"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Redirect old search URL to new public event gallery
export default function LegacySearchPage({
  params,
}: {
  params: { eventId: string };
}) {
  const { eventId } = params;
  const router = useRouter();

  useEffect(() => {
    router.replace(`/events/${eventId}`);
  }, [eventId, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-600">Redirection...</p>
    </div>
  );
}
