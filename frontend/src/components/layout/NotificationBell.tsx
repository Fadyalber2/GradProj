"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Calendar,
  Info,
  Check,
  CheckCircle,
  XCircle,
  FileText,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  notificationsQueries,
  markNotificationReadMutation,
  markAllNotificationsReadMutation,
} from "@/lib/queries";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/lib/supabase";
import type { ApiNotification } from "@/types/api";

// ── Icon map per notification type ──

const TYPE_CONFIG: Record<
  string,
  { icon: typeof Bell; color: string; bg: string }
> = {
  listing_approved: { icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  listing_rejected: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10" },
  viewing_confirmed: { icon: Calendar, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  application_received: { icon: FileText, color: "text-primary", bg: "bg-primary/10" },
  application_approved: { icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  application_rejected: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10" },
};

const DEFAULT_CONFIG = { icon: Info, color: "text-gray-400", bg: "bg-gray-500/10" };

// ── Relative time helper ──

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000,
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ── Component ──

export default function NotificationBell() {
  const { session } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    ...notificationsQueries.list(),
    enabled: !!session,
    refetchInterval: 60_000,
  });

  const [isOpen, setIsOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // ── Hover handlers (open after 200ms delay, close only if not locked) ──

  const handleMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => setIsOpen(true), 200);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    if (!isLocked) {
      hoverTimeoutRef.current = setTimeout(() => setIsOpen(false), 300);
    }
  }, [isLocked]);

  // ── Click toggles lock ──

  const handleBellClick = useCallback(() => {
    if (isLocked) {
      setIsLocked(false);
      setIsOpen(false);
    } else {
      setIsLocked(true);
      setIsOpen(true);
    }
  }, [isLocked]);

  // ── Click outside closes ──

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setIsLocked(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", onClickOutside);
    }
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [isOpen]);

  // ── Cleanup timeout on unmount ──

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  // ── Realtime: auto-refresh on new notifications ──

  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel("notifications-bell")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, queryClient]);

  // ── Mutations ──

  const markRead = useMutation({
    ...markNotificationReadMutation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllRead = useMutation({
    ...markAllNotificationsReadMutation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // ── Navigation ──

  function getNotificationRoute(notification: ApiNotification): string {
    switch (notification.type) {
      case "listing_approved":
      case "listing_rejected":
      case "viewing_confirmed":
      case "application_received":
      case "application_approved":
      case "application_rejected":
        return "/dashboard";
      default:
        return "/dashboard";
    }
  }

  function handleNotificationClick(notification: ApiNotification) {
    if (!notification.is_read) {
      markRead.mutate(notification.id);
    }
    router.push(getNotificationRoute(notification));
    setIsOpen(false);
    setIsLocked(false);
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Bell button */}
      <button
        onClick={handleBellClick}
        className="relative p-2 rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="h-5 w-5" />

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white animate-in fade-in zoom-in duration-200">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[360px] max-h-[420px] flex flex-col rounded-2xl border border-white/10 bg-card-dark/95 backdrop-blur-xl shadow-2xl shadow-black/50 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover transition-colors cursor-pointer"
              >
                <Check className="h-3 w-3" />
                Mark all as read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Bell className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const config = TYPE_CONFIG[notification.type] ?? DEFAULT_CONFIG;
                const Icon = config.icon;

                return (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors cursor-pointer hover:bg-white/5 ${
                      !notification.is_read
                        ? "border-l-2 border-l-primary bg-primary/[0.03]"
                        : "border-l-2 border-l-transparent"
                    }`}
                  >
                    {/* Type icon */}
                    <div
                      className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${config.bg}`}
                    >
                      <Icon className={`h-4 w-4 ${config.color}`} />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`text-sm truncate ${
                            !notification.is_read
                              ? "font-semibold text-white"
                              : "font-medium text-gray-300"
                          }`}
                        >
                          {notification.title}
                        </p>
                        <span className="text-[11px] text-gray-500 flex-shrink-0">
                          {timeAgo(notification.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                        {notification.body}
                      </p>
                    </div>

                    {/* Unread dot */}
                    {!notification.is_read && (
                      <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
