"use client";

interface GoogleMapEmbedProps {
  address: string;
  title: string;
  lat?: number | null;
  lng?: number | null;
}

// Keyless Google Maps embed — works without an API key.
// Prefers exact coordinates when available, otherwise geocodes the address text.
export default function GoogleMapEmbed({ address, title, lat, lng }: GoogleMapEmbedProps) {
  const query =
    lat != null && lng != null ? `${lat},${lng}` : address;
  const src = `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`;

  return (
    <iframe
      src={src}
      title={title}
      width="100%"
      height="100%"
      style={{ border: 0 }}
      allowFullScreen
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}
