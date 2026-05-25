"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { demoBookings } from "@/lib/demoBookings";
import type { Housemate } from "@/types";

interface HousematesSectionProps {
  housemates: Housemate[];
  listingId?: string;
}

export default function HousematesSection({
  housemates,
  listingId,
}: HousematesSectionProps) {
  const [confirmedHousemates, setConfirmedHousemates] = useState<Housemate[]>([]);

  useEffect(() => {
    if (!listingId) return;
    setConfirmedHousemates(demoBookings.listConfirmedHousemates(listingId));
  }, [listingId]);

  const allHousemates = useMemo(
    () => [...confirmedHousemates, ...housemates],
    [confirmedHousemates, housemates]
  );

  if (!allHousemates.length) {
    return (
      <section className="rounded-2xl border border-white/10 bg-card-dark p-6">
        <h2 className="text-2xl font-bold text-white">Meet your Housemates</h2>
        <p className="mt-2 text-sm text-gray-400">
          The owner has not added current housemate profiles for this listing yet.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Meet your Housemates</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {allHousemates.map((mate, i) => (
          <motion.div
            key={`${mate.name}-${i}`}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            className="bg-card-dark p-4 rounded-2xl border border-white/5"
          >
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gray-700 overflow-hidden shrink-0 border-2 border-primary/20">
                <Image
                  src={mate.avatar || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200"}
                  alt={mate.name}
                  width={64}
                  height={64}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <h3 className="text-white font-semibold truncate">{mate.name}</h3>
                <p className="text-gray-400 text-xs">
                  {mate.age || "Age not set"}, {mate.occupation || "Occupation not set"}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {profileTags(mate).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-gray-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function label(value: string) {
  return value.replace(/_/g, " ");
}

function profileTags(mate: Housemate) {
  const prefs = mate.lifestylePreferences ?? {};
  return [
    ...mate.tags,
    prefs.cleanliness ? `${label(String(prefs.cleanliness))} clean` : "",
    prefs.sleep_schedule ? label(String(prefs.sleep_schedule)) : "",
    prefs.noise_level ? `${label(String(prefs.noise_level))} noise` : "",
    prefs.guests_policy ? `${label(String(prefs.guests_policy))} guests` : "",
    prefs.smoking_allowed === true ? "smoking ok" : prefs.smoking_allowed === false ? "no smoking" : "",
    prefs.pets_allowed === true ? "pets ok" : prefs.pets_allowed === false ? "no pets" : "",
  ].filter(Boolean);
}
