"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Sparkles, RotateCcw } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import ChatMessage, {
  TypingIndicator,
  type ChatMessageData,
} from "./ChatMessage";
import type { Citation } from "@/types";

// ── Storage key ─────────────────────────────────────────────────────────────
const STORAGE_KEY = "axiom_chat_session";

// ── Helpers ───────────────────────────────────────────────────────────────────
function loadSession(): { messages: ChatMessageData[]; sessionId: string | null } {
  if (typeof window === "undefined") return { messages: [], sessionId: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { messages: [], sessionId: null };
    const parsed = JSON.parse(raw);
    // Revive timestamp strings back to Date objects
    const messages: ChatMessageData[] = (parsed.messages ?? []).map(
      (m: Omit<ChatMessageData, "timestamp"> & { timestamp: string }) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      })
    );
    return { messages, sessionId: parsed.sessionId ?? null };
  } catch {
    return { messages: [], sessionId: null };
  }
}

function saveSession(messages: ChatMessageData[], sessionId: string | null) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, sessionId }));
}

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

const WELCOME_MESSAGE: ChatMessageData = {
  id: "welcome",
  role: "assistant",
  content:
    "مرحباً! I'm your AXIOM AI property expert. Ask me about listings, prices, neighborhoods, or anything about Egyptian real estate.",
  timestamp: new Date(0),
};

const SUGGESTION_CHIPS = [
  {
    label: "🏠 Apartments in New Cairo",
    message: "Show me apartments for rent in New Cairo",
  },
  {
    label: "💰 Under 10,000 EGP/month",
    message: "What's available for rent under 10,000 EGP per month?",
  },
  {
    label: "🏘️ Compare neighborhoods",
    message: "What are the best neighborhoods in Cairo to live in?",
  },
] as const;

// ── Component ─────────────────────────────────────────────────────────────────
interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatDrawer({ isOpen, onClose }: ChatDrawerProps) {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isLoadedRef = useRef(false);

  // Load from localStorage on first open
  useEffect(() => {
    if (isOpen && !isLoadedRef.current) {
      isLoadedRef.current = true;
      const { messages: saved } = loadSession();
      if (saved.length > 0) {
        setMessages(saved);
      } else {
        setMessages([WELCOME_MESSAGE]);
      }
    }
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Persist to localStorage whenever messages change
  useEffect(() => {
    if (isLoadedRef.current) {
      saveSession(messages, null);
    }
  }, [messages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleClear = useCallback(() => {
    setMessages([WELCOME_MESSAGE]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const sendMessage = useCallback(async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || isTyping) return;

    const userMsg: ChatMessageData = {
      id: makeId(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    setIsSearching(true);

    // Build conversation_history from recent messages (last 6)
    const recentMsgs = [...messages, userMsg]
      .filter((m) => m.id !== "welcome")
      .slice(-6);
    const conversation_history = recentMsgs.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const assistantMsgId = makeId();

    try {
      const token = useAuthStore.getState().session?.access_token;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const res = await fetch(`${API_BASE_URL}/api/ai/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({ message: text, conversation_history }),
      });

      const contentType = res.headers.get("content-type") ?? "";

      // Handle JSON fallback (ai_unavailable or error)
      if (contentType.includes("application/json")) {
        const json = await res.json();
        const content = json.ai_unavailable
          ? "AI is currently unavailable. Please try again later."
          : json.response ?? "Sorry, I couldn't generate a response.";
        setMessages((prev) => [
          ...prev,
          { id: assistantMsgId, role: "assistant", content, timestamp: new Date() },
        ]);
        return;
      }

      // SSE streaming
      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";

      // Add empty assistant message to accumulate into
      setMessages((prev) => [
        ...prev,
        { id: assistantMsgId, role: "assistant", content: "", timestamp: new Date() },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") continue;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.token) {
              setIsSearching(false);
              accumulated += parsed.token;
              const snap = accumulated;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId ? { ...m, content: snap } : m,
                ),
              );
            }
            if (parsed.citations) {
              // Map snake_case from backend to camelCase for frontend
              const mappedCitations: Citation[] = (parsed.citations as Array<{
                source_type: string;
                source_id: string;
                title: string;
                url: string;
              }>).map((c) => ({
                sourceType: c.source_type as Citation["sourceType"],
                sourceId: c.source_id,
                title: c.title,
                url: c.url,
              }));
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId ? { ...m, citations: mappedCitations } : m,
                ),
              );
            }
          } catch {
            // skip malformed chunks
          }
        }
      }
    } catch {
      setMessages((prev) => {
        // If we already added an empty assistant message, replace it
        const hasEmpty = prev.some((m) => m.id === assistantMsgId);
        const errContent = "Sorry, I'm having trouble connecting right now. Please try again in a moment.";
        if (hasEmpty) {
          return prev.map((m) =>
            m.id === assistantMsgId ? { ...m, content: errContent } : m,
          );
        }
        return [
          ...prev,
          { id: assistantMsgId, role: "assistant", content: errContent, timestamp: new Date() },
        ];
      });
    } finally {
      setIsTyping(false);
      setIsSearching(false);
    }
  }, [input, isTyping, messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop (mobile) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 sm:hidden bg-black/50"
            onClick={onClose}
          />

          {/* Drawer panel */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed bottom-[88px] right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-border bg-card"
            style={{ height: "min(560px, calc(100vh - 120px))" }}
          >
            {/* ── Header ── */}
            <div className="flex items-center gap-3 px-4 py-3.5 bg-gradient-to-r from-primary/90 to-primary border-b border-primary/20 flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white leading-none">
                  AXIOM AI
                </p>
                <p className="text-xs text-white/70 mt-0.5 leading-none">
                  {isSearching ? "Searching database..." : "Your Egyptian property expert"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleClear}
                  title="Clear chat"
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onClose}
                  title="Close"
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── Messages ── */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar min-h-0">
              {messages.map((msg) => (
                <div key={msg.id}>
                  <ChatMessage message={msg} />

                  {/* Suggestion chips — only on fresh/cleared sessions */}
                  {msg.id === "welcome" && messages.length === 1 && (
                    <div className="flex flex-wrap gap-2 ml-9 mt-2">
                      {SUGGESTION_CHIPS.map((chip) => (
                        <button
                          key={chip.label}
                          onClick={() => sendMessage(chip.message)}
                          className="inline-flex items-center px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium border border-primary/20 transition-colors"
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Citation pills (existing — keep exactly as-is) */}
                  {msg.role === "assistant" && msg.citations && msg.citations.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5 ml-2">
                      {msg.citations.slice(0, 3).map((citation) => (
                        <a
                          key={citation.sourceId}
                          href={citation.url}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-colors border border-primary/20 truncate max-w-[160px]"
                          title={citation.title}
                        >
                          <span className="truncate">{citation.title}</span>
                        </a>
                      ))}
                      {msg.citations.length > 3 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs">
                          +{msg.citations.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {isTyping && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>

            {/* ── Footer ── */}
            <div className="px-4 py-3 border-t border-border flex-shrink-0 bg-card">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about properties, prices, areas..."
                  disabled={isTyping}
                  className="flex-1 bg-secondary text-foreground text-sm rounded-full px-4 py-2.5 border border-border focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground disabled:opacity-50 transition-all"
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isTyping}
                  className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 shadow-md shadow-primary/30"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-center text-[10px] text-muted-foreground mt-2">
                Powered by Ollama · Session saved locally
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
