"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

// Fix Leaflet's default icon paths broken by webpack
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

import "leaflet/dist/leaflet.css";

interface LeafletMapProps {
  coords: [number, number];
  title: string;
}

// Re-centers map when coords change (e.g., switching properties)
function RecenterMap({ coords }: { coords: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(coords, 14);
  }, [coords, map]);
  return null;
}

export default function LeafletMap({ coords, title }: LeafletMapProps) {
  return (
    <MapContainer
      center={coords}
      zoom={14}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%", background: "#1a1a1a" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <RecenterMap coords={coords} />
      <Marker position={coords}>
        <Popup>
          <span className="font-semibold">{title}</span>
        </Popup>
      </Marker>
    </MapContainer>
  );
}
