"use client";

import { SlidersHorizontal } from "lucide-react";

const PROPERTY_TYPES = ["Rent a Home", "Buy Property", "Roommates"] as const;

const VIBES = [
  "Quiet",
  "Social",
  "Creative",
  "Professional",
  "Pet Friendly",
  "Vegan",
] as const;

const AMENITIES = [
  "In-unit Laundry",
  "Gym / Fitness",
  "Rooftop Deck",
  "High-speed WiFi",
  "Parking Available",
] as const;

export interface FilterValues {
  propertyType: string;
  minPrice: number;
  maxPrice: number;
  vibes: string[];
  amenities: string[];
}

interface FilterSidebarProps {
  propertyType: string;
  setPropertyType: (v: string) => void;
  minPrice: number;
  setMinPrice: (v: number) => void;
  maxPrice: number;
  setMaxPrice: (v: number) => void;
  selectedVibes: Set<string>;
  setSelectedVibes: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedAmenities: Set<string>;
  setSelectedAmenities: React.Dispatch<React.SetStateAction<Set<string>>>;
  onApply?: (filters: FilterValues) => void;
  onReset?: () => void;
}

export default function FilterSidebar({
  propertyType,
  setPropertyType,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  selectedVibes,
  setSelectedVibes,
  selectedAmenities,
  setSelectedAmenities,
  onApply,
  onReset,
}: FilterSidebarProps) {
  const toggleVibe = (vibe: string) => {
    setSelectedVibes((prev) => {
      const next = new Set(prev);
      if (next.has(vibe)) next.delete(vibe);
      else next.add(vibe);
      return next;
    });
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) => {
      const next = new Set(prev);
      if (next.has(amenity)) next.delete(amenity);
      else next.add(amenity);
      return next;
    });
  };

  const handleApply = () => {
    onApply?.({
      propertyType,
      minPrice,
      maxPrice,
      vibes: Array.from(selectedVibes),
      amenities: Array.from(selectedAmenities),
    });
  };

  return (
    <aside className="w-full h-full overflow-y-auto custom-scrollbar p-6 bg-surface flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-primary" /> Filters
        </h2>
        <button
          onClick={onReset}
          className="text-primary text-xs font-semibold hover:underline"
        >
          Reset All
        </button>
      </div>

      <div className="flex-1 space-y-6">
        {/* Property Type */}
        <div className="bg-card-dark rounded-xl p-5 shadow-sm border border-white/5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">
            Property Type
          </h3>
          <div className="flex flex-col gap-3">
            {PROPERTY_TYPES.map((type) => (
              <label
                key={type}
                className="relative flex items-center justify-center p-3 rounded-lg border border-white/10 cursor-pointer bg-input-dark hover:bg-white/5 transition-all"
              >
                <input
                  type="radio"
                  name="propertyType"
                  checked={propertyType === type}
                  onChange={() => setPropertyType(type)}
                  className="peer sr-only"
                />
                <div className="absolute inset-0 border-2 border-transparent peer-checked:border-primary rounded-lg pointer-events-none" />
                <span className="text-sm font-medium text-gray-300 peer-checked:text-white">
                  {type}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Price Range */}
        <div className="bg-card-dark rounded-xl p-5 shadow-sm border border-white/5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">
            Price Range (EGP)
          </h3>
          <div className="flex items-center gap-2 mb-4">
            <input
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(Number(e.target.value))}
              placeholder="Min"
              className="w-full bg-input-dark border border-white/10 rounded-md py-1.5 px-3 text-sm text-white focus:ring-primary focus:border-primary placeholder-gray-500"
            />
            <span className="text-gray-500 shrink-0">-</span>
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              placeholder="Max"
              className="w-full bg-input-dark border border-white/10 rounded-md py-1.5 px-3 text-sm text-white focus:ring-primary focus:border-primary placeholder-gray-500"
            />
          </div>
          <input
            type="range"
            min={500}
            max={100000}
            step={500}
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
            className="w-full range-slider"
          />
          <div className="flex justify-between mt-2">
            <span className="text-[10px] text-gray-500">500 EGP</span>
            <span className="text-[10px] text-gray-500">100k+ EGP</span>
          </div>
        </div>

        {/* Vibes */}
        <div className="bg-card-dark rounded-xl p-5 shadow-sm border border-white/5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">
            Vibes
          </h3>
          <div className="flex flex-wrap gap-2">
            {VIBES.map((vibe) => {
              const active = selectedVibes.has(vibe);
              return (
                <button
                  key={vibe}
                  onClick={() => toggleVibe(vibe)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    active
                      ? "bg-primary text-white border border-primary"
                      : "bg-transparent border border-white/20 text-gray-400 hover:border-primary hover:text-white"
                  }`}
                >
                  {vibe}
                </button>
              );
            })}
          </div>
        </div>

        {/* Amenities */}
        <div className="bg-card-dark rounded-xl p-5 shadow-sm border border-white/5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">
            Amenities
          </h3>
          <div className="flex flex-col gap-3">
            {AMENITIES.map((amenity) => (
              <label
                key={amenity}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={selectedAmenities.has(amenity)}
                  onChange={() => toggleAmenity(amenity)}
                  className="custom-checkbox h-4 w-4 rounded border-white/20 bg-input-dark text-primary focus:ring-0 focus:ring-offset-0"
                />
                <span className="text-sm text-gray-400 group-hover:text-white transition-colors">
                  {amenity}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Apply Filters button */}
      <div className="pt-6 mt-2 border-t border-white/5">
        <button
          onClick={handleApply}
          className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-primary/25"
        >
          Apply Filters
        </button>
      </div>
    </aside>
  );
}
