"use client";

import Image from "next/image";
import { SquarePen } from "lucide-react";
import type { InboxContact } from "@/types";

interface InboxSidebarProps {
  contacts: InboxContact[];
  activeId: string;
  onSelect: (id: string) => void;
}

export default function InboxSidebar({
  contacts,
  activeId,
  onSelect,
}: InboxSidebarProps) {
  return (
    <div className="w-full lg:w-[380px] flex flex-col bg-card-dark lg:rounded-3xl border-r lg:border border-white/5 h-full overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Inbox
          </h2>
          <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-primary/20 hover:text-primary text-gray-400 transition-all">
            <SquarePen className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-black/40 rounded-xl">
          <button className="flex-1 py-2 px-3 rounded-lg bg-primary text-white text-sm font-semibold">
            All
          </button>
          <button className="flex-1 py-2 px-3 rounded-lg text-gray-400 hover:text-white text-sm font-medium transition-colors">
            Unread
          </button>
          <button className="flex-1 py-2 px-3 rounded-lg text-gray-400 hover:text-white text-sm font-medium transition-colors">
            Archived
          </button>
        </div>
      </div>

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto hide-scrollbar px-2 space-y-1">
        {contacts.map((contact) => {
          const isActive = contact.id === activeId;
          return (
            <div
              key={contact.id}
              onClick={() => onSelect(contact.id)}
              className={`p-4 rounded-2xl border-l-4 cursor-pointer group mx-2 ${
                isActive
                  ? "border-primary bg-white/[0.04]"
                  : "border-transparent hover:bg-white/5 transition-colors"
              }`}
            >
              <div className="flex gap-4">
                <div className="relative flex-shrink-0">
                  {contact.avatar ? (
                    <Image
                      src={contact.avatar}
                      alt={contact.name}
                      width={56}
                      height={56}
                      className="rounded-full object-cover border-2 border-white/10"
                    />
                  ) : (
                    <div
                      className={`w-14 h-14 rounded-full ${
                        contact.initialsBg ?? "bg-primary/10"
                      } flex items-center justify-center ${
                        contact.initialsColor ?? "text-primary"
                      } font-bold text-xl border ${
                        contact.initialsColor === "text-purple-400"
                          ? "border-purple-500/20"
                          : "border-primary/20"
                      }`}
                    >
                      {contact.initials}
                    </div>
                  )}
                  {contact.online !== undefined && (
                    <span
                      className={`absolute bottom-0 right-0 w-3.5 h-3.5 ${
                        contact.online ? "bg-green-500" : "bg-gray-500"
                      } border-2 border-card-dark rounded-full`}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h4
                      className={`truncate ${
                        isActive
                          ? "text-white font-bold"
                          : "text-gray-200 font-semibold group-hover:text-white"
                      }`}
                    >
                      {contact.name}
                    </h4>
                    <span
                      className={`text-[11px] font-medium uppercase tracking-wider ml-2 flex-shrink-0 ${
                        isActive
                          ? "text-primary font-bold"
                          : "text-gray-500"
                      }`}
                    >
                      {contact.time}
                    </span>
                  </div>
                  <p
                    className={`text-sm truncate ${
                      isActive
                        ? "text-gray-300 font-medium"
                        : "text-gray-500 group-hover:text-gray-400"
                    }`}
                  >
                    {contact.preview}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
