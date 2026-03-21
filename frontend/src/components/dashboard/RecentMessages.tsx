"use client";

import Image from "next/image";
import Link from "next/link";
import { SquarePen } from "lucide-react";
import type { DashboardMessage } from "@/types";

interface RecentMessagesProps {
  messages: DashboardMessage[];
}

export default function RecentMessages({ messages }: RecentMessagesProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Recent Messages</h2>
        <Link
          href="/messages"
          className="text-sm text-primary hover:text-white transition-colors font-medium"
        >
          View All
        </Link>
      </div>

      <div className="bg-card-dark rounded-2xl border border-white/5 overflow-hidden h-[330px] flex flex-col">
        <div className="flex-1 overflow-y-auto hide-scrollbar divide-y divide-white/5">
          {messages.map((msg) => (
            <Link
              key={msg.id}
              href={`/messages?conversation=${msg.id}`}
              className="block p-4 hover:bg-white/5 transition-colors cursor-pointer group relative"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex gap-4">
                <div className="relative flex-shrink-0">
                  {msg.avatar ? (
                    <Image
                      src={msg.avatar}
                      alt={msg.name}
                      width={48}
                      height={48}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                      {msg.initials}
                    </div>
                  )}
                  {msg.online && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-card-dark rounded-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h4 className="text-white font-medium truncate group-hover:text-primary transition-colors">
                      {msg.name}
                    </h4>
                    <span
                      className={`text-xs font-medium ml-2 flex-shrink-0 ${
                        msg.unread ? "text-primary" : "text-gray-500"
                      }`}
                    >
                      {msg.time}
                    </span>
                  </div>
                  <p
                    className={`text-sm truncate ${
                      msg.unread
                        ? "text-white font-medium"
                        : "text-gray-400"
                    }`}
                  >
                    {msg.preview}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="p-4 bg-white/[0.02] border-t border-white/5 text-center mt-auto">
          <Link href="/messages" className="text-sm font-medium text-white hover:text-primary transition-colors flex items-center justify-center gap-2 w-full py-2 rounded-lg hover:bg-white/5">
            <SquarePen className="h-4 w-4" /> Compose Message
          </Link>
        </div>
      </div>
    </div>
  );
}
