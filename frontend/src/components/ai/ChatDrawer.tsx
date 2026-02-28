"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Sparkles, RotateCcw } from "lucide-react";
import { api } from "@/lib/api";
import ChatMessage, {
  TypingIndicator,
  type ChatMessageData,
  type ListingRef,
} from "./ChatMessage";

// ── Storage key ─────────────────────────────────────────────────────────────
const STORAGE_KEY = "axiom_chat_session";

// ── API shapes ────────────────────────────────────────────────────────────────
interface ChatApiResponse {
  response: string;
  session_id: string;
  listing_references?: ListingRef[];
}

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

// ── Component ─────────────────────────────────────────────────────────────────
interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatDrawer({ isOpen, onClose }: ChatDrawerProps) {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isLoadedRef = useRef(false);

  // Load from localStorage on first open
  useEffect(() => {
    if (isOpen && !isLoadedRef.current) {
      isLoadedRef.current = true;
      const { messages: saved, sessionId: sid } = loadSession();
      if (saved.length > 0) {
        setMessages(saved);
      } else {
        setMessages([WELCOME_MESSAGE]);
      }
      setSessionId(sid);
    }
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Persist to localStorage whenever messages or sessionId change
  useEffect(() => {
    if (isLoadedRef.current) {
      saveSession(messages, sessionId);
    }
  }, [messages, sessionId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleClear = useCallback(() => {
    setMessages([WELCOME_MESSAGE]);
    setSessionId(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
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

    try {
      const res = await api.post<ChatApiResponse>("/api/ai/chat", {
        message: text,
        session_id: sessionId,
      });

      const assistantMsg: ChatMessageData = {
        id: makeId(),
        role: "assistant",
        content: res.response,
        listing_refs: res.listing_references,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      if (res.session_id) setSessionId(res.session_id);
    } catch {
      const errMsg: ChatMessageData = {
        id: makeId(),
        role: "assistant",
        content:
          "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsTyping(false);
    }
  }, [input, isTyping, sessionId]);

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
                  Your Egyptian property expert
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
                <ChatMessage key={msg.id} message={msg} />
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
                  onClick={sendMessage}
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
