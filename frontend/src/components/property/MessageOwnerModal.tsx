"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Send, CheckCircle, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/lib/api";

const QUICK_REPLIES = [
  "Hi, I'm interested in this property",
  "When is a good time to view this property?",
  "What's the best price you can offer?",
  "Is this property still available?",
  "Can you send me more details about this listing?",
];

interface MessageOwnerModalProps {
  open: boolean;
  onClose: () => void;
  ownerId: string;
  propertyTitle: string;
}

export default function MessageOwnerModal({
  open,
  onClose,
  ownerId,
  propertyTitle,
}: MessageOwnerModalProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [selected, setSelected] = useState<string>("");
  const [custom, setCustom] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const messageText = custom.trim() || selected;

  async function handleSend() {
    if (!messageText) return;
    if (!user) {
      router.push("/login?redirect=" + encodeURIComponent(window.location.pathname));
      return;
    }

    setSending(true);
    setError("");
    try {
      await api.post<{ id: string }>("/api/messages/conversations", {
        other_user_id: ownerId,
        initial_message: messageText,
      });
      setSent(true);
    } catch {
      setError("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  }

  function handleClose() {
    setSent(false);
    setSelected("");
    setCustom("");
    setError("");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card-dark border border-white/10 rounded-2xl max-w-md w-full shadow-2xl shadow-black/60 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-white/5">
          <DialogTitle className="flex items-center gap-2 text-white font-bold text-lg">
            <MessageSquare className="h-5 w-5 text-primary" />
            Contact Owner
          </DialogTitle>
          <p className="text-sm text-gray-400 mt-1 line-clamp-1">
            Re: {propertyTitle}
          </p>
        </DialogHeader>

        {sent ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-4">
            <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-7 w-7 text-green-400" />
            </div>
            <div>
              <p className="text-white font-semibold text-lg">Message Sent!</p>
              <p className="text-gray-400 text-sm mt-1">
                The owner will reply in your Messages inbox.
              </p>
            </div>
            <button
              onClick={() => { handleClose(); router.push("/messages"); }}
              className="flex items-center gap-2 text-primary text-sm font-semibold hover:underline mt-2"
            >
              View in Messages <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                Quick Replies
              </p>
              <div className="flex flex-wrap gap-2">
                {QUICK_REPLIES.map((reply) => (
                  <button
                    key={reply}
                    onClick={() => { setSelected(reply); setCustom(""); }}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                      selected === reply && !custom
                        ? "bg-primary/20 border-primary text-primary"
                        : "bg-white/5 border-white/10 text-gray-300 hover:border-primary/40 hover:text-white"
                    }`}
                  >
                    {reply}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">
                Or write your message
              </p>
              <textarea
                value={custom}
                onChange={(e) => { setCustom(e.target.value); if (e.target.value) setSelected(""); }}
                placeholder="Type your message here..."
                rows={4}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-gray-500 resize-none focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button
                onClick={handleClose}
                className="flex-1 py-3 rounded-xl border border-white/10 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={!messageText || sending}
                className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
              >
                {sending ? "Sending..." : <><Send className="h-4 w-4" /> Send Message</>}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
