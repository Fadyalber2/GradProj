"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Bed, Ruler } from "lucide-react";
import type { AgencyProject } from "@/types";

interface ProjectCardProps {
  project: AgencyProject;
  index: number;
}

export default function ProjectCard({ project, index }: ProjectCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="group bg-card-dark rounded-2xl border border-white/5 overflow-hidden hover:border-primary/50 transition-all duration-300"
    >
      <div className="relative h-64 overflow-hidden">
        <Image
          src={project.image}
          alt={project.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
        <div className="absolute top-4 left-4">
          <span
            className={`${project.statusColor} backdrop-blur-md text-white text-xs px-3 py-1 rounded-full border border-white/10`}
          >
            {project.status}
          </span>
        </div>
        {project.badge && (
          <div className="absolute top-4 right-4">
            <span
              className={`${project.badgeColor} text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg`}
            >
              {project.badge}
            </span>
          </div>
        )}
      </div>

      <div className="p-6">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">
              {project.title}
            </h3>
            <p className="text-gray-400 text-sm">{project.location}</p>
          </div>
          <div className="text-right">
            <p className="text-white font-bold">{project.price}</p>
            <p className="text-gray-500 text-xs">{project.priceLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-gray-400 text-sm my-4">
          <span className="flex items-center gap-1">
            <Bed className="h-4 w-4" /> {project.beds}
          </span>
          <span className="flex items-center gap-1">
            <Ruler className="h-4 w-4" /> {project.area}
          </span>
        </div>

        <div className="w-full bg-white/5 h-1.5 rounded-full mb-4 overflow-hidden">
          <div
            className={`${project.progressColor} h-full rounded-full`}
            style={{ width: `${project.progressPercent}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-xs text-gray-400 mb-4">
          <span>{project.progressLabel}</span>
          <span>{project.completionLabel}</span>
        </div>

        <Link
          href={`/property/${project.id}`}
          className="block w-full py-2 border border-white/10 hover:bg-white/5 rounded-lg text-white text-sm font-medium transition-colors text-center"
        >
          {project.cta}
        </Link>
      </div>
    </motion.div>
  );
}
