"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import {
  Phone,
  Video,
  MoreVertical,
  PlusCircle,
  Smile,
  ImageIcon,
  Send,
  FileText,
  Download,
} from "lucide-react";
import type { ChatMessage, InboxContact } from "@/types";

interface ChatAreaProps {
  contact: InboxContact;
  messages: ChatMessage[];
  myAvatar: string;
  onSend?: (text: string) => void;
}

export default function ChatArea({ contact, messages, myAvatar, onSend }: ChatAreaProps) {
  const [inputText, setInputText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend() {
    const text = inputText.trim();
    if (!text) return;
    onSend?.(text);
    setInputText("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="hidden lg:flex flex-1 flex-col bg-card-dark lg:rounded-3xl border border-white/5 h-full overflow-hidden relative">
      {/* Header */}
      <div className="p-5 border-b border-white/5 flex items-center justify-between bg-card-dark/50 backdrop-blur-sm z-10">
        <div className="flex items-center gap-4">
          <div className="relative">
            {contact.avatar ? (
              <Image
                src={contact.avatar}
                alt={contact.name}
                width={48}
                height={48}
                className="rounded-full object-cover border-2 border-white/10"
              />
            ) : (
              <div
                className={`w-12 h-12 rounded-full ${contact.initialsBg} flex items-center justify-center ${contact.initialsColor} font-bold text-lg`}
              >
                {contact.initials}
              </div>
            )}
            {contact.online && (
              <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-500 border-2 border-card-dark rounded-full" />
            )}
          </div>
          <div>
            <h3 className="text-white font-bold text-xl leading-tight">
              {contact.name}
            </h3>
            <p className="text-gray-400 text-xs font-medium">
              {contact.online ? "Online now" : "Offline"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all">
            <Phone className="h-5 w-5" />
          </button>
          <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all">
            <Video className="h-5 w-5" />
          </button>
          <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all">
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#0F0F0F] hide-scrollbar">
        {/* Day marker */}
        <div className="flex justify-center">
          <span className="bg-white/5 text-gray-500 text-[11px] font-bold uppercase tracking-widest py-1.5 px-4 rounded-full border border-white/5">
            Today
          </span>
        </div>

        {messages.map((msg) => {
          const isMe = msg.sender === "me";
          const avatarSrc = isMe ? myAvatar : contact.avatar;

          return (
            <div
              key={msg.id}
              className={`flex gap-4 max-w-[75%] ${
                isMe ? "ml-auto flex-row-reverse" : ""
              }`}
            >
              {/* Avatar or spacer */}
              {msg.showAvatar && avatarSrc ? (
                <Image
                  src={avatarSrc}
                  alt={isMe ? "You" : contact.name}
                  width={36}
                  height={36}
                  className="w-9 h-9 rounded-full object-cover mt-auto mb-1 border border-white/10"
                />
              ) : (
                <div className="w-9" />
              )}

              <div
                className={`flex flex-col gap-1.5 ${
                  isMe ? "items-end" : ""
                }`}
              >
                <div
                  className={
                    isMe
                      ? "bg-[#1C1C1C] border border-primary/30 p-4 rounded-2xl text-white text-sm leading-relaxed shadow-xl shadow-black/20" +
                        (msg.showAvatar ? " rounded-br-none" : "")
                      : "bg-input-dark p-4 rounded-2xl text-gray-200 text-sm leading-relaxed shadow-lg" +
                        (msg.showAvatar ? " rounded-bl-none" : msg.attachment ? " rounded-tl-none border border-white/5 p-3" : "")
                  }
                >
                  {/* Attachment */}
                  {msg.attachment && (
                    <div className="flex items-center gap-4 bg-black/40 p-3 rounded-xl border border-white/5 mb-3">
                      <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="text-sm font-bold text-white truncate">
                          {msg.attachment.name}
                        </p>
                        <p className="text-[11px] text-gray-500 font-medium">
                          {msg.attachment.size}
                        </p>
                      </div>
                      <button className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all">
                        <Download className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                  {msg.text}
                </div>
                <span
                  className={`text-[10px] text-gray-500 font-medium ${
                    isMe ? "mr-1" : "ml-1"
                  }`}
                >
                  {msg.time}
                </span>
              </div>
            </div>
          );
        })}

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-6 border-t border-white/5 bg-card-dark/80 backdrop-blur-sm z-10">
        <div className="relative flex items-end gap-3 bg-background-dark border border-white/10 rounded-2xl p-2.5 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/40 transition-all shadow-inner">
          <button className="p-2.5 text-gray-400 hover:text-primary transition-colors rounded-xl hover:bg-white/5 flex-shrink-0">
            <PlusCircle className="h-6 w-6" />
          </button>
          <textarea
            className="w-full bg-transparent border-none text-white placeholder-gray-500 focus:ring-0 resize-none max-h-32 py-2.5 text-sm"
            placeholder="Type a message..."
            rows={1}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="flex items-center gap-1.5 pb-1">
            <button className="p-2.5 text-gray-400 hover:text-white transition-colors rounded-xl hover:bg-white/5">
              <Smile className="h-6 w-6" />
            </button>
            <button className="p-2.5 text-gray-400 hover:text-white transition-colors rounded-xl hover:bg-white/5">
              <ImageIcon className="h-6 w-6" />
            </button>
            <button
              onClick={handleSend}
              disabled={!inputText.trim()}
              className="p-3 bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-lg shadow-primary/25 ml-1 flex items-center justify-center"
            >
              <Send className="h-6 w-6" />
            </button>
          </div>
        </div>
        <div className="text-center mt-3">
          <p className="text-[10px] text-gray-600 font-medium uppercase tracking-widest">
            Press Enter to send &bull; Shift + Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
