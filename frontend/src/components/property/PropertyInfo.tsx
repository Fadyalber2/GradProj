"use client";

import {
  Wifi,
  Snowflake,
  WashingMachine,
  Dumbbell,
  Fence,
  PawPrint,
  Car,
  ShieldCheck,
  CookingPot,
  Waves,
  Shield,
  ArrowUpDown,
  Building2,
  Archive,
  Zap,
  UserCheck,
  Flower2,
  Tv,
  Bath,
  BedDouble,
  Wind,
  Coffee,
  CheckCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import type { PropertyDetail } from "@/types";
import PropertyMap from "./PropertyMap";

const LABEL_ICON_MAP: [RegExp, React.ElementType][] = [
  [/wifi|internet|fiber/i, Wifi],
  [/air|ac|conditioning|hvac/i, Snowflake],
  [/wash|laundry/i, WashingMachine],
  [/gym|fitness|dumbbell/i, Dumbbell],
  [/garden|yard|fence/i, Fence],
  [/pet|paw|dog|cat/i, PawPrint],
  [/park|garage|car/i, Car],
  [/secur|guard|cctv/i, ShieldCheck],
  [/cook|kitchen/i, CookingPot],
  [/pool|swim|wave/i, Waves],
  [/elevator|lift/i, ArrowUpDown],
  [/balcon|terrace/i, Building2],
  [/storage|archive|store/i, Archive],
  [/generator|power|electric|backup/i, Zap],
  [/maid|housekeeper/i, UserCheck],
  [/garden|flower|outdoor/i, Flower2],
  [/tv|netflix|cable|media|theater/i, Tv],
  [/bath|shower/i, Bath],
  [/bed|room/i, BedDouble],
  [/wind|ventil/i, Wind],
  [/coffee|café|lounge/i, Coffee],
  [/shield|safe|protect/i, Shield],
];

function getIcon(label: string): React.ElementType {
  for (const [pattern, Icon] of LABEL_ICON_MAP) {
    if (pattern.test(label)) return Icon;
  }
  return CheckCircle;
}

interface PropertyInfoProps {
  property: PropertyDetail;
}

export default function PropertyInfo({ property }: PropertyInfoProps) {
  return (
    <div className="lg:w-[70%] space-y-12">
      {/* Quick stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-card-dark rounded-2xl border border-white/5"
      >
        <div className="flex flex-col gap-1">
          <span className="text-gray-400 text-xs uppercase tracking-wider">Type</span>
          <span className="text-white font-semibold">{property.type}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-gray-400 text-xs uppercase tracking-wider">Size</span>
          <span className="text-white font-semibold">{property.size}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-gray-400 text-xs uppercase tracking-wider">Bedrooms</span>
          <span className="text-white font-semibold">{property.bedrooms}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-gray-400 text-xs uppercase tracking-wider">Bathrooms</span>
          <span className="text-white font-semibold">{property.bathrooms}</span>
        </div>
      </motion.div>

      {/* About */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="space-y-6"
      >
        <h2 className="text-2xl font-bold text-white">About this property</h2>
        <div className="prose prose-invert prose-lg text-gray-300 max-w-none font-light leading-relaxed space-y-4">
          {property.description.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </motion.div>

      {/* Amenities */}
      {property.amenities.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <h2 className="text-2xl font-bold text-white mb-6">Amenities</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {property.amenities.map((amenity) => {
              const Icon = getIcon(amenity.label);
              return (
                <div
                  key={amenity.label}
                  className="flex items-center gap-3 p-4 bg-card-dark rounded-xl border border-white/5 hover:border-white/10 transition-colors"
                >
                  <Icon className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-gray-300 text-sm">{amenity.label}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Map */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <PropertyMap
          title={property.title}
          address={property.fullAddress || property.location}
          latitude={property.latitude}
          longitude={property.longitude}
        />
      </motion.div>
    </div>
  );
}
