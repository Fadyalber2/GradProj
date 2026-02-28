"use client";

import { motion } from "framer-motion";

export default function AgenciesHero() {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative pt-32 pb-16 bg-cover bg-center"
      style={{
        backgroundImage:
          "linear-gradient(to bottom, rgba(18,18,18,0.7), rgba(18,18,18,0.95)), url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=2400&q=80')",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
          Trusted <span className="text-primary">Partners</span> & Agencies
        </h1>
        <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto font-light">
          Connect directly with top-tier real estate developers and leading
          universities to find verified listings and student housing
          opportunities.
        </p>
      </div>
    </motion.section>
  );
}
