"use client";

import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";

// Leaflet uses window — must be dynamically imported (no SSR)
const LeafletMap = dynamic(() => import("./LeafletMap"), { ssr: false });

interface PropertyMapProps {
  title: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
}

// Cairo, Egypt fallback coordinates
const CAIRO: [number, number] = [30.0444, 31.2357];

export default function PropertyMap({ title, address, latitude, longitude }: PropertyMapProps) {
  const coords: [number, number] =
    latitude != null && longitude != null ? [latitude, longitude] : CAIRO;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white">Location</h2>

      <div className="flex items-start gap-2 text-gray-400 text-sm">
        <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
        <span>{address}</span>
      </div>

      <div className="rounded-2xl overflow-hidden border border-white/10 h-72">
        <LeafletMap coords={coords} title={title} />
      </div>
    </div>
  );
}
