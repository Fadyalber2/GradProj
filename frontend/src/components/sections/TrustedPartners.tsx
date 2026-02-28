"use client";

import { motion } from "framer-motion";

const EGYPTIAN_PARTNERS = [
  { name: "SODIC", sub: "Real Estate" },
  { name: "Emaar Misr", sub: "Developments" },
  { name: "Palm Hills", sub: "Developments" },
  { name: "TMG", sub: "Talaat Moustafa Group" },
  { name: "Hyde Park", sub: "Properties" },
  { name: "Sixth of October", sub: "Development" },
];

export default function TrustedPartners() {
  return (
    <section className="py-12 bg-[#101010]">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <p className="text-primary text-[10px] font-bold tracking-widest uppercase mb-8">
          Trusted Partners
        </p>
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="flex flex-wrap justify-center gap-8 md:gap-14"
        >
          {EGYPTIAN_PARTNERS.map((partner) => (
            <div
              key={partner.name}
              className="flex flex-col items-center gap-1 opacity-40 hover:opacity-100 transition-opacity duration-300"
            >
              <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white font-black text-xs tracking-tight">
                {partner.name
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 3)}
              </div>
              <span className="text-white font-bold text-xs">{partner.name}</span>
              <span className="text-gray-600 text-[10px]">{partner.sub}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
