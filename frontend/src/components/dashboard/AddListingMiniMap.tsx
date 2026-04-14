"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import { icon as leafletIcon } from "leaflet";
import { useEffect } from "react";

// Fix Leaflet's broken default marker icon in webpack/Next.js builds
const PIN_ICON = leafletIcon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

/** Imperatively re-centers the map when lat/lng props change. */
function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 15);
  }, [lat, lng, map]);
  return null;
}

interface AddListingMiniMapProps {
  lat: number;
  lng: number;
  onMove?: (lat: number, lng: number) => void;
}

export default function AddListingMiniMap({ lat, lng, onMove }: AddListingMiniMapProps) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={15}
      style={{ height: "140px", width: "100%", borderRadius: "12px" }}
      scrollWheelZoom={false}
      className="z-0"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <RecenterMap lat={lat} lng={lng} />
      <Marker
        position={[lat, lng]}
        icon={PIN_ICON}
        draggable={!!onMove}
        eventHandlers={
          onMove
            ? {
                dragend: (e) => {
                  const pos = (e.target as { getLatLng: () => { lat: number; lng: number } }).getLatLng();
                  onMove(pos.lat, pos.lng);
                },
              }
            : {}
        }
      />
    </MapContainer>
  );
}
