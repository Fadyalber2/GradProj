"use client";

import { useEffect } from "react";
import { api } from "@/lib/api";

export default function ViewTracker({ listingId }: { listingId: string }) {
  useEffect(() => {
    api.post(`/api/listings/${listingId}/view`).catch(() => {});
  }, [listingId]);

  return null;
}
