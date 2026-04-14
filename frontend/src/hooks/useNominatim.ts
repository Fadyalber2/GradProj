import { useState, useEffect } from "react";

export interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    city?: string;
    town?: string;
    county?: string;
    suburb?: string;
    neighbourhood?: string;
    state?: string;
  };
}

export interface LocationData {
  full_address: string;
  city: string;
  latitude: number;
  longitude: number;
  location: string;
}

export function parseNominatimResult(result: NominatimResult): LocationData {
  const addr = result.address;
  const city = addr.city ?? addr.town ?? addr.county ?? addr.state ?? "";
  const suburb = addr.suburb ?? addr.neighbourhood ?? "";
  const location = suburb ? `${suburb}, ${city}` : city;
  return {
    full_address: result.display_name,
    city,
    latitude: parseFloat(result.lat),
    longitude: parseFloat(result.lon),
    location,
  };
}

export function useNominatim() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(query)}&limit=5`;
        const res = await fetch(url, {
          headers: { "User-Agent": "AXIOM-V2/1.0" },
        });
        if (!res.ok) {
          setSuggestions([]);
          return;
        }
        const data: NominatimResult[] = await res.json();
        setSuggestions(data);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  return {
    query,
    setQuery,
    suggestions,
    setSuggestions,
    loading,
  };
}
