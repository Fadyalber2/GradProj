"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { FileText, Receipt, MessageCircle } from "lucide-react";
import type { ProjectDetail } from "@/types";

const DOC_ICONS: Record<string, React.ElementType> = {
  FileText,
  Receipt,
};

interface ProjectSidebarProps {
  project: ProjectDetail;
}

export default function ProjectSidebar({ project }: ProjectSidebarProps) {
  const agentInitials = project.salesAgent.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="space-y-6 sticky top-24"
    >
      {/* Contact form */}
      <div className="bg-card-dark rounded-2xl p-6 border border-white/5">
        <h3 className="text-lg font-bold text-white mb-6">
          Contact Sales Team
        </h3>

        <div className="flex items-center gap-4 mb-6">
          <div className="relative shrink-0">
            {project.salesAgent.avatar ? (
              <Image
                src={project.salesAgent.avatar}
                alt={project.salesAgent.name}
                width={48}
                height={48}
                className="rounded-full border border-white/10 object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-sm">
                {agentInitials}
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-card-dark" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium text-sm">
              {project.salesAgent.name}
            </p>
            <p className="text-gray-500 text-xs">{project.salesAgent.role}</p>
          </div>
          <button className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30 shrink-0 hover:bg-primary-hover transition-colors">
            <MessageCircle className="h-4 w-4 text-white" />
          </button>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => e.preventDefault()}
        >
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Name
            </label>
            <input
              type="text"
              placeholder="Your full name"
              className="w-full bg-input-dark border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:ring-primary focus:border-primary placeholder-gray-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Email
            </label>
            <input
              type="email"
              placeholder="name@example.com"
              className="w-full bg-input-dark border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:ring-primary focus:border-primary placeholder-gray-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Phone
            </label>
            <input
              type="tel"
              placeholder="+1 (555) 000-0000"
              className="w-full bg-input-dark border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:ring-primary focus:border-primary placeholder-gray-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Interested In
            </label>
            <select className="w-full bg-input-dark border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:ring-primary focus:border-primary">
              {project.residenceOptions.map((opt) => (
                <option key={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="w-full bg-primary hover:bg-primary-hover text-white py-3 rounded-lg font-medium transition-colors mt-2"
          >
            Request Private Tour
          </button>
          <p className="text-[10px] text-gray-500 text-center mt-2">
            By clicking, you agree to our Terms & Privacy Policy.
          </p>
        </form>
      </div>

      {/* Documents */}
      <div className="bg-card-dark rounded-2xl p-6 border border-white/5">
        <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">
          Documents
        </h3>
        <ul className="space-y-3">
          {project.documents.map((doc) => {
            const Icon = DOC_ICONS[doc.icon] ?? FileText;
            return (
              <li key={doc.title}>
                <a
                  href="#"
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
                >
                  <span className="text-primary bg-primary/10 p-2 rounded-lg">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm text-gray-200 font-medium group-hover:text-white">
                      {doc.title}
                    </p>
                    <p className="text-xs text-gray-500">{doc.size}</p>
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </motion.div>
  );
}
