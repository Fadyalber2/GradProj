"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import InboxSidebar from "@/components/messages/InboxSidebar";
import ChatArea from "@/components/messages/ChatArea";
import { messagesQueries } from "@/lib/queries";
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

function mapInboxContact(conv: ConversationPreview): InboxContact {
  const name = conv.other_user_name ?? "Unknown";
  const initials =
    name !== "Unknown"
      ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
      : "??";
  const idx = hashIndex(conv.other_user_id, INITIALS_BG.length);
  return {
    id: conv.conversation_id,
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
  const [activeId, setActiveId] = useState<string | null>(null);
  const [liveMessages, setLiveMessages] = useState<ChatMessage[]>([]);

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

  // Memoize contacts so the array reference is stable between renders
  const contacts = useMemo(
    () => (convData?.conversations ?? []).map(mapInboxContact),
    [convData],
  );

  // Auto-select the first conversation once on initial load — never auto-switch on refetch
  useEffect(() => {
    if (!activeId && contacts.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveId(contacts[0].id);
    }
  }, [contacts, activeId]);

  // activeId is the single source of truth — no fallback to contacts[0] here
  const activeContact = contacts.find((c) => c.id === activeId);

  const { data: msgData } = useQuery({
    ...messagesQueries.messages(activeId ?? ""),
    enabled: !!activeId,
  });

  // Sync fetched history into live state when conversation or data changes
  useEffect(() => {
    const msgs = (msgData?.messages ?? []).map((m) =>
      mapChatMessage(m, user?.id ?? "")
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLiveMessages(msgs);
  }, [msgData, activeId, user?.id]);

  // Supabase Realtime — listen for new messages from the other participant
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
          // Skip messages sent by the current user — we add those after POST
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

  // Send a message: POST to API, then append the confirmed message
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

  // Show spinner while auth initializing or redirecting
  if (!isInitialized || (!user && isInitialized)) {
    return (
      <div className="flex items-center justify-center h-full py-32">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (convLoading) {
    return (
      <div className="flex items-center justify-center h-full py-32">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (convError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-32 gap-4 text-center">
        <MessageSquare className="h-12 w-12 text-gray-600" />
        <p className="text-gray-400 font-medium">Could not load messages.</p>
        <p className="text-sm text-gray-500">Make sure the backend is running and try again.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full flex gap-0 lg:gap-6 p-0 lg:p-6 h-full overflow-hidden">
      <InboxSidebar
        contacts={contacts}
        activeId={activeId ?? ""}
        onSelect={setActiveId}
      />
      {activeContact ? (
        <ChatArea
          contact={activeContact}
          messages={liveMessages}
          myAvatar={user?.avatar_url ?? ""}
          onSend={handleSend}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
          <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
            <MessageSquare className="h-10 w-10 text-gray-500" />
          </div>
          <p className="text-white font-semibold">No messages yet</p>
          <p className="text-sm text-gray-500 max-w-xs">
            Start by contacting a property owner from a listing page.
          </p>
        </div>
      )}
    </div>
  );
}
