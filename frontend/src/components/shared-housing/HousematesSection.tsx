"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import type { Housemate } from "@/types";

interface HousematesSectionProps {
  housemates: Housemate[];
}

export default function HousematesSection({
  housemates,
}: HousematesSectionProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Meet your Housemates</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {housemates.map((mate, i) => (
          <motion.div
            key={mate.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            className="bg-card-dark p-4 rounded-2xl border border-white/5 flex items-center gap-4"
          >
            <div className="h-16 w-16 rounded-full bg-gray-700 overflow-hidden shrink-0 border-2 border-primary/20">
              <Image
                src={mate.avatar}
                alt={mate.name}
                width={64}
                height={64}
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <h3 className="text-white font-semibold">{mate.name}</h3>
              <p className="text-gray-400 text-xs mb-2">
                {mate.age}, {mate.occupation}
              </p>
              <div className="flex flex-wrap gap-1">
                {mate.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-gray-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
