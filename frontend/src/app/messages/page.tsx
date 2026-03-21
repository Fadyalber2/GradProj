"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import InboxSidebar from "@/components/messages/InboxSidebar";
import ChatArea from "@/components/messages/ChatArea";
import MessagesSkeleton from "@/components/messages/MessagesSkeleton";
import EmptyState from "@/components/messages/EmptyState";
import {
  messagesQueries,
  acceptConversationMutation,
  rejectConversationMutation,
  blockUserMutation,
} from "@/lib/queries";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import type { ConversationPreview, ApiMessage } from "@/types/api";
import type { InboxContact, ChatMessage } from "@/types";

// Consistent color palette for avatar initials
const INITIALS_BG = [
  "bg-purple-900", "bg-blue-900", "bg-green-900",
  "bg-rose-900",   "bg-amber-900",
];
const INITIALS_FG = [
  "text-purple-300", "text-blue-300", "text-green-300",
  "text-rose-300",   "text-amber-300",
];

function hashIndex(str: string, len: number): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h) % len;
}

function mapInboxContact(conv: ConversationPreview, currentUserId: string): InboxContact {
  const name = conv.other_user_name ?? "Unknown";
  const initials =
    name !== "Unknown"
      ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
      : "??";
  const idx = hashIndex(conv.other_user_id, INITIALS_BG.length);
  return {
    id: conv.id,
    name,
    avatar: conv.other_user_avatar ?? undefined,
    initials,
    initialsBg: INITIALS_BG[idx],
    initialsColor: INITIALS_FG[idx],
    preview: conv.last_message_text ?? "No messages yet",
    time: conv.last_message_at
      ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })
      : "",
    online: false,
    status: conv.status,
    isIncomingRequest: conv.status === "pending" && conv.initiated_by !== currentUserId,
  };
}

function mapChatMessage(msg: ApiMessage, currentUserId: string): ChatMessage {
  return {
    id: msg.id,
    sender: msg.sender_id === currentUserId ? "me" : "them",
    text: msg.text ?? "",
    time: msg.created_at
      ? new Date(msg.created_at).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "",
    rawDate: msg.created_at ?? undefined,
    attachment:
      msg.attachment_url
        ? { name: msg.attachment_name ?? "file", size: msg.attachment_size ?? "" }
        : undefined,
    showAvatar: true,
  };
}

export default function MessagesPage() {
  const { user, isInitialized } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [liveMessages, setLiveMessages] = useState<ChatMessage[]>([]);
  const [activeView, setActiveView] = useState<"inbox" | "chat">("inbox");

  // Auth guard
  useEffect(() => {
    if (isInitialized && !user) {
      router.replace("/login?redirect=/messages");
    }
  }, [isInitialized, user, router]);

  const { data: convData, isLoading: convLoading, isError: convError } = useQuery({
    ...messagesQueries.conversations(),
    enabled: !!user,
  });

  const contacts = useMemo(
    () => (convData ?? []).map((c) => mapInboxContact(c, user?.id ?? "")),
    [convData, user?.id],
  );

  // Find the raw conversation data for the active contact (for status/initiated_by)
  const activeConvRaw = useMemo(
    () => (convData ?? []).find((c) => c.id === activeId),
    [convData, activeId],
  );

  // Pre-select conversation from URL param (?conversation=<id>), then fall back to first
  useEffect(() => {
    if (contacts.length === 0) return;
    if (!activeId) {
      const paramId = searchParams.get("conversation");
      const matchId = paramId && contacts.find((c) => c.id === paramId) ? paramId : contacts[0].id;
      setActiveId(matchId);
      if (paramId && contacts.find((c) => c.id === paramId)) {
        setActiveView("chat");
      }
    }
  }, [contacts, activeId, searchParams]);

  const activeContact = contacts.find((c) => c.id === activeId);

  const { data: msgData } = useQuery({
    ...messagesQueries.messages(activeId ?? ""),
    enabled: !!activeId,
  });

  // Sync fetched history into live state
  useEffect(() => {
    const msgs = (msgData ?? []).map((m) =>
      mapChatMessage(m, user?.id ?? "")
    );
    setLiveMessages(msgs);
  }, [msgData, activeId, user?.id]);

  // Supabase Realtime — live messages
  useEffect(() => {
    if (!activeId) return;

    const channel = supabase
      .channel(`conv:${activeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeId}`,
        },
        (payload) => {
          const newMsg = payload.new as ApiMessage;
          if (newMsg.sender_id === user?.id) return;
          setLiveMessages((prev) => [
            ...prev,
            mapChatMessage(newMsg, user?.id ?? ""),
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeId, user?.id]);

  // ── Mutations ──

  const invalidateConversations = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  }, [queryClient]);

  const acceptMutation = useMutation({
    ...acceptConversationMutation,
    onSuccess: invalidateConversations,
  });

  const rejectMutation = useMutation({
    ...rejectConversationMutation,
    onSuccess: () => {
      invalidateConversations();
      setActiveId(null);
      setActiveView("inbox");
    },
  });

  const blockMutation = useMutation({
    ...blockUserMutation,
    onSuccess: () => {
      invalidateConversations();
      setActiveId(null);
      setActiveView("inbox");
    },
  });

  const isActionLoading = acceptMutation.isPending || rejectMutation.isPending || blockMutation.isPending;

  // ── Handlers ──

  const handleSelectConversation = useCallback((id: string) => {
    setActiveId(id);
    setActiveView("chat");
  }, []);

  const handleBack = useCallback(() => {
    setActiveView("inbox");
  }, []);

  const handleSend = useCallback(
    async (text: string) => {
      if (!activeId || !text.trim()) return;
      try {
        const sent = await api.post<ApiMessage>(
          `/api/messages/conversations/${activeId}`,
          { text: text.trim() }
        );
        setLiveMessages((prev) => [
          ...prev,
          mapChatMessage(sent, user?.id ?? ""),
        ]);
      } catch {
        // Message failed to send — user can retry
      }
    },
    [activeId, user?.id]
  );

  const handleAccept = useCallback(() => {
    if (!activeId) return;
    acceptMutation.mutate(activeId);
  }, [activeId, acceptMutation]);

  const handleReject = useCallback(() => {
    if (!activeId) return;
    if (!window.confirm("Decline this message request? The sender won't be notified.")) return;
    rejectMutation.mutate(activeId);
  }, [activeId, rejectMutation]);

  const handleBlock = useCallback(() => {
    if (!activeConvRaw) return;
    if (!window.confirm(`Block ${activeContact?.name ?? "this user"}? They won't be able to message you.`)) return;
    blockMutation.mutate({ user_id: activeConvRaw.other_user_id, reason: "blocked by user" });
  }, [activeConvRaw, activeContact?.name, blockMutation]);

  const handleReport = useCallback(() => {
    if (!activeConvRaw) return;
    const reason = window.prompt("Why are you reporting this user? (optional)");
    if (reason === null) return; // cancelled
    blockMutation.mutate({ user_id: activeConvRaw.other_user_id, reason: reason || "reported by user" });
  }, [activeConvRaw, blockMutation]);

  // Auth loading
  if (!isInitialized || (!user && isInitialized)) {
    return <MessagesSkeleton />;
  }

  // Data loading
  if (convLoading) {
    return <MessagesSkeleton />;
  }

  // Error state
  if (convError) {
    return (
      <div className="max-w-7xl mx-auto w-full flex items-center justify-center h-full p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <MessageSquare className="h-8 w-8 text-red-400" />
          </div>
          <p className="text-gray-300 font-medium">Could not load messages</p>
          <p className="text-sm text-gray-500 max-w-sm">
            Make sure the backend is running and try again.
          </p>
        </motion.div>
      </div>
    );
  }

  // No conversations at all
  if (contacts.length === 0) {
    return (
      <div className="max-w-7xl mx-auto w-full flex h-full p-0 lg:p-6">
        <EmptyState variant="no-conversations" />
      </div>
    );
  }

  const isInitiator = activeConvRaw?.initiated_by === user?.id;

  return (
    <div className="max-w-7xl mx-auto w-full flex gap-0 lg:gap-6 p-0 lg:p-6 h-full overflow-hidden">
      {/* Inbox sidebar */}
      <div
        className={`${
          activeView === "inbox" ? "flex" : "hidden"
        } lg:flex w-full lg:w-auto`}
      >
        <InboxSidebar
          contacts={contacts}
          activeId={activeId ?? ""}
          onSelect={handleSelectConversation}
        />
      </div>

      {/* Chat area */}
      <div
        className={`${
          activeView === "chat" ? "flex" : "hidden"
        } lg:flex flex-1 min-w-0`}
      >
        <AnimatePresence mode="wait">
          {activeContact ? (
            <motion.div
              key={activeContact.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex min-w-0"
            >
              <ChatArea
                contact={activeContact}
                messages={liveMessages}
                myAvatar={user?.avatar_url ?? ""}
                onSend={handleSend}
                onBack={handleBack}
                conversationStatus={activeConvRaw?.status}
                isInitiator={isInitiator}
                onAccept={handleAccept}
                onReject={handleReject}
                onBlock={handleBlock}
                onReport={handleReport}
                isActionLoading={isActionLoading}
              />
            </motion.div>
          ) : (
            <EmptyState variant="no-selection" />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
